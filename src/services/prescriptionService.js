import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * "Core flow" of AllyDocReactApp's Prescriptions module (module/Doctor/Pages/Patients/Prescriptions,
 * module/Doctor/Pages/Patients/action.js): add a standard (non-controlled) prescription, send it, and
 * delete it. Deliberately NOT ported here (out of scope for this pass, see docs/PROGRESS.md):
 * EPCS / controlled-substance e-signing, compound medications, custom supply, benefits check, print
 * preview, prescription favorites, and the separate `/AppointmentPrescriptions/UpdateStatus` sync
 * call web fires after each action (a secondary status mirror; the Treatment Plan detail screen
 * already re-fetches `GetTreatmentPlanDetails` after every action here, which is enough to keep its
 * own Prescriptions card correct).
 */

/** Mirrors AddCodedPrescriptionAction: `POST /api/Prescriptions/AddCodedPrescription/{doseSpotPatientId}`. */
export function addCodedPrescription(doseSpotPatientId, payload, appointmentId) {
  return callApi(() =>
    apiClient.post(`/api/Prescriptions/AddCodedPrescription/${doseSpotPatientId}`, { ...payload, appointmentId }),
  );
}

/** Mirrors SendPrescriptionsAction: `POST /api/Prescriptions/SendPrescriptions/{doseSpotPatientId}`.
 * `pin` is null unless the doctor has a TFA PIN set (web's "Account" PIN flow - not required for a
 * plain, non-controlled send). Response is a per-prescription array of `{ id, result }`. */
export function sendPrescriptions(doseSpotPatientId, { pin = null, prescriptionIds }, appointmentId) {
  return callApi(() =>
    apiClient.post(`/api/Prescriptions/SendPrescriptions/${doseSpotPatientId}`, { pin, prescriptionIds, appointmentId }),
  );
}

/** Mirrors DeleteSinglePrescriptionAction / DeleteAllPrescriptionsAction - both call the same batch
 * endpoint; a single id is just a one-element array. `DELETE /api/Prescriptions/DeletePrescriptions/{doseSpotPatientId}`. */
export function deletePrescriptions(doseSpotPatientId, prescriptionIds, appointmentId) {
  return callApi(() =>
    apiClient.delete(`/api/Prescriptions/DeletePrescriptions/${doseSpotPatientId}`, {
      data: { prescriptionIds, appointmentId },
    }),
  );
}

/** Mirrors GetPrescriptionByIdAction: `GET /api/Prescriptions/GetPrescriptionById/{doseSpotPatientId}/{prescriptionId}`. */
export function getPrescriptionById(doseSpotPatientId, prescriptionId) {
  return callApi(() => apiClient.get(`/api/Prescriptions/GetPrescriptionById/${doseSpotPatientId}/${prescriptionId}`));
}

/** Mirrors CancelPrescriptionAction: asks the pharmacy to cancel an already-sent prescription. A comment
 * is required by the UI. `POST /api/Prescriptions/CancelPrescription/{doseSpotPatientId}/{prescriptionId}`. */
export function cancelPrescription(doseSpotPatientId, prescriptionId, comment, appointmentId) {
  return callApi(() =>
    apiClient.post(`/api/Prescriptions/CancelPrescription/${doseSpotPatientId}/${prescriptionId}`, { comment, appointmentId }),
  );
}

