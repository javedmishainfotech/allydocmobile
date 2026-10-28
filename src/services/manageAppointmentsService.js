import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';
import { localDateOnlyToApiString } from '../utils/dateOnly';
import { buildDoctorAppointmentsQuery } from '../utils/appointmentListApi';

/** Mirrors getAllAppointmentsBasedOnDate in AllyDocReactApp/src/store/actions. Date-only filter. */
export function getAppointmentsBasedOnDate(date) {
  const formattedDate = localDateOnlyToApiString(date);
  return callApi(() => apiClient.get(`/AllAppointmentsBasedOnDate?date=${encodeURIComponent(formattedDate)}`));
}

/** Mirrors DoctorAppointmentsAction in AllyDocReactApp/.../DoctorAppointments/action.js. */
export function getDoctorAppointments(doctorId, status) {
  const params = new URLSearchParams();
  params.append('Doctorid', String(doctorId));
  const statusValue = status != null ? String(status).trim() : '';
  if (statusValue && statusValue.toLowerCase() !== 'all') {
    params.append('Status', statusValue);
  }
  return callApi(() => apiClient.get(`/AllDoctorAppointment?${params.toString()}`));
}

/** Mirrors ChangeAppointmentStatusAction. */
export function markAppointmentComplete({ appointmentId, remarks }) {
  return callApi(() =>
    apiClient.post(`/MarkAsCompleted?AppointmentId=${appointmentId}`, remarks ? { remarks } : {}),
  );
}

/** Mirrors cancelAppointmentAction. */
export function cancelAppointment({ appointmentId, cancelReason }) {
  return callApi(() => apiClient.post('/AppointmentCancel', { appointmentId, cancelReason }));
}

/** Mirrors GetNotesAction. */
export function getAppointmentNotes(appointmentId) {
  return callApi(() => apiClient.get(`/api/AppointmentNotes/AppointmentNotesById?AppointmentId=${appointmentId}`));
}

/** Mirrors AddNotesAction. */
export function saveAppointmentNotes({ appointmentId, userId, notes }) {
  return callApi(() =>
    apiClient.post('/api/AppointmentNotes/AppointmentNoteSaveAndEdit', { appointmentId, userId, notes }),
  );
}

/** Mirrors GetDoctorAppointmentsListAction (server-paginated, filterable). The web's
 * `GET /AllDoctorAppointment?...` query is built by utils/appointmentListApi.js. */
export function getDoctorAppointmentsList(doctorId, filter) {
  return callApi(() => apiClient.get(`/AllDoctorAppointment?${buildDoctorAppointmentsQuery(doctorId, filter)}`));
}

/** Mirrors UpdateAppointmentAction (reschedule). `appointMentTime` keeps the backend's own
 * capitalization typo - `AppointmentDetailsVM.AppointMentTime` on the server. */
export function updateAppointment({ appointmentId, appointmentDate, appointMentTime, rescheduleReason }) {
  return callApi(() =>
    apiClient.put('/UpdateAppointment', { appointmentId, appointmentDate, appointMentTime, rescheduleReason }),
  );
}

/** Mirrors GetAppointmentRecordingLinkAction. `forceSync` asks Daily.co directly (can take ~1 minute). */
export function getAppointmentRecordingLink(appointmentId, forceSync = false) {
  return callApi(() =>
    apiClient.get(`/AppointmentRecordingLink?appointmentId=${appointmentId}&forceSync=${forceSync}`),
  );
}
