import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
import { buildPatientAppointmentsQuery } from '../utils/appointmentListApi';

/** Mirrors fetchPatientAppointmentsList (module/Patient/Pages/Appointments/Action.js). The
 * endpoint returns the whole filtered list; paging happens on the client. */
export async function getPatientAppointmentsList(patientId, filter) {
  try {
    const response = await apiClient.get(`/PatientAppointments?${buildPatientAppointmentsQuery(patientId, filter)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors PatientDoctorDropdownAction: the patient's doctors as { id, name }. */
export async function getPatientDoctorDropdown(patientId) {
  try {
    const response = await apiClient.get(`/PatientDoctorDropdown/${encodeURIComponent(patientId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddFeedbackAction (module/Patient/Pages/Feedback/action.js). */
export async function addFeedback({ appointmentId, rating, comments }) {
  try {
    const response = await apiClient.post('/AddFeedback', { appointmentId, rating, comments });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors EditFeedbackAction. */
export async function updateFeedback({ appointmentId, rating, comments }) {
  try {
    const response = await apiClient.post('/UpdateFeedback', { appointmentId, rating, comments });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
