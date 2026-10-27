import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors PatientAppointmentHistory in AllyDocReactApp/src/store/actions. */
export function getPatientAppointmentHistory(patientId) {
  return callApi(() => apiClient.get(`/HistoryAppointmentPatient?PatientId=${encodeURIComponent(patientId)}`));
}

/** Mirrors GetUserActiveSubscriptionAction (module/Patient/Pages/Setting/action.js). The
 * endpoint identifies the patient from the auth token, so it takes no id. */
export function getUserActiveSubscription() {
  return callApi(() => apiClient.get('/GetUserActiveSubscription'));
}

/** Mirrors GetPendingBookingAttemptAction (BookAppointmentModal/Actions.js). */
export function getPendingBookingAttempt(patientId) {
  return callApi(() => apiClient.get(`/BookingProgress/GetPending?patientId=${encodeURIComponent(patientId)}`));
}
