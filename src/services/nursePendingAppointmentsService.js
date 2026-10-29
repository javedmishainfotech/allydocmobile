import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors getPendingAppointmentsAction in AllyDocReactApp/src/module/Nurse/PendingAppointments/actions.js. */
export function getPendingAppointments() {
  return callApi(() => apiClient.get('/AllPendingAppointment'));
}

/** Mirrors getAvailableDoctorAction. */
export function getAvailableDoctors(appointmentId) {
  return callApi(() => apiClient.get(`/GetAvailableDoctors?AppointmentId=${appointmentId}`));
}

/** Mirrors AppointmentRequestAcceptAction (store/actions) - same endpoint used to accept a
 * pending request, here reused by a Nurse to assign it to a doctor. */
export function assignDoctorToAppointment({ appointmentId, doctorId }) {
  return callApi(() => apiClient.post('/AppointmentAccept', { appointmentId, doctorId }));
}
