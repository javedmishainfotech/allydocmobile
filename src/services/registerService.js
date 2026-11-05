import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * Mirrors AllyDocReactApp/src/components/SignUp/Actions.js. Pure API calls resolving with the
 * global envelope; none run with a session, so no auth token is attached.
 */

/** POST /RegisterUserV4 - on success data is { userId, email } and an OTP is emailed. */
export async function registerUser(values) {
  try {
    const response = await apiClient.post('/RegisterUserV4', values, { skipAuthTokenAttach: true });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** POST /VerifyOtpV4 - confirms the registration OTP. */
export async function verifyRegistrationOtp({ userId, otpNumber }) {
  try {
    const response = await apiClient.post(
      '/VerifyOtpV4',
      { id: userId, otpNumber, isUsed: true, createdAt: new Date() },
      { skipAuthTokenAttach: true },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
