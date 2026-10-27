import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

// Ports of createProfileAction / UpdateProfileAction in AllyDocReactApp/src/store/actions/createProfileAction.js.
// Both send multipart form data (the profile photo is a file part).

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 };

/** First-visit "Create Profile" (`POST /CreateProfileV4`). */
export function createPatientProfile(formData) {
  return callApi(() => apiClient.post('/CreateProfileV4', formData, MULTIPART));
}

/** "Edit Profile" (`PUT /UpdateProfile`). */
export function updatePatientProfile(formData) {
  return callApi(() => apiClient.put('/UpdateProfile', formData, MULTIPART));
}
