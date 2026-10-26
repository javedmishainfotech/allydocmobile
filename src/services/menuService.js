import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetMenuAction in AllyDocReactApp/src/store/actions/GetMenuAction.js.
 * Returns an array of { path, title, icon } - `icon` is a web image URL and
 * isn't used on mobile (see doctorMenuItems.jsx's local icon mapping instead). */
export function getAllMenus(userId) {
  return callApi(() => apiClient.get(`/AllMenus?userId=${userId}`));
}
