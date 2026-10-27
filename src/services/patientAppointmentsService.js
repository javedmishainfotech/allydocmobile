import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';
import { buildPatientAppointmentsQuery } from '../utils/appointmentListApi';

/** Mirrors fetchPatientAppointmentsList (module/Patient/Pages/Appointments/Action.js). The
 * endpoint returns the whole filtered list; paging happens on the client. */
export function getPatientAppointmentsList(patientId, filter) {
  return callApi(() => apiClient.get(`/PatientAppointments?${buildPatientAppointmentsQuery(patientId, filter)}`));
}

/** Mirrors PatientDoctorDropdownAction: the patient's doctors as { id, name }. */
export function getPatientDoctorDropdown(patientId) {
  return callApi(() => apiClient.get(`/PatientDoctorDropdown/${encodeURIComponent(patientId)}`));
}

/** Mirrors AddFeedbackAction (module/Patient/Pages/Feedback/action.js). */
export function addFeedback({ appointmentId, rating, comments }) {
  return callApi(() => apiClient.post('/AddFeedback', { appointmentId, rating, comments }));
}

/** Mirrors EditFeedbackAction. */
export function updateFeedback({ appointmentId, rating, comments }) {
  return callApi(() => apiClient.post('/UpdateFeedback', { appointmentId, rating, comments }));
}
