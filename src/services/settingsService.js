import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetUserDetailsAction in AllyDocReactApp/src/store/actions. */
export async function getUserDetails(userId) {
  try {
    const response = await apiClient.get(`/UserDetails?userid=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetAssignedDiseasesAction/AssignDiseasesAction in
 * AllyDocReactApp/.../Settings/action.js (Clinic Admin "Assign Disease" tab). */
export async function getAssignedDiseases(clinicCode) {
  try {
    const response = await apiClient.get(`/GetAssignedDiseases?code=${encodeURIComponent(clinicCode)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function assignDiseases({ code, diseaseIds }) {
  try {
    const response = await apiClient.post('/AssignDiseases', { code, diseaseIds });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SearchPatientsAction in AllyDocReactApp/.../Patients/action.js (Clinic Admin's
 * "Merge Patient" search). */
export async function searchPatients(params) {
  try {
    const response = await apiClient.get('/api/Patients/SearchPatients', { params: { pageNumber: 1, ...params } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors MergePatientsAction - transfers all medications from fromPatientId to toPatientId. */
export async function mergePatients({ fromPatientId, toPatientId }) {
  const body = new URLSearchParams();
  body.append('fromPatientId', String(fromPatientId ?? ''));
  body.append('toPatientId', String(toPatientId ?? ''));
  try {
    const response = await apiClient.post('/api/Patients/MergePatients', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- Clinic Available Hours (Settings → MyAvailableHours.jsx) ----
export async function getDailyAvailableHours(doctorId) {
  try {
    const response = await apiClient.get(`/DailyAvailableHours?Doctorid=${doctorId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getDuration(userId) {
  try {
    const response = await apiClient.get(`/Duration?UserId=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getDoctorTimeZone(userId) {
  try {
    const response = await apiClient.get(`/DoctorTimeZone?userId=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getTimeZones() {
  try {
    const response = await apiClient.get('/TimeZones');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function saveWeeklySchedule(values) {
  try {
    const response = await apiClient.post('/SaveWeeklySchedule', values);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors ChangePasswordActions. */
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  try {
    const response = await apiClient.post('/ChangePassword', { currentPassword, newPassword, confirmPassword });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetCertificates in AllyDocReactApp/.../Settings/action.js. */
export async function getCertificates(doctorId) {
  try {
    const response = await apiClient.get(`/GetCertificates?doctorId=${doctorId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors addCertificates - multipart form with CertificateName, UserId, Certificate (file). */
export async function addCertificate({ certificateName, userId, file }) {
  const formData = new FormData();
  formData.append('CertificateName', certificateName);
  formData.append('UserId', String(userId));
  formData.append('Certificate', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  });
  try {
    const response = await apiClient.post('/SaveCertificates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors RemoveCertificate - DELETE with a query param, not a path param. */
export async function removeCertificate(documentId) {
  try {
    const response = await apiClient.delete(`/RemoveCertificate?documentId=${documentId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors resetPinAction in AllyDocReactApp/src/components/IdentityProofing/Actions.js. */
export async function resetPin() {
  try {
    const response = await apiClient.post('/api/Clinicians/ResetPin');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors setPinAction. */
export async function setPin(pin) {
  try {
    const response = await apiClient.post('/api/Clinicians/SetPin', { pin });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors updateDoseSpotStatusAction. */
export async function updateDoseSpotStatus({ userId, processName, text, stepCount }) {
  const payload = { userId, processName };
  if (text !== undefined) payload.text = text;
  if (stepCount !== undefined) payload.stepCount = stepCount;
  try {
    const response = await apiClient.post('/updateDoseSpotStatus', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors sendTfaDeactivationRequestEmailAction. */
export async function requestTfaDeactivation() {
  try {
    const response = await apiClient.post('/api/Clinicians/RequestTfaDeactivation');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors tfaDeactivateAction. */
export async function tfaDeactivate({ oneTimePassword, pin, credentialId }) {
  const payload = { OneTimePassword: oneTimePassword, PIN: pin };
  if (credentialId) payload.CredentialID = credentialId;
  try {
    const response = await apiClient.post('/api/Clinicians/TfaDeactivate', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