/** Mirrors EditCodedPrescriptionAction: `PUT /api/Prescriptions/EditCodedPrescription/{doseSpotPatientId}/{prescriptionId}`. */
export function editCodedPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  return callApi(() =>
    apiClient.put(`/api/Prescriptions/EditCodedPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId }),
  );
}

/** Mirrors SearchPharmaciesAction with every filter the web form has (name, city, state, zip, address, phone/fax, NCPDP). */
export function searchPharmaciesAdvanced(params = {}) {
  const query = { PageNumber: params.PageNumber || 1 };
  ['Name', 'City', 'State', 'Zip', 'Address', 'PhoneOrFax', 'Specialty0', 'Specialty1', 'NcpdpId'].forEach((key) => {
    if (params[key]) query[key] = params[key];
  });
  return callApi(() => apiClient.get('/api/Pharmacies/SearchPharmacies', { params: query }));
}

/** Mirrors AddPatientPharmacyAction / SetDefaultPharmacyAction (same endpoint): saves a pharmacy to the patient, optionally as the default. */
export function addPatientPharmacy(doseSpotPatientId, pharmacyId, setAsPrimary = false) {
  return callApi(() => apiClient.post('/api/Pharmacies/AddPatientPharmacy', { patientId: doseSpotPatientId, pharmacyId, setAsPrimary }));
}

/** Mirrors DeletePatientPharmacyAction: removes a preferred pharmacy from the patient. */
export function deletePatientPharmacy(doseSpotPatientId, pharmacyId) {
  return callApi(() => apiClient.delete(`/api/Pharmacies/DeletePatientPharmacy/${doseSpotPatientId}/${pharmacyId}`));
}

/** Mirrors GetPatientPrescriptionsByStatusAction: `GET /api/Prescriptions/GetPatientPrescriptions/{doseSpotPatientId}`
 * (`status` is a comma-joined list; web's step 2 / review use Entered, Edited, ReadyToSign, EpcsError, 40 a page). */
export function getPatientPrescriptionsByStatus(doseSpotPatientId, { pageNumber = 1, limit = 40, status } = {}) {
  const params = { pageNumber, limit };
  if (status) params.status = Array.isArray(status) ? status.join(',') : status;
  return callApi(() => apiClient.get(`/api/Prescriptions/GetPatientPrescriptions/${doseSpotPatientId}`, { params }));
}

/** Mirrors SearchSuppliesAction: `GET /api/Supply/SearchSupplies`. */
export function searchSupplies(name, pageNumber = 1) {
  return callApi(() => apiClient.get('/api/Supply/SearchSupplies', { params: { pageNumber, name } }));
}

/** Mirrors AddSupplyPrescriptionAction (a supply from the DoseSpot catalogue). */
export function addSupplyPrescription(doseSpotPatientId, payload, appointmentId) {
  return callApi(() => apiClient.post(`/api/Prescriptions/AddSupplyPrescription/${doseSpotPatientId}`, { ...payload, appointmentId }));
}

/** Mirrors EditSupplyPrescriptionAction. */
export function editSupplyPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  return callApi(() =>
    apiClient.put(`/api/Prescriptions/EditSupplyPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId }),
  );
}

/** Mirrors AddSupplyFreeTextPrescriptionAction ("Add Custom Supply"). */
export function addSupplyFreeTextPrescription(doseSpotPatientId, payload, appointmentId) {
  return callApi(() =>
    apiClient.post(`/api/Prescriptions/AddSupplyFreeTextPrescription/${doseSpotPatientId}`, { ...payload, appointmentId }),
  );
}

/** Mirrors EditSupplyFreeTextPrescriptionAction. */
export function editSupplyFreeTextPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  return callApi(() =>
    apiClient.put(`/api/Prescriptions/EditSupplyFreeTextPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId }),
  );
}

/** Web FavoritesTab: `GET /api/ClinicianFavorites/{clinicianId}/prescriptionFavorites`
 * (`favoriteType`: 0 all, 1 medications, 2 supplies, 3 compounds). */
export function getClinicianFavorites(clinicianId, { pageNumber = 1, pageSize = 20, searchName = '', favoriteType = 0 } = {}) {
  return callApi(() =>
    apiClient.get(`/api/ClinicianFavorites/${clinicianId}/prescriptionFavorites`, {
      params: { pageNumber, pageSize, searchName, favoriteType },
    }),
  );
}

/** Web ClinicPresetsTab: `GET /api/ClinicFavorites/{clinicId}/prescriptionFavorites` (same params). */
export function getClinicFavorites(clinicId, { pageNumber = 1, pageSize = 20, searchName = '', favoriteType = 0 } = {}) {
  return callApi(() =>
    apiClient.get(`/api/ClinicFavorites/${clinicId}/prescriptionFavorites`, {
      params: { pageNumber, pageSize, searchName, favoriteType },
    }),
  );
}

/** Mirrors CreatePrescriptionCodedFavoriteAction (the medication form's "Save as favorite"). */
export function createCodedFavorite(payload) {
  return callApi(() => apiClient.post('/api/ClinicianFavorites/prescriptionFavorites/coded', payload));
}

/** Mirrors GetPatientPrescriptionsAction (patient profile's Prescriptions tab) - the same endpoint as
 * getPatientPrescriptionsByStatus, called with no status filter so the backend returns every status,
 * 20 per page. */
export function getPatientPrescriptions(doseSpotPatientId, pageNumber = 1) {
  return getPatientPrescriptionsByStatus(doseSpotPatientId, { pageNumber, limit: 20 });
}

/** Mirrors GetPrescriptionLogAction: `GET /api/Prescriptions/patients/{doseSpotPatientId}/prescriptions/{prescriptionId}/log`. */
export function getPrescriptionLog(doseSpotPatientId, prescriptionId) {
  return callApi(() => apiClient.get(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/${prescriptionId}/log`));
}
