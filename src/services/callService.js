import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetURlAction (AllyDocReactApp/src/components/Daily_Co/action.js): starts (or rejoins) the
 * Daily.co room for this appointment and returns `{ url, token, callSessionId }`. */
export function startAppointmentCall(appointmentId, callType) {
  return callApi(() => apiClient.post(`/StartAppointmentCall?AppointmentId=${appointmentId}&Type=${callType}`));
}

/** Mirrors StartCallRecordingAction. Doctor-side only. */
export function startCallRecording(roomName) {
  return callApi(() => apiClient.post(`/start-recording/${roomName}`));
}

/** Mirrors StopCallRecordingAction. Doctor-side only. */
export function stopCallRecording(roomName, appointmentId) {
  return callApi(() => apiClient.post(`/stop-recording/${roomName}?appointmentId=${appointmentId}`));
}

/** Mirrors notifyCallAccepted (AllyDocReactApp/src/services/callDeclined.js) - the patient (or a
 * device that was already in the call) telling the backend it is answering a CALL_RINGING push.
 * Answers HTTP 200 even when refused (see `getCallAcceptRefusal` below). */
export function acceptCall({ appointmentId, callSessionId, deviceToken }) {
  return callApi(() =>
    apiClient.post('/CallAccept', { appointmentId, callSessionId, deviceToken: deviceToken || undefined }),
  );
}

/** Mirrors notifyCallDeclined. `isAutoReject` is true when the ring timed out with no answer. */
export function declineCall({ appointmentId, callSessionId, isAutoReject = false, deviceToken }) {
  return callApi(() =>
    apiClient.post('/CallDeclined', {
      appointmentId,
      callSessionId: callSessionId || undefined,
      isAutoReject,
      deviceToken: deviceToken || undefined,
    }),
  );
}

/** Mirrors getCallAcceptRefusal, adapted to this app's normalized `callApi` envelope (web reads
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
