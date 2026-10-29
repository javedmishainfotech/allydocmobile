import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetNurseData in AllyDocReactApp/src/store/actions/GetNurseData.js. */
export function getNurseDashboard(nurseId) {
  return callApi(() => apiClient.get(`/NurseDashboard?NurseId=${nurseId}`));
}

/** Mirrors AddUserAction - adds a Doctor (roleId 8) or Patient (roleId 9) from the
 * Nurse dashboard's "Add Doctor"/"Add Patient" buttons. */
export function addUser(values) {
  return callApi(() => apiClient.post('/AddUser', values));
}
