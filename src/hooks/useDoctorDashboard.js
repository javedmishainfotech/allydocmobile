import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDoctorDashboardData,
  fetchDoctorDashboardAnalytics,
  acceptAppointmentRequest,
} from '../store/slices/doctorDashboardSlice';

export function useDoctorDashboard() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.doctorDashboard);

  const refresh = useCallback(
    (doctorId) => {
      dispatch(fetchDoctorDashboardData(doctorId));
      dispatch(fetchDoctorDashboardAnalytics(doctorId));
    },
    [dispatch],
  );

  const acceptRequest = useCallback(
    (appointmentId, doctorId) => dispatch(acceptAppointmentRequest({ appointmentId, doctorId })),
    [dispatch],
  );

  return { ...state, refresh, acceptRequest };
}
