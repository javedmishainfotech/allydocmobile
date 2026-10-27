import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors AllyDocReactApp/src/components/SignUp/Actions.js. Pure API calls resolving with the
 * global envelope; none run with a session, so no auth token is attached.
 */

/** POST /RegisterUserV4 - on success data is { userId, email } and an OTP is emailed. */
export function registerUser(values) {
  return callApi(() => apiClient.post('/RegisterUserV4', values, { skipAuthTokenAttach: true }));
}

/** POST /VerifyOtpV4 - confirms the registration OTP. */
export function verifyRegistrationOtp({ userId, otpNumber }) {
  return callApi(() =>
    apiClient.post(
      '/VerifyOtpV4',
      { id: userId, otpNumber, isUsed: true, createdAt: new Date() },
      { skipAuthTokenAttach: true },
    ),
  );
}
