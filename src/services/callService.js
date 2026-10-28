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
