import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

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
  let result;
  try {
    const response = await apiClient.get('/AllNotification');
    result = normalizeApiBody(response.data, true);
  } catch (err) {
    result = err.response ? normalizeApiBody(err.response.data, false) : normalizeApiError(err);
  }
  return normalizeList(result);
}

export async function getUnreadNotifications() {
  let result;
  try {
    const response = await apiClient.get('/UnReadNotification');
    result = normalizeApiBody(response.data, true);
  } catch (err) {
    result = err.response ? normalizeApiBody(err.response.data, false) : normalizeApiError(err);
  }
  return normalizeList(result);
}

/** source: 'local' | 'dosespot' - which upstream system the row came from. */
export async function markNotificationAsRead(notificationId, source = 'local') {
  try {
    const response = await apiClient.post(`/UpdateNotificationStatus?id=${notificationId}&source=${encodeURIComponent(source)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
