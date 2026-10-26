import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * DoseSpot-integrated clinical tabs on the Patient Detail page (Coverage,
 * Medication History, Self Reported Medications, Allergies, RxChange and
 * Refill Requests). All endpoints here are keyed by the patient's DoseSpot
 * id (`doseSpotPatientId` / `doseSpotRefrenceId`), not the internal AllyDoc
 * userId - mirrors AllyDocReactApp/src/module/Doctor/Pages/Patients/action.js
 * and selfReportedMedicationAction.js exactly.
 */

// ---- Coverage / Eligibilities (read-only on web too) ----
export function getPatientEligibilities(doseSpotPatientId) {
  return callApi(() => apiClient.get(`/api/Eligibilities/${doseSpotPatientId}/eligibilities`));
}

// ---- Medication History ----
export function consentToMedicationHistory(doseSpotPatientId) {
  return callApi(() =>
    apiClient.post(`/api/Medications/patients/${doseSpotPatientId}/medications/history/consent`),
  );
}

export function getMedicationHistory(doseSpotPatientId, pageNumber = 1) {
  return callApi(() =>
    apiClient.get(`/api/Medications/patients/${doseSpotPatientId}/medications/history`, {
      params: { pageNumber },
    }),
  );
}

// ---- Self Reported Medications ----
export function getSelfReportedMedications(doseSpotPatientId, pageNumber = 1) {
  return callApi(() =>
    apiClient.get(`/api/patients/${doseSpotPatientId}/selfReportedMedications`, {
      params: { pagenumber: pageNumber },
    }),
  );
}

export function getSelfReportedMedicationById(doseSpotPatientId, selfReportedMedicationId) {
  return callApi(() =>
    apiClient.get(`/api/patients/${doseSpotPatientId}/selfReportedMedications/${selfReportedMedicationId}`),
  );
}

export function searchMedications(name, pageNumber = 1) {
  return callApi(() =>
    apiClient.get('/api/Medications/MedicationSearch', { params: { name, pageNumber } }),
  );
}

export function selectMedication(dispensableDrugId) {
  return callApi(() => apiClient.get('/api/Medications/SelectMedication', { params: { dispensableDrugId } }));
}

function buildFormData(fields) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
  });
  return formData;
}

export function addCodedSelfReportedMedication(doseSpotPatientId, fields) {
  return callApi(() =>
    apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/coded`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function addFreetextSelfReportedMedication(doseSpotPatientId, fields) {
  return callApi(() =>
    apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/freetext`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function addSimpleSelfReportedMedication(doseSpotPatientId, fields) {
  return callApi(() =>
    apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/simple`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function editCodedSelfReportedMedication(doseSpotPatientId, id, fields) {
  return callApi(() =>
    apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/coded/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function editFreetextSelfReportedMedication(doseSpotPatientId, id, fields) {
  return callApi(() =>
    apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/freetext/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function editSimpleSelfReportedMedication(doseSpotPatientId, id, fields) {
  return callApi(() =>
    apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/simple/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

export function updateSelfReportedMedicationStatus(doseSpotPatientId, id, fields) {
  return callApi(() =>
    apiClient.post(
      `/api/patients/${doseSpotPatientId}/selfReportedMedications/${id}/status`,
      buildFormData(fields),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  );
}

// ---- Allergies ----
export function getPatientAllergies(doseSpotPatientId) {
  return callApi(() => apiClient.get(`/api/Allergies/${doseSpotPatientId}/allergies`));
}

export function searchAllergens(name, pageNumber = 1) {
  return callApi(() => apiClient.get('/api/Allergens/AllergenSearch', { params: { name, pageNumber } }));
}

export function addCodedAllergy(doseSpotPatientId, { allergenId, reaction, reactionType, statusType, onsetDate }) {
  return callApi(() =>
    apiClient.post(
      `/api/Allergies/${doseSpotPatientId}/allergies/coded`,
      buildFormData({ AllergenId: allergenId, reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  );
}

export function addFreeTextAllergy(doseSpotPatientId, { freeTextDisplayName, reaction, reactionType, statusType, onsetDate }) {
  return callApi(() =>
    apiClient.post(
      `/api/Allergies/${doseSpotPatientId}/allergies/freetext`,
      buildFormData({ freeTextDisplayName, reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  );
}

export function editPatientAllergy(doseSpotPatientId, patientAllergyId, { reaction, reactionType, statusType, onsetDate }) {
  return callApi(() =>
    apiClient.put(
      `/api/Allergies/${doseSpotPatientId}/allergies/${patientAllergyId}`,
      buildFormData({ reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  );
}

export function addNoKnownAllergy(doseSpotPatientId) {
  return callApi(() => apiClient.post(`/api/Allergies/${doseSpotPatientId}/allergies/noKnownAllergy`));
}

// ---- RxChange Requests ----
export function getPendingRxChangeRequests({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  return callApi(() => apiClient.get('/api/RxChange/pending', { params }));
}

export function getPendingRxChangeRequestsDetailed({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  return callApi(() => apiClient.get('/api/RxChange/pending/detailed', { params }));
}

export function approveRxChange(rxChangeId, payload) {
  return callApi(() => apiClient.post(`/api/RxChange/${rxChangeId}/approve`, payload));
}

export function denyRxChange(rxChangeId, { reason, selectedMedicationId, comment }) {
  const body = new URLSearchParams();
  body.append('Reason', reason);
  if (selectedMedicationId != null) body.append('selectedMedicationId', String(selectedMedicationId));
  if (comment) body.append('comment', comment);
  return callApi(() =>
    apiClient.post(`/api/RxChange/${rxChangeId}/deny`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  );
}

export function getPharmacyById(pharmacyId) {
  return callApi(() => apiClient.get(`/api/Pharmacies/GetPharmacyById/${pharmacyId}`));
}

// ---- Refill Requests ----
export function getPendingRefillRequests({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  return callApi(() => apiClient.get('/api/Refills/pending', { params }));
}

export function getPendingRefillRequestsDetailed({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  return callApi(() => apiClient.get('/api/Refills/pending/detailed', { params }));
}

export function approveRefill(refillId, { refills, effectiveDate, comment }) {
  return callApi(() => apiClient.post(`/api/Refills/${refillId}/approve`, { refills, effectiveDate, comment }));
}

export function denyRefill(refillId, { denialReason, note }) {
  return callApi(() =>
    apiClient.post(`/api/Refills/${refillId}/deny`, { denialReason: Number(denialReason), note }),
  );
}
