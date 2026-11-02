import { Platform } from 'react-native';
import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors AllyDocReactApp/src/services/fcmRegister.js's registerFcmTokenWithBackend /
 * unregisterFcmTokenWithBackend - same two endpoints, `source: 'android' | 'ios'` instead of
 * `'web'` (the backend's RegisterFcmTokenRequest already documents android/ios as valid
 * sources). This one codebase ships to both platforms, so `source` must reflect the device
 * it's actually running on rather than being hardcoded to one.
 */
const SOURCE = Platform.OS === 'ios' ? 'ios' : 'android';

export function registerFcmToken(deviceToken) {
  return callApi(() => apiClient.post('/RegisterFcmToken', { deviceToken, source: SOURCE }));
}

export function unregisterFcmToken(deviceToken) {
  return callApi(() => apiClient.post('/UnregisterFcmToken', { deviceToken, source: SOURCE }));
}
