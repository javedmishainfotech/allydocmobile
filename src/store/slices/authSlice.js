import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as authService from '../../services/authService';
import { getItem, setItem, clearAll } from '../../utils/storage';
import { validateSession } from '../../utils/roleAccess';
import {
  getTokenExpiryMs,
  refreshAccessToken,
  scheduleProactiveRefresh,
  stopProactiveRefresh,
} from '../../api/client';
import { setAuthLogoutInProgress } from '../../services/authSessionState';

const initialState = {
  status: 'idle', // idle | bootstrapping | loading | succeeded | failed
  isAuthenticated: false,
  isTempPassword: false,
  accountDisabledMessage: null,
  error: null,
  profile: null,
  orgName: null,
};

/**
 * Calls the auth service, then persists every returned user field the same
 * way the web app's SignInActionV3Dot1 does (minus the orgName-overwrite
 * guard, since orgName here only ever comes from the login form).
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, userType, clientName }, { rejectWithValue }) => {
    // authService.login() always resolves with the global
    // { success, message, data, statusCode } envelope -
    // never throws, so there's no try/catch needed here. Every thunk in the
    // app reads this same shape, whether the failure was the backend saying
    // "wrong password" or the request never reaching the server at all.
    const result = await authService.login({ email, password, userType, clientName });

    if (!result.success) {
      return rejectWithValue({
        message: result.message || 'Invalid email or password',
        statuscode: result.statusCode,
      });
    }

    const userData = result.data || {};

    // Role gate (web: ProtectedRoutes allow-list + OrgRouteHandler) - checked BEFORE anything
    // is persisted, so a role this app has no shell for never gets a stored session.
    const access = validateSession({
      roleName: userData.roleName,
      userType: userData.userType,
      orgName: clientName,
      loginTab: userType,
    });
    if (!access.ok) {
      return rejectWithValue({ message: access.message });
    }

    setAuthLogoutInProgress(false);
    if (clientName) {
      await setItem('orgName', clientName);
    }
    for (const [key, value] of Object.entries(userData)) {
      if (key === 'orgName' || value == null) continue;
      await setItem(key, String(value));
    }
    await setItem('auth_token', result.raw.auth_token);
    if (userData.refreshToken) await setItem('refreshToken', userData.refreshToken);
    if (userData.refreshTokenExpiresAt) {
      await setItem('refreshTokenExpiresAt', userData.refreshTokenExpiresAt);
    }
    await setItem('resetPinModalDismissedForSession', '0');
    scheduleProactiveRefresh();

    const profile = {
      userId: userData.userId,
      fullName: userData.fullName?.trim?.() ?? userData.fullName,
      firstName: userData.firstName?.trim?.() ?? userData.firstName,
      lastName: userData.lastName?.trim?.() ?? userData.lastName,
      middleName: userData.middleName?.trim?.() ?? userData.MiddleName,
      profileImage: userData.profileImage,
      email: userData.email,
      phoneNo: userData.phoneNo,
      countryCode: userData.countryCode,
      userType: userData.userType,
      roleName: userData.roleName,
      doseSpotRefrenceId: userData.doseSpotRefrenceId ?? null,
      idpStatus: userData.idpStatus ?? null,
      clinicDoseSpotId: userData.clinicDoseSpotId ?? null,
    };

    return {
      profile,
      orgName: clientName,
      isTempPassword: Boolean(userData.isTempPassword),
      message: result.message, // real backend success message, shown by the page via toast
    };
  },
);

/** Runs on app start: if a token + role are already persisted, restore the
 * session without forcing the user to log in again (mirrors SignInNew.jsx's
 * `if (localStorage.getItem('auth_token')) { ... }` short-circuit). */
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const token = await getItem('auth_token');
  if (!token) return null;

  // A persisted access token may have expired while the app was closed: renew it from the
  // refresh token now, otherwise the first screen's request would 401 straight away.
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs && expiryMs <= Date.now()) {
    let renewed = null;
    try {
      renewed = await refreshAccessToken();
    } catch {
      // refresh rejected - treated like "no session" below
    }
    if (!renewed) {
      const preferredTab = await getItem('preferredLoginTab');
      await clearAll(preferredTab ? ['preferredLoginTab'] : []);
      return null;
    }
  } else {
    scheduleProactiveRefresh();
  }

  const [roleName, orgName, isTempPassword, userId, fullName, userType] = await Promise.all([
    getItem('roleName'),
    getItem('orgName'),
    getItem('isTempPassword'),
    getItem('userId'),
    getItem('fullName'),
    getItem('userType'),
  ]);

  // Same role/org gate as login: never restore a session the app has no shell for.
  if (!validateSession({ roleName, userType, orgName }).ok) {
    stopProactiveRefresh();
    const preferredTab = await getItem('preferredLoginTab');
    await clearAll(preferredTab ? ['preferredLoginTab'] : []);
    return null;
  }

  return {
    profile: {
      roleName: roleName || undefined,
      userId: userId || undefined,
      fullName: fullName || undefined,
      userType: userType || undefined,
    },
    orgName,
    isTempPassword: isTempPassword === 'true',
  };
});

export const updateTempPassword = createAsyncThunk(
  'auth/updateTempPassword',
  async ({ newPassword, confirmPassword }, { rejectWithValue }) => {
    const email = await getItem('email');
    const result = await authService.updatePassword({ email, newPassword, confirmPassword });

    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to update password.');
    }
    await setItem('isTempPassword', 'false');
    return { message: result.message };
  },
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  // Mirrors the web's runLogoutCleanup(): revoke the refresh token server-side (best-effort,
  // capped so a bad connection can't trap the user on a "logging out" state), then wipe local
  // session state. FCM token deregistration and activity-log flush are still to be added once
  // push notifications/activity logging land. Only the login-tab preference survives the wipe.
  setAuthLogoutInProgress(true);
  try {
    stopProactiveRefresh();
    const refreshToken = await getItem('refreshToken');
    if (refreshToken) {
      await Promise.race([
        authService.revokeRefreshToken(refreshToken),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    const preferredTab = await getItem('preferredLoginTab');
    await clearAll(preferredTab ? ['preferredLoginTab'] : []);
  } finally {
    setAuthLogoutInProgress(false);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    dismissAccountDisabledMessage(state) {
      state.accountDisabledMessage = null;
    },
    // Merges profile fields the user just saved (web: ProfileContext.updateProfile).
    profileUpdated(state, action) {
      state.profile = { ...(state.profile || {}), ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'bootstrapping';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.status = 'idle';
        if (action.payload) {
          state.isAuthenticated = true;
          state.profile = action.payload.profile;
          state.orgName = action.payload.orgName;
          state.isTempPassword = action.payload.isTempPassword;
        }
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.accountDisabledMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isAuthenticated = true;
        state.profile = action.payload.profile;
        state.orgName = action.payload.orgName;
        state.isTempPassword = action.payload.isTempPassword;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        const payload = action.payload;
        if (payload?.statuscode === 403) {
          state.accountDisabledMessage =
            payload.message || 'Your account has been disabled by the Admin.';
        } else {
          state.error = payload?.message || 'Invalid email or password';
        }
      })
      .addCase(updateTempPassword.fulfilled, (state) => {
        state.isTempPassword = false;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export const { dismissAccountDisabledMessage, profileUpdated } = authSlice.actions;
export default authSlice.reducer;
