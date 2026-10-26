import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as authService from '../../services/authService';
import { getItem, setItem, clearAll } from '../../utils/storage';

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
    // { success, message, data, statusCode } envelope (src/utils/apiResponse.js) -
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

  const [roleName, orgName, isTempPassword, userId, fullName, userType] = await Promise.all([
    getItem('roleName'),
    getItem('orgName'),
    getItem('isTempPassword'),
    getItem('userId'),
    getItem('fullName'),
    getItem('userType'),
  ]);

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
  // Deliberately minimal for this first pass: clears local session state.
  // The web app's full runLogoutCleanup() (FCM token deregistration, refresh
  // token revocation, activity-log flush) is cross-cutting infra best added
  // once push notifications/activity logging land in later modules.
  // Only the login-tab preference survives the wipe.
  const preferredTab = await getItem('preferredLoginTab');
  await clearAll(preferredTab ? ['preferredLoginTab'] : []);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    dismissAccountDisabledMessage(state) {
      state.accountDisabledMessage = null;
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

export const { dismissAccountDisabledMessage } = authSlice.actions;
export default authSlice.reducer;
