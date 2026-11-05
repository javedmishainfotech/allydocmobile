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
