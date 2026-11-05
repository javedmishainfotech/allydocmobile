import { Platform } from 'react-native';
import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * Mirrors AllyDocReactApp/src/services/fcmRegister.js's registerFcmTokenWithBackend /
 * unregisterFcmTokenWithBackend - same two endpoints, `source: 'android' | 'ios'` instead of
 * `'web'` (the backend's RegisterFcmTokenRequest already documents android/ios as valid
 * sources). This one codebase ships to both platforms, so `source` must reflect the device
 * it's actually running on rather than being hardcoded to one.
 */
const SOURCE = Platform.OS === 'ios' ? 'ios' : 'android';

export async function registerFcmToken(deviceToken) {
  try {
    const response = await apiClient.post('/RegisterFcmToken', { deviceToken, source: SOURCE });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function unregisterFcmToken(deviceToken) {
  try {
    const response = await apiClient.post('/UnregisterFcmToken', { deviceToken, source: SOURCE });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
