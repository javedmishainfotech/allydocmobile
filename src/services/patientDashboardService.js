import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors PatientAppointmentHistory in AllyDocReactApp/src/store/actions. */
export async function getPatientAppointmentHistory(patientId) {
  try {
    const response = await apiClient.get(`/HistoryAppointmentPatient?PatientId=${encodeURIComponent(patientId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetUserActiveSubscriptionAction (module/Patient/Pages/Setting/action.js). The
 * endpoint identifies the patient from the auth token, so it takes no id. */
export async function getUserActiveSubscription() {
  try {
    const response = await apiClient.get('/GetUserActiveSubscription');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPendingBookingAttemptAction (BookAppointmentModal/Actions.js). */
export async function getPendingBookingAttempt(patientId) {
  try {
    const response = await apiClient.get(`/BookingProgress/GetPending?patientId=${encodeURIComponent(patientId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
