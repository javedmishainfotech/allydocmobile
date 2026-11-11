import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAppointmentDetails,
  fetchPatientAllergies,
} from '../store/slices/pendingRequestDetailsSlice';

/** Thin unwrap-based wrapper around the pending-request-details slice's thunks, with the exact
 * same call signature as before - see pendingRequestDetailsSlice.js for why these resolve with
 * the full result envelope. */
export function usePendingRequestDetails() {
  const dispatch = useDispatch();

  const getAppointmentDetails = useCallback(
    (appointmentId) => dispatch(fetchAppointmentDetails(appointmentId)).unwrap(),
    [dispatch],
  );

  const getPatientAllergies = useCallback(
    (doseSpotPatientId) => dispatch(fetchPatientAllergies(doseSpotPatientId)).unwrap(),
    [dispatch],
  );

  return { getAppointmentDetails, getPatientAllergies };
}
