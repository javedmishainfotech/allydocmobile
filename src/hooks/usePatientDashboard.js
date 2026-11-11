import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPatientAppointmentHistory,
  fetchUserActiveSubscription,
  fetchUserActiveSubscriptionRaw,
  fetchPendingBookingAttempt,
} from '../store/slices/patientDashboardSlice';

export function usePatientDashboard() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.patientDashboard);

  const loadAppointments = useCallback(
    (patientId, { silent = false } = {}) =>
      dispatch(fetchPatientAppointmentHistory({ patientId, silent })),
    [dispatch],
  );

  const loadSubscription = useCallback(() => dispatch(fetchUserActiveSubscription()), [dispatch]);

  const getUserActiveSubscriptionRaw = useCallback(
    () => dispatch(fetchUserActiveSubscriptionRaw()).unwrap(),
    [dispatch],
  );

  const loadPendingPayment = useCallback(
    (patientId) => dispatch(fetchPendingBookingAttempt(patientId)).unwrap(),
    [dispatch],
  );

  return { ...state, loadAppointments, loadSubscription, getUserActiveSubscriptionRaw, loadPendingPayment };
}
