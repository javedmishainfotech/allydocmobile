import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * Mirrors AllyDocReactApp/src/components/ForgotPassword/Actions.js. Pure API calls, all
 * resolving with the global { success, message, data, statusCode, raw } envelope.
 * None of these run with a session, so no auth token is attached except where noted.
 */

/** POST /ForgotPassword - emails an OTP. data: { id, userEmail }. */
export async function sendResetCode(email) {
  try {
    const response = await apiClient.post('/ForgotPassword', { email }, { skipAuthTokenAttach: true });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** POST /ResendOtp */
export async function resendResetCode(email) {
  try {
    const response = await apiClient.post('/ResendOtp', { email }, { skipAuthTokenAttach: true });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** POST /VerifyOtpForgotpassword - the reset token comes back as raw.auth_token. */
export async function verifyResetCode({ id, otpNumber }) {
  try {
    const response = await apiClient.post('/VerifyOtpForgotpassword', { id, otpNumber }, { skipAuthTokenAttach: true });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** POST /ResetPassword - authorised with the reset token from verifyResetCode, sent as the
 * bare token (no "Bearer " prefix), exactly as the web app does. */
export async function resetPassword({ email, password, confirmPassword, resetToken }) {
  try {
    const response = await apiClient.post(
      '/ResetPassword',
      { email, password, confirmPassword },
      { skipAuthTokenAttach: true, headers: { Authorization: resetToken } },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
