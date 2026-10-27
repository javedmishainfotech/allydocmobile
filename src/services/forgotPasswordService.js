import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors AllyDocReactApp/src/components/ForgotPassword/Actions.js. Pure API calls, all
 * resolving with the global { success, message, data, statusCode, raw } envelope.
 * None of these run with a session, so no auth token is attached except where noted.
 */

/** POST /ForgotPassword - emails an OTP. data: { id, userEmail }. */
export function sendResetCode(email) {
  return callApi(() =>
    apiClient.post('/ForgotPassword', { email }, { skipAuthTokenAttach: true }),
  );
}

/** POST /ResendOtp */
export function resendResetCode(email) {
  return callApi(() =>
    apiClient.post('/ResendOtp', { email }, { skipAuthTokenAttach: true }),
  );
}

/** POST /VerifyOtpForgotpassword - the reset token comes back as raw.auth_token. */
export function verifyResetCode({ id, otpNumber }) {
  return callApi(() =>
    apiClient.post('/VerifyOtpForgotpassword', { id, otpNumber }, { skipAuthTokenAttach: true }),
  );
}

/** POST /ResetPassword - authorised with the reset token from verifyResetCode, sent as the
 * bare token (no "Bearer " prefix), exactly as the web app does. */
export function resetPassword({ email, password, confirmPassword, resetToken }) {
  return callApi(() =>
    apiClient.post(
      '/ResetPassword',
      { email, password, confirmPassword },
      { skipAuthTokenAttach: true, headers: { Authorization: resetToken } },
    ),
  );
}
