import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
import { buildTreatmentPlanListQuery } from '../utils/appointmentListApi';

/** Mirrors GetAllTreatmentPlansAction (module/Doctor/Pages/DoctorTreatmentPlan/Action.js):
 * `GET /AllTreatmentPlanListV2`, server-paginated. Used by the patient and doctor lists. */
export async function getTreatmentPlansList(filter) {
  const query = buildTreatmentPlanListQuery(filter);
  try {
    const response = await apiClient.get(query ? `/AllTreatmentPlanListV2?${query}` : '/AllTreatmentPlanListV2');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetTreatmentPlanDetailsAction. */
export async function getTreatmentPlanDetails(appointmentId) {
  try {
    const response = await apiClient.get('/TreatmentPlanDetails', { params: { AppointmentId: appointmentId } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors SaveTranscriptDataAction: saves the SOAP notes, either as a draft (`isSubmitted: false`)
 * or final (`isSubmitted: true`, with `isCompleted` optionally also marking the appointment done). */
export async function saveTranscriptData({ appointmentId, subjective, objective, assessment, plan, isSubmitted, isCompleted }) {
  try {
    const response = await apiClient.post('/SaveTranscriptData', { appointmentId, subjective, objective, assessment, plan, isSubmitted, isCompleted });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/* ---- In-office "Medicine Stock" - the Treatment Plan detail screen's "Medicines" card
 * (module/Doctor/Pages/DoctorTreatmentPlan/Action.js + AddMedicineModal.jsx). Distinct from the
 * DoseSpot e-prescribing flow (prescriptionService.js): this is a doctor-scoped list of
 * in-office-dispensed medicine names (built up over time as the doctor types new ones) used to
 * add a plain, non-DoseSpot medication entry straight onto a visit's treatment plan - no pharmacy,
 * no DEA, no benefits check. `GetAllActiveMedicineStock`'s items double as both the autocomplete
 * catalogue AND, filtered by appointmentId server-side, the per-visit list rendered in
 * `TreatmentPlanDetails.mediticationLists` (sic - backend's own spelling, kept verbatim so a
 * payload round-trips unchanged). This whole feature was commented out (dead code) in the
 * "latest" web repo during its tabs refactor; ported here from the sibling AllyDocReactApp repo,
 * which still has it live and wired up. */

/** Mirrors GetAllMedicineStockAction: `GET /GetAllActiveMedicineStock`. Returns every active
 * medicine name/id this doctor has previously added (across all their appointments) - used to
 * populate the Add Medicine autocomplete. */
export async function getAllActiveMedicineStock() {
  try {
    const response = await apiClient.get('/GetAllActiveMedicineStock');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddMedicineAction: `POST /AddMedicine`. `medicineId` is 0 (and `medicineName` the
 * freely-typed text) when the doctor types a brand-new name instead of picking an existing stock
 * entry - the backend creates the new stock entry itself. */
export async function addMedicine({ appointmentId, medicineId = 0, medicineName, doseQuantity, doseUnit, frequency, instruction, durationDays, beforeAfterFood }) {
  try {
    const response = await apiClient.post('/AddMedicine', {
      appointmentId,
      medicineId,
      medicineName,
      doseQuantity,
      doseUnit,
      frequency,
      instruction,
      durationDays,
      beforeAfterFood,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DeleteMedicineAction: `POST /DeleteMedicine?Id=`. `id` is the medicine-stock row's own
 * id (`mediticationLists[].id`), not the catalogue `medicineId`. */
export async function deleteMedicine(id) {
  try {
    const response = await apiClient.post(`/DeleteMedicine?Id=${id}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
