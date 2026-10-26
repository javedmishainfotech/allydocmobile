import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetHistoryAndAppointmentRequestAction in AllyDocReactApp/src/store/actions.
 * Returns { doctorAppointmentScheduledRequest, doctorAppointmentHistory, todaysAppointmentsExcludingRequested }. */
export function getHistoryAndAppointmentRequest(doctorId) {
  return callApi(() => apiClient.get(`/HistoryAndAppointmentRequest?DoctorId=${doctorId}`));
}

/** Mirrors GetDashboardAnalytics in AllyDocReactApp/src/store/actions.
 * Returns { oldPatient, newPatient, totalVisit, totalFeedBackOnCompletedAppointment, averageRating, scheduledAppointments, completedAppointments }. */
export function getDashboardAnalytics(userId) {
  return callApi(() => apiClient.get(`/DashboardAnalytics?userId=${userId}`));
}

/** Mirrors AppointmentRequestAcceptAction in AllyDocReactApp/src/store/actions. */
export function acceptAppointmentRequest({ appointmentId, doctorId }) {
  return callApi(() => apiClient.post('/AppointmentAccept', { appointmentId, doctorId }));
}
