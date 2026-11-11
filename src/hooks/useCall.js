import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  startAppointmentCall,
  startCallRecording,
  stopCallRecording,
  acceptCall,
  declineCall,
} from '../store/slices/callSlice';

/** Thin unwrap-based wrapper around the call slice's thunks, one per callService function, with
 * the exact same call signature as before - see callSlice.js for why every function resolves with
 * the full result envelope instead of narrowing/rejecting. */
export function useCall() {
  const dispatch = useDispatch();

  const startCall = useCallback(
    (appointmentId, callType) => dispatch(startAppointmentCall({ appointmentId, callType })).unwrap(),
    [dispatch],
  );

  const startRecording = useCallback(
    (roomName) => dispatch(startCallRecording(roomName)).unwrap(),
    [dispatch],
  );

  const stopRecording = useCallback(
    (roomName, appointmentId) => dispatch(stopCallRecording({ roomName, appointmentId })).unwrap(),
    [dispatch],
  );

  const accept = useCallback(
    (params) => dispatch(acceptCall(params)).unwrap(),
    [dispatch],
  );

  const decline = useCallback(
    (params) => dispatch(declineCall(params)).unwrap(),
    [dispatch],
  );

  return {
    startAppointmentCall: startCall,
    startCallRecording: startRecording,
    stopCallRecording: stopRecording,
    acceptCall: accept,
    declineCall: decline,
  };
}
