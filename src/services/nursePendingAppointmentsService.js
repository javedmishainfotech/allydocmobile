import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors getPendingAppointmentsAction in AllyDocReactApp/src/module/Nurse/PendingAppointments/actions.js. */
export async function getPendingAppointments() {
  try {
    const response = await apiClient.get('/AllPendingAppointment');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors getAvailableDoctorAction. */
export async function getAvailableDoctors(appointmentId) {
  try {
    const response = await apiClient.get(`/GetAvailableDoctors?AppointmentId=${appointmentId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AppointmentRequestAcceptAction (store/actions) - same endpoint used to accept a
 * pending request, here reused by a Nurse to assign it to a doctor. */
export async function assignDoctorToAppointment({ appointmentId, doctorId }) {
  try {
    const response = await apiClient.post('/AppointmentAccept', { appointmentId, doctorId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
