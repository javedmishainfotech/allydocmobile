import { Platform } from 'react-native';
import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
import { encryptValuesWithTime } from '../utils/encryption';

/**
 * Mirrors SignInActionV3Dot1 in AllyDocReactApp/src/components/SignIn/SignInAction.js.
 * Pure API call only - no storage/state side effects, those live in the slice.
 * Always resolves with the global { success, message, data, statusCode } envelope
 * - never throws, never returns a raw axios response.
 * @param {{email:string,password:string,userType:'patient'|'doctor',clientName:string}} args
 */
export async function login({ email, password, userType, clientName }) {
  const encryptedValue = encryptValuesWithTime(
    email,
    password,
    '', // deviceToken - deliberately empty, same reasoning as the web app
    Platform.OS, // 'android' | 'ios'
    userType,
    clientName,
  );

  try {
    const response = await apiClient.post('/loginV3.1', { loginData: encryptedValue });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors runLogoutCleanup's POST /RevokeRefreshToken in the web app: best-effort,
 * and it must not trigger the refresh/expired-session flow while logging out. */
export async function revokeRefreshToken(refreshToken) {
  try {
    const response = await apiClient.post(
      '/RevokeRefreshToken',
      { refreshToken },
      { skipAuthRefreshFlow: true },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors UpdateTempPasswordActions in AllyDocReactApp/src/store/actions:
 * POST /UpdatePassword with the signed-in user's email. */
export async function updatePassword({ email, newPassword, confirmPassword }) {
  try {
    const response = await apiClient.post('/UpdatePassword', {
      email,
      newPassword,
      confirmPassword,
      isTempPassword: false,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
