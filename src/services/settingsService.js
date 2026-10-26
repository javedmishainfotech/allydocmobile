import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetUserDetailsAction in AllyDocReactApp/src/store/actions. */
export function getUserDetails(userId) {
  return callApi(() => apiClient.get(`/UserDetails?userid=${userId}`));
}

/** Mirrors ChangePasswordActions. */
export function changePassword({ currentPassword, newPassword, confirmPassword }) {
  return callApi(() => apiClient.post('/ChangePassword', { currentPassword, newPassword, confirmPassword }));
}

/** Mirrors GetCertificates in AllyDocReactApp/.../Settings/action.js. */
export function getCertificates(doctorId) {
  return callApi(() => apiClient.get(`/GetCertificates?doctorId=${doctorId}`));
}

/** Mirrors addCertificates - multipart form with CertificateName, UserId, Certificate (file). */
export function addCertificate({ certificateName, userId, file }) {
  const formData = new FormData();
  formData.append('CertificateName', certificateName);
  formData.append('UserId', String(userId));
  formData.append('Certificate', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  });
  return callApi(() =>
    apiClient.post('/SaveCertificates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

/** Mirrors RemoveCertificate - DELETE with a query param, not a path param. */
export function removeCertificate(documentId) {
  return callApi(() => apiClient.delete(`/RemoveCertificate?documentId=${documentId}`));
}

/** Mirrors resetPinAction in AllyDocReactApp/src/components/IdentityProofing/Actions.js. */
export function resetPin() {
  return callApi(() => apiClient.post('/api/Clinicians/ResetPin'));
}

/** Mirrors setPinAction. */
export function setPin(pin) {
  return callApi(() => apiClient.post('/api/Clinicians/SetPin', { pin }));
}

/** Mirrors updateDoseSpotStatusAction. */
export function updateDoseSpotStatus({ userId, processName, text, stepCount }) {
  const payload = { userId, processName };
  if (text !== undefined) payload.text = text;
  if (stepCount !== undefined) payload.stepCount = stepCount;
  return callApi(() => apiClient.post('/updateDoseSpotStatus', payload));
}

/** Mirrors sendTfaDeactivationRequestEmailAction. */
export function requestTfaDeactivation() {
  return callApi(() => apiClient.post('/api/Clinicians/RequestTfaDeactivation'));
}

/** Mirrors tfaDeactivateAction. */
export function tfaDeactivate({ oneTimePassword, pin, credentialId }) {
  const payload = { OneTimePassword: oneTimePassword, PIN: pin };
  if (credentialId) payload.CredentialID = credentialId;
  return callApi(() => apiClient.post('/api/Clinicians/TfaDeactivate', payload));
}
