import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
import { buildDoctorAppointmentsQuery, buildFacilityAppointmentsQuery } from '../utils/appointmentListApi';

/** Mirrors getAllAppointmentsBasedOnDate in AllyDocReactApp/src/store/actions. Date-only filter.
 * `dateString` must already be a "YYYY-MM-DD" string (see useManageAppointments.js) - the caller
 * formats it, not this function, so a Redux thunk's `meta.arg` never holds a raw Date instance
 * (which redux-toolkit's serializableCheck flags), and so a date already formatted here never
 * risks a day-shift from being round-tripped through `new Date(string)` a second time. */
export async function getAppointmentsBasedOnDate(dateString) {
  try {
    const response = await apiClient.get(`/AllAppointmentsBasedOnDate?date=${encodeURIComponent(dateString)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DoctorAppointmentsAction in AllyDocReactApp/.../DoctorAppointments/action.js. */
export async function getDoctorAppointments(doctorId, status) {
  const params = new URLSearchParams();
  params.append('Doctorid', String(doctorId));
  const statusValue = status != null ? String(status).trim() : '';
  if (statusValue && statusValue.toLowerCase() !== 'all') {
    params.append('Status', statusValue);
  }
  try {
    const response = await apiClient.get(`/AllDoctorAppointment?${params.toString()}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors ChangeAppointmentStatusAction. */
export async function markAppointmentComplete({ appointmentId, remarks }) {
  try {
    const response = await apiClient.post(`/MarkAsCompleted?AppointmentId=${appointmentId}`, remarks ? { remarks } : {});
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors cancelAppointmentAction. */
export async function cancelAppointment({ appointmentId, cancelReason }) {
  try {
    const response = await apiClient.post('/AppointmentCancel', { appointmentId, cancelReason });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetNotesAction. */
export async function getAppointmentNotes(appointmentId) {
  try {
    const response = await apiClient.get(`/api/AppointmentNotes/AppointmentNotesById?AppointmentId=${appointmentId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddNotesAction. */
export async function saveAppointmentNotes({ appointmentId, userId, notes }) {
  try {
    const response = await apiClient.post('/api/AppointmentNotes/AppointmentNoteSaveAndEdit', { appointmentId, userId, notes });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetDoctorAppointmentsListAction (server-paginated, filterable). The web's
 * `GET /AllDoctorAppointment?...` query is built by utils/appointmentListApi.js. */
export async function getDoctorAppointmentsList(doctorId, filter) {
  try {
    const response = await apiClient.get(`/AllDoctorAppointment?${buildDoctorAppointmentsQuery(doctorId, filter)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetFacilityAppointmentsListAction - every appointment at the caller's own facility,
 * for a Nurse (who has no "my own patients as a doctor" concept - Appointment.UserId is always
 * the doctor, so `/AllDoctorAppointment` would return nothing for her). Same response/pagination
 * shape as getDoctorAppointmentsList. */
export async function getFacilityAppointmentsList(filter) {
  try {
    const response = await apiClient.get(`/AllFacilityAppointment?${buildFacilityAppointmentsQuery(filter)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors UpdateAppointmentAction (reschedule). `appointMentTime` keeps the backend's own
 * capitalization typo - `AppointmentDetailsVM.AppointMentTime` on the server. */
export async function updateAppointment({ appointmentId, appointmentDate, appointMentTime, rescheduleReason }) {
  try {
    const response = await apiClient.put('/UpdateAppointment', { appointmentId, appointmentDate, appointMentTime, rescheduleReason });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetAppointmentRecordingLinkAction. `forceSync` asks Daily.co directly (can take ~1 minute). */
export async function getAppointmentRecordingLink(appointmentId, forceSync = false) {
  try {
    const response = await apiClient.get(`/AppointmentRecordingLink?appointmentId=${appointmentId}&forceSync=${forceSync}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
