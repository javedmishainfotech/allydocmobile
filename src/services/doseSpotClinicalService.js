import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * DoseSpot-integrated clinical tabs on the Patient Detail page (Coverage,
 * Medication History, Self Reported Medications, Allergies, RxChange and
 * Refill Requests). All endpoints here are keyed by the patient's DoseSpot
 * id (`doseSpotPatientId` / `doseSpotRefrenceId`), not the internal AllyDoc
 * userId - mirrors AllyDocReactApp/src/module/Doctor/Pages/Patients/action.js
 * and selfReportedMedicationAction.js exactly.
 */

// ---- Coverage / Eligibilities (read-only on web too) ----
export async function getPatientEligibilities(doseSpotPatientId) {
  try {
    const response = await apiClient.get(`/api/Eligibilities/${doseSpotPatientId}/eligibilities`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- Medication History ----
export async function consentToMedicationHistory(doseSpotPatientId) {
  try {
    const response = await apiClient.post(`/api/Medications/patients/${doseSpotPatientId}/medications/history/consent`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getMedicationHistory(doseSpotPatientId, pageNumber = 1) {
  try {
    const response = await apiClient.get(`/api/Medications/patients/${doseSpotPatientId}/medications/history`, {
      params: { pageNumber },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- Self Reported Medications ----
export async function getSelfReportedMedications(doseSpotPatientId, pageNumber = 1) {
  try {
    const response = await apiClient.get(`/api/patients/${doseSpotPatientId}/selfReportedMedications`, {
      params: { pagenumber: pageNumber },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getSelfReportedMedicationById(doseSpotPatientId, selfReportedMedicationId) {
  try {
    const response = await apiClient.get(`/api/patients/${doseSpotPatientId}/selfReportedMedications/${selfReportedMedicationId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function searchMedications(name, pageNumber = 1) {
  try {
    const response = await apiClient.get('/api/Medications/MedicationSearch', { params: { name, pageNumber } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function selectMedication(dispensableDrugId) {
  try {
    const response = await apiClient.get('/api/Medications/SelectMedication', { params: { dispensableDrugId } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

function buildFormData(fields) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
  });
  return formData;
}

export async function addCodedSelfReportedMedication(doseSpotPatientId, fields) {
  try {
    const response = await apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/coded`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function addFreetextSelfReportedMedication(doseSpotPatientId, fields) {
  try {
    const response = await apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/freetext`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function addSimpleSelfReportedMedication(doseSpotPatientId, fields) {
  try {
    const response = await apiClient.post(`/api/patients/${doseSpotPatientId}/selfReportedMedications/simple`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function editCodedSelfReportedMedication(doseSpotPatientId, id, fields) {
  try {
    const response = await apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/coded/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function editFreetextSelfReportedMedication(doseSpotPatientId, id, fields) {
  try {
    const response = await apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/freetext/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function editSimpleSelfReportedMedication(doseSpotPatientId, id, fields) {
  try {
    const response = await apiClient.put(`/api/patients/${doseSpotPatientId}/selfReportedMedications/simple/${id}`, buildFormData(fields), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function updateSelfReportedMedicationStatus(doseSpotPatientId, id, fields) {
  try {
    const response = await apiClient.post(
      `/api/patients/${doseSpotPatientId}/selfReportedMedications/${id}/status`,
      buildFormData(fields),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- Allergies ----
export async function getPatientAllergies(doseSpotPatientId) {
  try {
    const response = await apiClient.get(`/api/Allergies/${doseSpotPatientId}/allergies`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function searchAllergens(name, pageNumber = 1) {
  try {
    const response = await apiClient.get('/api/Allergens/AllergenSearch', { params: { name, pageNumber } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function addCodedAllergy(doseSpotPatientId, { allergenId, reaction, reactionType, statusType, onsetDate }) {
  try {
    const response = await apiClient.post(
      `/api/Allergies/${doseSpotPatientId}/allergies/coded`,
      buildFormData({ AllergenId: allergenId, reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function addFreeTextAllergy(doseSpotPatientId, { freeTextDisplayName, reaction, reactionType, statusType, onsetDate }) {
  try {
    const response = await apiClient.post(
      `/api/Allergies/${doseSpotPatientId}/allergies/freetext`,
      buildFormData({ freeTextDisplayName, reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function editPatientAllergy(doseSpotPatientId, patientAllergyId, { reaction, reactionType, statusType, onsetDate }) {
  try {
    const response = await apiClient.put(
      `/api/Allergies/${doseSpotPatientId}/allergies/${patientAllergyId}`,
      buildFormData({ reaction, reactionType, statusType, onsetDate }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function addNoKnownAllergy(doseSpotPatientId) {
  try {
    const response = await apiClient.post(`/api/Allergies/${doseSpotPatientId}/allergies/noKnownAllergy`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- RxChange Requests ----
export async function getPendingRxChangeRequests({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  try {
    const response = await apiClient.get('/api/RxChange/pending', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getPendingRxChangeRequestsDetailed({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  try {
    const response = await apiClient.get('/api/RxChange/pending/detailed', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function approveRxChange(rxChangeId, payload) {
  try {
    const response = await apiClient.post(`/api/RxChange/${rxChangeId}/approve`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function denyRxChange(rxChangeId, { reason, selectedMedicationId, comment }) {
  const body = new URLSearchParams();
  body.append('Reason', reason);
  if (selectedMedicationId != null) body.append('selectedMedicationId', String(selectedMedicationId));
  if (comment) body.append('comment', comment);
  try {
    const response = await apiClient.post(`/api/RxChange/${rxChangeId}/deny`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getPharmacyById(pharmacyId) {
  try {
    const response = await apiClient.get(`/api/Pharmacies/GetPharmacyById/${pharmacyId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- Refill Requests ----
export async function getPendingRefillRequests({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  try {
    const response = await apiClient.get('/api/Refills/pending', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getPendingRefillRequestsDetailed({ clinic = 'Current', pageNumber = 1, patientId } = {}) {
  const params = { clinic, pageNumber };
  if (patientId) params.patientId = patientId;
  try {
    const response = await apiClient.get('/api/Refills/pending/detailed', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function approveRefill(refillId, { refills, effectiveDate, comment }) {
  try {
    const response = await apiClient.post(`/api/Refills/${refillId}/approve`, { refills, effectiveDate, comment });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function denyRefill(refillId, { denialReason, note }) {
  try {
    const response = await apiClient.post(`/api/Refills/${refillId}/deny`, { denialReason: Number(denialReason), note });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
