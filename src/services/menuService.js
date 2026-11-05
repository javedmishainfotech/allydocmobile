import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetMenuAction in AllyDocReactApp/src/store/actions/GetMenuAction.js.
 * Returns an array of { path, title, icon } - `icon` is a web image URL and
 * isn't used on mobile (see doctorMenuItems.jsx's local icon mapping instead). */
export async function getAllMenus(userId) {
  try {
    const response = await apiClient.get(`/AllMenus?userId=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
