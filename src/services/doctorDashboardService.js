import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetHistoryAndAppointmentRequestAction in AllyDocReactApp/src/store/actions.
 * Returns { doctorAppointmentScheduledRequest, doctorAppointmentHistory, todaysAppointmentsExcludingRequested }. */
export async function getHistoryAndAppointmentRequest(doctorId) {
  try {
    const response = await apiClient.get(`/HistoryAndAppointmentRequest?DoctorId=${doctorId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetDashboardAnalytics in AllyDocReactApp/src/store/actions.
 * Returns { oldPatient, newPatient, totalVisit, totalFeedBackOnCompletedAppointment, averageRating, scheduledAppointments, completedAppointments }. */
export async function getDashboardAnalytics(userId) {
  try {
    const response = await apiClient.get(`/DashboardAnalytics?userId=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AppointmentRequestAcceptAction in AllyDocReactApp/src/store/actions. */
export async function acceptAppointmentRequest({ appointmentId, doctorId }) {
  try {
    const response = await apiClient.post('/AppointmentAccept', { appointmentId, doctorId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
