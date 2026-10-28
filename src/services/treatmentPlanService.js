import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';
import { buildTreatmentPlanListQuery } from '../utils/appointmentListApi';

/** Mirrors GetAllTreatmentPlansAction (module/Doctor/Pages/DoctorTreatmentPlan/Action.js):
 * `GET /AllTreatmentPlanListV2`, server-paginated. Used by the patient and doctor lists. */
export function getTreatmentPlansList(filter) {
  const query = buildTreatmentPlanListQuery(filter);
  return callApi(() => apiClient.get(query ? `/AllTreatmentPlanListV2?${query}` : '/AllTreatmentPlanListV2'));
}

/** Mirrors GetTreatmentPlanDetailsAction. */
export function getTreatmentPlanDetails(appointmentId) {
  return callApi(() => apiClient.get('/TreatmentPlanDetails', { params: { AppointmentId: appointmentId } }));
}

/** Mirrors SaveTranscriptDataAction: saves the SOAP notes, either as a draft (`isSubmitted: false`)
 * or final (`isSubmitted: true`, with `isCompleted` optionally also marking the appointment done). */
export function saveTranscriptData({ appointmentId, subjective, objective, assessment, plan, isSubmitted, isCompleted }) {
  return callApi(() =>
    apiClient.post('/SaveTranscriptData', { appointmentId, subjective, objective, assessment, plan, isSubmitted, isCompleted }),
  );
}
