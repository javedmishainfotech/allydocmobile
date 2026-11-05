import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

// Ports of createProfileAction / UpdateProfileAction in AllyDocReactApp/src/store/actions/createProfileAction.js.
// Both send multipart form data (the profile photo is a file part).

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 };

/** First-visit "Create Profile" (`POST /CreateProfileV4`). */
export async function createPatientProfile(formData) {
  try {
    const response = await apiClient.post('/CreateProfileV4', formData, MULTIPART);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** "Edit Profile" (`PUT /UpdateProfile`). */
export async function updatePatientProfile(formData) {
  try {
    const response = await apiClient.put('/UpdateProfile', formData, MULTIPART);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// Same two endpoints, used by the Doctor/Nurse "Create Profile" first-visit form - aliased under
// their own names at the call site for readability, not a different implementation.
export const createDoctorProfile = createPatientProfile;
export const updateDoctorProfile = updatePatientProfile;
