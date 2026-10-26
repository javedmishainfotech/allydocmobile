import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Identity Proofing (IDP) + Two-Factor Authentication endpoints. Each function
 * mirrors an action in AllyDocReactAppLatest:
 *   components/IdentityProofing/Actions.js
 *   store/actions/IdentityProofingDisclaimerActions.js
 *   store/actions/GetLegalAgreementAction.js / AcceptLegalAgreementAction.js
 *   store/actions/createProfileAction.js (states / cities)
 * Status syncing (updateDoseSpotStatus), SetPin and ResetPin are reused from
 * settingsService.js.
 */

/** Mirrors createIDPAction. Callers read `raw` (Questions / Answers / SessionID / IDCapture / result). */
export function createIdp(payload) {
  return callApi(() => apiClient.post('api/Clinicians/CreateIdp', payload));
}

/** Mirrors submitIDPAnswersAction. */
export function submitIdpAnswers(payload) {
  return callApi(() => apiClient.post('api/Clinicians/SubmitClinicianIdpAnswers', payload));
}

/** Mirrors getRegistrationStatusAction. The status is `raw.item`. */
export function getRegistrationStatus(clinicianId) {
  return callApi(() =>
    apiClient.get(`/api/Clinicians/registrationStatus?clinicianId=${encodeURIComponent(clinicianId)}`),
  );
}

/** Mirrors GetLegalAgreementAction. */
export function getLegalAgreement(clinicianId) {
  return callApi(() =>
    apiClient.get(`api/Clinicians/GetLegalAggrement?clinicianId=${encodeURIComponent(clinicianId)}`),
  );
}

/** Mirrors AcceptLegalAgreementAction. */
export function acceptLegalAgreement({ agreementId, nameSigned }) {
  return callApi(() => apiClient.post('api/Clinicians/AcceptAgreement', { agreementId, nameSigned }));
}

/** Mirrors GetIdentityProofingDisclaimerAction. */
export function getIdpDisclaimer() {
  return callApi(() => apiClient.get('api/Clinicians/idpDisclaimer'));
}

/** Mirrors AcceptIdentityProofingDisclaimerAction. */
export function acceptIdpDisclaimer(payload) {
  return callApi(() => apiClient.post('api/Clinicians/acceptDisclaimer', payload));
}

/** Mirrors fetchStatesAction. */
export function getStates() {
  return callApi(() => apiClient.get('/api/Location/GetStates'));
}

/** Mirrors fetchCitiesAction. */
export function getCitiesByStateId(stateId) {
  return callApi(() => apiClient.get(`/api/Location/GetCitiesByStateId?stateId=${encodeURIComponent(stateId)}`));
}

/** Mirrors sendMobileTfaAction. */
export function sendMobileTfa({ mobilePhoneNumber }) {
  return callApi(() => apiClient.post('/api/Clinicians/SendMobileTfa', { mobilePhoneNumber }));
}

/** Mirrors tfaActivateAction. */
export function tfaActivate({ oneTimePassword, pin }) {
  return callApi(() => apiClient.post('/api/Clinicians/TfaActivate', { oneTimePassword, pin }));
}

/** Mirrors updatePinAction (PUT ChangePin). */
export function updatePin({ newPIN, currentPIN }) {
  return callApi(() => apiClient.put('api/Clinicians/ChangePin', { newPIN, currentPIN }));
}

/** Mirrors sendTfaInitiationRequestEmailAction - JWT only, no body. */
export function requestTfaActivation() {
  return callApi(() => apiClient.post('/api/Clinicians/RequestTfaActivation'));
}
