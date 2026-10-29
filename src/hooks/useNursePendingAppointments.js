import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPendingAppointments,
  fetchAvailableDoctors,
  assignDoctorToPendingAppointment,
  clearAvailableDoctors,
} from '../store/slices/nursePendingAppointmentsSlice';

export function useNursePendingAppointments() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.nursePendingAppointments);

  const refresh = useCallback(() => dispatch(fetchPendingAppointments()), [dispatch]);

  const loadAvailableDoctors = useCallback(
    (appointmentId) => dispatch(fetchAvailableDoctors(appointmentId)),
    [dispatch],
  );

  const assignDoctor = useCallback(
    (appointmentId, doctorId) =>
      dispatch(assignDoctorToPendingAppointment({ appointmentId, doctorId })).unwrap(),
    [dispatch],
  );

  const resetAvailableDoctors = useCallback(() => dispatch(clearAvailableDoctors()), [dispatch]);

  return { ...state, refresh, loadAvailableDoctors, assignDoctor, resetAvailableDoctors };
}
