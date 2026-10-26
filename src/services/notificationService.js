import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors AllyDocReactApp's src/store/actions/GetUnreadNotificationAction.js -
 * same three endpoints, same response shape:
 *   { status, message, data: { totalNotification, data: [...] } }
 * Every row looks like { id, message, time, isRead, notificationSource?, ... }.
 */

const EMPTY = { total: 0, items: [] };

function normalizeList(result) {
  if (!result.success) return { ...EMPTY, message: result.message };
  return {
    total: result.data?.totalNotification || 0,
    items: Array.isArray(result.data?.data) ? result.data.data : [],
    message: null,
  };
}

export async function getAllNotifications() {
  return normalizeList(await callApi(() => apiClient.get('/AllNotification')));
}

export async function getUnreadNotifications() {
  return normalizeList(await callApi(() => apiClient.get('/UnReadNotification')));
}

/** source: 'local' | 'dosespot' - which upstream system the row came from. */
export function markNotificationAsRead(notificationId, source = 'local') {
  return callApi(() =>
    apiClient.post(`/UpdateNotificationStatus?id=${notificationId}&source=${encodeURIComponent(source)}`),
  );
}
