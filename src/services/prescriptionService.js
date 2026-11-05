import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * "Core flow" of AllyDocReactApp's Prescriptions module (module/Doctor/Pages/Patients/Prescriptions,
 * module/Doctor/Pages/Patients/action.js): add/edit/send/delete a standard prescription, plus (further
 * down this file) compound medications, custom supply, the live benefits check, favorites CRUD, and
 * EPCS controlled-substance signing. Deliberately NOT ported (out of scope, see docs/PROGRESS.md):
 * print preview, and the separate `/AppointmentPrescriptions/UpdateStatus` sync call web fires after
 * each action (a secondary status mirror; the Treatment Plan detail screen already re-fetches
 * `GetTreatmentPlanDetails` after every action here, which is enough to keep its own Prescriptions
 * card correct).
 */

/** Mirrors AddCodedPrescriptionAction: `POST /api/Prescriptions/AddCodedPrescription/{doseSpotPatientId}`. */
export async function addCodedPrescription(doseSpotPatientId, payload, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/AddCodedPrescription/${doseSpotPatientId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SendPrescriptionsAction: `POST /api/Prescriptions/SendPrescriptions/{doseSpotPatientId}`.
 * `pin` is null unless the doctor has a TFA PIN set (web's "Account" PIN flow - not required for a
 * plain, non-controlled send). Response is a per-prescription array of `{ id, result }`. */
export async function sendPrescriptions(doseSpotPatientId, { pin = null, prescriptionIds }, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/SendPrescriptions/${doseSpotPatientId}`, { pin, prescriptionIds, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DeleteSinglePrescriptionAction / DeleteAllPrescriptionsAction - both call the same batch
 * endpoint; a single id is just a one-element array. `DELETE /api/Prescriptions/DeletePrescriptions/{doseSpotPatientId}`. */
export async function deletePrescriptions(doseSpotPatientId, prescriptionIds, appointmentId) {
  try {
    const response = await apiClient.delete(`/api/Prescriptions/DeletePrescriptions/${doseSpotPatientId}`, {
      data: { prescriptionIds, appointmentId },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPrescriptionByIdAction: `GET /api/Prescriptions/GetPrescriptionById/{doseSpotPatientId}/{prescriptionId}`. */
export async function getPrescriptionById(doseSpotPatientId, prescriptionId) {
  try {
    const response = await apiClient.get(`/api/Prescriptions/GetPrescriptionById/${doseSpotPatientId}/${prescriptionId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors CancelPrescriptionAction: asks the pharmacy to cancel an already-sent prescription. A comment
 * is required by the UI. `POST /api/Prescriptions/CancelPrescription/{doseSpotPatientId}/{prescriptionId}`. */
export async function cancelPrescription(doseSpotPatientId, prescriptionId, comment, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/CancelPrescription/${doseSpotPatientId}/${prescriptionId}`, { comment, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors EditCodedPrescriptionAction: `PUT /api/Prescriptions/EditCodedPrescription/{doseSpotPatientId}/{prescriptionId}`. */
export async function editCodedPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  try {
    const response = await apiClient.put(`/api/Prescriptions/EditCodedPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SearchPharmaciesAction with every filter the web form has (name, city, state, zip, address, phone/fax, NCPDP). */
export async function searchPharmaciesAdvanced(params = {}) {
  const query = { PageNumber: params.PageNumber || 1 };
  ['Name', 'City', 'State', 'Zip', 'Address', 'PhoneOrFax', 'Specialty0', 'Specialty1', 'NcpdpId'].forEach((key) => {
    if (params[key]) query[key] = params[key];
  });
  try {
    const response = await apiClient.get('/api/Pharmacies/SearchPharmacies', { params: query });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddPatientPharmacyAction / SetDefaultPharmacyAction (same endpoint): saves a pharmacy to the patient, optionally as the default. */
export async function addPatientPharmacy(doseSpotPatientId, pharmacyId, setAsPrimary = false) {
  try {
    const response = await apiClient.post('/api/Pharmacies/AddPatientPharmacy', { patientId: doseSpotPatientId, pharmacyId, setAsPrimary });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DeletePatientPharmacyAction: removes a preferred pharmacy from the patient. */
export async function deletePatientPharmacy(doseSpotPatientId, pharmacyId) {
  try {
    const response = await apiClient.delete(`/api/Pharmacies/DeletePatientPharmacy/${doseSpotPatientId}/${pharmacyId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPatientPrescriptionsByStatusAction: `GET /api/Prescriptions/GetPatientPrescriptions/{doseSpotPatientId}`
 * (`status` is a comma-joined list; web's step 2 / review use Entered, Edited, ReadyToSign, EpcsError, 40 a page). */
export async function getPatientPrescriptionsByStatus(doseSpotPatientId, { pageNumber = 1, limit = 40, status } = {}) {
  const params = { pageNumber, limit };
  if (status) params.status = Array.isArray(status) ? status.join(',') : status;
  try {
    const response = await apiClient.get(`/api/Prescriptions/GetPatientPrescriptions/${doseSpotPatientId}`, { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SearchSuppliesAction: `GET /api/Supply/SearchSupplies`. */
export async function searchSupplies(name, pageNumber = 1) {
  try {
    const response = await apiClient.get('/api/Supply/SearchSupplies', { params: { pageNumber, name } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddSupplyPrescriptionAction (a supply from the DoseSpot catalogue). */
export async function addSupplyPrescription(doseSpotPatientId, payload, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/AddSupplyPrescription/${doseSpotPatientId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors EditSupplyPrescriptionAction. */
export async function editSupplyPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  try {
    const response = await apiClient.put(`/api/Prescriptions/EditSupplyPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddSupplyFreeTextPrescriptionAction ("Add Custom Supply"). */
export async function addSupplyFreeTextPrescription(doseSpotPatientId, payload, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/AddSupplyFreeTextPrescription/${doseSpotPatientId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors EditSupplyFreeTextPrescriptionAction. */
export async function editSupplyFreeTextPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  try {
    const response = await apiClient.put(`/api/Prescriptions/EditSupplyFreeTextPrescription/${doseSpotPatientId}/${prescriptionId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors the live-prescribing CompoundModal's submit (AllyDocReactApp's
 * Patients/Prescriptions/modals/CompoundModal.jsx) - "Add Custom Compound" on the prescribe
 * screen. Sent immediately (status "1"), no separate review/send/PIN step, unlike coded
 * medications. Distinct from the Compound FAVORITE endpoints (createCompoundFavorite/
 * updateCompoundFavorite below), which create a reusable template instead of a live
 * prescription. */
export async function addCompiledCompoundPrescription(doseSpotPatientId, payload, appointmentId) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/AddCompiledCompoundPrescription/${doseSpotPatientId}`, { ...payload, appointmentId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors EditCompiledCompoundPrescriptionAction. */
export async function editCompiledCompoundPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId) {
  try {
    const response = await apiClient.put(`/api/Prescriptions/EditCompiledCompoundPrescription/${doseSpotPatientId}/${prescriptionId}`, {
      ...payload,
      appointmentId,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors the "Prescription Benefits" live eligibility/formulary check
 * (AllyDocReactApp's PrescriptionBenefitsModal.jsx). `RealTimeFormularyRequestStatus` 1/2
 * (Queued/Processing) means the caller should poll again - see the component for the exact
 * retry loop (3s interval, 10 attempts). */
export async function getPrescriptionBenefits({ patientId, patientEligibilityId, ndc, pharmacyId, quantity = '30', daysSupply = 30, dispenseUnitTypeId = 1 }) {
  try {
    const response = await apiClient.get(`/api/Supply/patients/${patientId}/prescriptionbenefits`, {
      params: { patientEligibilityId, ndc, pharmacyId, quantity, daysSupply, dispenseUnitTypeId },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Web FavoritesTab: `GET /api/ClinicianFavorites/{clinicianId}/prescriptionFavorites`
 * (`favoriteType`: 0 all, 1 medications, 2 supplies, 3 compounds). */
export async function getClinicianFavorites(clinicianId, { pageNumber = 1, pageSize = 20, searchName = '', favoriteType = 0 } = {}) {
  try {
    const response = await apiClient.get(`/api/ClinicianFavorites/${clinicianId}/prescriptionFavorites`, {
      params: { pageNumber, pageSize, searchName, favoriteType },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Web ClinicPresetsTab: `GET /api/ClinicFavorites/{clinicId}/prescriptionFavorites` (same params). */
export async function getClinicFavorites(clinicId, { pageNumber = 1, pageSize = 20, searchName = '', favoriteType = 0 } = {}) {
  try {
    const response = await apiClient.get(`/api/ClinicFavorites/${clinicId}/prescriptionFavorites`, {
      params: { pageNumber, pageSize, searchName, favoriteType },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors CreatePrescriptionCodedFavoriteAction (the medication form's "Save as favorite"). */
export async function createCodedFavorite(payload) {
  try {
    const response = await apiClient.post('/api/ClinicianFavorites/prescriptionFavorites/coded', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Favorites management module (AllyDocReactApp's Doctor/Pages/Favorites, clinician-wide, and
 * Doctor/Pages/Clinics/ClinicFavorites, clinic-wide) - full create/update CRUD for the three
 * favorite categories. No delete endpoint exists on web for any of these (confirmed: its
 * delete buttons only show a "coming soon" toast), so none is built here either. */
export const FAVORITE_TYPE = { MEDICATIONS: 1, SUPPLIES: 2, COMPOUNDS: 3 };

function favoritesBasePath(scope, id) {
  return scope === 'clinic' ? `/api/ClinicFavorites/${id}` : '/api/ClinicianFavorites';
}

export async function updateCodedFavorite(scope, id, favoriteId, payload) {
  try {
    const response = await apiClient.put(`${favoritesBasePath(scope, id)}/prescriptionFavorites/coded/${favoriteId}`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function createSupplyFavorite(scope, id, payload) {
  try {
    const response = await apiClient.post(`${favoritesBasePath(scope, id)}/prescriptionFavorites/supply`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function updateSupplyFavorite(scope, id, favoriteId, payload) {
  try {
    const response = await apiClient.put(`${favoritesBasePath(scope, id)}/prescriptionFavorites/supply/${favoriteId}`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// Web's clinic-scope compound path capitalizes "Compound" (compiledCompound); the clinician-scope
// path doesn't (compiledcompound) - a literal backend inconsistency, not a typo to "fix".
export async function createCompoundFavorite(scope, id, payload) {
  const segment = scope === 'clinic' ? 'compiledCompound' : 'compiledcompound';
  try {
    const response = await apiClient.post(`${favoritesBasePath(scope, id)}/prescriptionFavorites/${segment}`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function updateCompoundFavorite(scope, id, favoriteId, payload) {
  const segment = scope === 'clinic' ? 'compiledCompound' : 'compiledcompound';
  try {
    const response = await apiClient.put(`${favoritesBasePath(scope, id)}/prescriptionFavorites/${segment}/${favoriteId}`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// The clinic-scope coded-favorite CREATE endpoint needs the clinic id in its path (unlike the
// clinician-scope one above, which is id-less); kept separate instead of overloading
// `createCodedFavorite` so its existing prescribe-flow callers are untouched.
export async function createClinicCodedFavorite(clinicId, payload) {
  try {
    const response = await apiClient.post(`/api/ClinicFavorites/${clinicId}/prescriptionFavorites/coded`, payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPatientPrescriptionsAction (patient profile's Prescriptions tab) - the same endpoint as
 * getPatientPrescriptionsByStatus, called with no status filter so the backend returns every status,
 * 20 per page. */
export function getPatientPrescriptions(doseSpotPatientId, pageNumber = 1) {
  return getPatientPrescriptionsByStatus(doseSpotPatientId, { pageNumber, limit: 20 });
}

/** Mirrors GetPrescriptionLogAction: `GET /api/Prescriptions/patients/{doseSpotPatientId}/prescriptions/{prescriptionId}/log`. */
export async function getPrescriptionLog(doseSpotPatientId, prescriptionId) {
  try {
    const response = await apiClient.get(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/${prescriptionId}/log`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// ---- EPCS signing (controlled-substance e-prescribing) ----
// Port of AllyDocReactApp's EpcsWorkflowModal.jsx / EpcsWorkflowStepper.jsx 4-step flow:
// DEA suggestion lookup -> readyToSign -> PIN+OTP sign/send, all against an already-created
// prescription (added earlier via the normal addCodedPrescription flow once TFA+PIN are set).

/** Mirrors GetEpcsSuggestionsAction - the suggested DEA number(s) to use when signing one
 * controlled prescription. */
export async function getEpcsSuggestions(doseSpotPatientId, prescriptionId) {
  try {
    const response = await apiClient.get(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/${prescriptionId}/epcsSuggestions`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors PostReadyToSignAction - a batched "prepare to sign" call for every selected
 * controlled prescription, each with its own (possibly overridden) DEA number. */
export async function postReadyToSign(doseSpotPatientId, { prescriptions, appointmentId }) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/readyToSign`, {
      prescriptions,
      appointmentId,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SendEpcsAction - PIN + DUO passcode together, signs AND transmits in one call
 * (no separate token/send step). */
export async function sendEpcs(doseSpotPatientId, { pin, otp, prescriptionIds, appointmentId }) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/sendEpcs`, {
      pin,
      otp,
      prescriptionIds,
      appointmentId,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SetPrintedPrescriptionsAction - marks the selected prescriptions "printed" before the
 * Print/Download PDF flow actually renders (web's ReviewAndSave.jsx requestFinalizeAction). `pin`
 * is omitted (undefined) when the prescriber has no PIN on file, same as web. */
export async function setPrintedPrescriptions(doseSpotPatientId, { pin, prescriptionIds, appointmentId }) {
  try {
    const response = await apiClient.post(`/api/Prescriptions/patients/${doseSpotPatientId}/prescriptions/setPrinted`, {
      pin,
      prescriptionIds,
      appointmentId,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
