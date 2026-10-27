import { Platform } from 'react-native';
import apiClient from '../api/client';
import { encryptValuesWithTime } from '../utils/encryption';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors SignInActionV3Dot1 in AllyDocReactApp/src/components/SignIn/SignInAction.js.
 * Pure API call only - no storage/state side effects, those live in the slice.
 * Always resolves with the global { success, message, data, statusCode } envelope
 * (see src/utils/apiResponse.js) - never throws, never returns a raw axios response.
 * @param {{email:string,password:string,userType:'patient'|'doctor',clientName:string}} args
 */
export function login({ email, password, userType, clientName }) {
  const encryptedValue = encryptValuesWithTime(
    email,
    password,
    '', // deviceToken - deliberately empty, same reasoning as the web app
    Platform.OS, // 'android' | 'ios'
    userType,
    clientName,
  );

  return callApi(() => apiClient.post('/loginV3.1', { loginData: encryptedValue }));
}

/** Mirrors runLogoutCleanup's POST /RevokeRefreshToken in the web app: best-effort,
 * and it must not trigger the refresh/expired-session flow while logging out. */
export function revokeRefreshToken(refreshToken) {
  return callApi(() =>
    apiClient.post('/RevokeRefreshToken', { refreshToken }, { skipAuthRefreshFlow: true }),
  );
}

/** Mirrors UpdateTempPasswordActions in AllyDocReactApp/src/store/actions:
 * POST /UpdatePassword with the signed-in user's email. */
export function updatePassword({ email, newPassword, confirmPassword }) {
  return callApi(() =>
    apiClient.post('/UpdatePassword', {
      email,
      newPassword,
      confirmPassword,
      isTempPassword: false,
    }),
  );
}
