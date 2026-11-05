import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetURlAction (AllyDocReactApp/src/components/Daily_Co/action.js): starts (or rejoins) the
 * Daily.co room for this appointment and returns `{ url, token, callSessionId }`. */
export async function startAppointmentCall(appointmentId, callType) {
  try {
    const response = await apiClient.post(`/StartAppointmentCall?AppointmentId=${appointmentId}&Type=${callType}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors StartCallRecordingAction. Doctor-side only. */
export async function startCallRecording(roomName) {
  try {
    const response = await apiClient.post(`/start-recording/${roomName}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors StopCallRecordingAction. Doctor-side only. */
export async function stopCallRecording(roomName, appointmentId) {
  try {
    const response = await apiClient.post(`/stop-recording/${roomName}?appointmentId=${appointmentId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors notifyCallAccepted (AllyDocReactApp/src/services/callDeclined.js) - the patient (or a
 * device that was already in the call) telling the backend it is answering a CALL_RINGING push.
 * Answers HTTP 200 even when refused (see `getCallAcceptRefusal` below). */
export async function acceptCall({ appointmentId, callSessionId, deviceToken }) {
  try {
    const response = await apiClient.post('/CallAccept', { appointmentId, callSessionId, deviceToken: deviceToken || undefined });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors notifyCallDeclined. `isAutoReject` is true when the ring timed out with no answer. */
export async function declineCall({ appointmentId, callSessionId, isAutoReject = false, deviceToken }) {
  try {
    const response = await apiClient.post('/CallDeclined', {
      appointmentId,
      callSessionId: callSessionId || undefined,
      isAutoReject,
      deviceToken: deviceToken || undefined,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors getCallAcceptRefusal, adapted to this app's normalized response envelope (web reads
 * the raw axios response; here `result.success`/`result.data`/`result.statusCode` already carry
 * the same information). Returns a short reason when the accept was refused, or null when it
 * succeeded. */
export function getCallAcceptRefusal(result) {
  if (!result || result.success) return null;
  const sessionStatus = String(result.data?.status || '').toUpperCase();
  if (sessionStatus === 'ACCEPTED') return 'answered_elsewhere';
  if (Number(result.statusCode) === 409 || Number(result.statusCode) === 404) return 'ended';
  return 'failed';
}

/** Web's VideoCallModal reads the call session id out of several possible shapes of the
 * StartAppointmentCall response - ported verbatim since the backend field name isn't fixed. */
export function pickCallSessionId(value) {
  if (!value || typeof value !== 'object') return '';
  const direct =
    value.callSessionId || value.call_session_id || value.callSessionID || value.CallSessionId || value.CallSessionID || value.sessionId || value.SessionId || '';
  if (direct) return String(direct).trim();
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') {
      const nestedId = pickCallSessionId(nested);
      if (nestedId) return nestedId;
    }
  }
  return '';
}
