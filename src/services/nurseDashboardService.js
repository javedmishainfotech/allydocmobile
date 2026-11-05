import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetNurseData in AllyDocReactApp/src/store/actions/GetNurseData.js. */
export async function getNurseDashboard(nurseId) {
  try {
    const response = await apiClient.get(`/NurseDashboard?NurseId=${nurseId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddUserAction - adds a Doctor (roleId 8) or Patient (roleId 9) from the
 * Nurse dashboard's "Add Doctor"/"Add Patient" buttons. */
export async function addUser(values) {
  try {
    const response = await apiClient.post('/AddUser', values);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
