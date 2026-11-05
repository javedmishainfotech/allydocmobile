import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

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
export async function createIdp(payload) {
  try {
    const response = await apiClient.post('api/Clinicians/CreateIdp', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors submitIDPAnswersAction. */
export async function submitIdpAnswers(payload) {
  try {
    const response = await apiClient.post('api/Clinicians/SubmitClinicianIdpAnswers', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors getRegistrationStatusAction. The status is `raw.item`. */
export async function getRegistrationStatus(clinicianId) {
  try {
    const response = await apiClient.get(`/api/Clinicians/registrationStatus?clinicianId=${encodeURIComponent(clinicianId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetLegalAgreementAction. */
export async function getLegalAgreement(clinicianId) {
  try {
    const response = await apiClient.get(`api/Clinicians/GetLegalAggrement?clinicianId=${encodeURIComponent(clinicianId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AcceptLegalAgreementAction. */
export async function acceptLegalAgreement({ agreementId, nameSigned }) {
  try {
    const response = await apiClient.post('api/Clinicians/AcceptAgreement', { agreementId, nameSigned });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetIdentityProofingDisclaimerAction. */
export async function getIdpDisclaimer() {
  try {
    const response = await apiClient.get('api/Clinicians/idpDisclaimer');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AcceptIdentityProofingDisclaimerAction. */
export async function acceptIdpDisclaimer(payload) {
  try {
    const response = await apiClient.post('api/Clinicians/acceptDisclaimer', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors fetchStatesAction. */
export async function getStates() {
  try {
    const response = await apiClient.get('/api/Location/GetStates');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors fetchCitiesAction. */
export async function getCitiesByStateId(stateId) {
  try {
    const response = await apiClient.get(`/api/Location/GetCitiesByStateId?stateId=${encodeURIComponent(stateId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors sendMobileTfaAction. */
export async function sendMobileTfa({ mobilePhoneNumber }) {
  try {
    const response = await apiClient.post('/api/Clinicians/SendMobileTfa', { mobilePhoneNumber });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors tfaActivateAction. */
export async function tfaActivate({ oneTimePassword, pin }) {
  try {
    const response = await apiClient.post('/api/Clinicians/TfaActivate', { oneTimePassword, pin });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors updatePinAction (PUT ChangePin). */
export async function updatePin({ newPIN, currentPIN }) {
  try {
    const response = await apiClient.put('api/Clinicians/ChangePin', { newPIN, currentPIN });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors sendTfaInitiationRequestEmailAction - JWT only, no body. */
export async function requestTfaActivation() {
  try {
    const response = await apiClient.post('/api/Clinicians/RequestTfaActivation');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
