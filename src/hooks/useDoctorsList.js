import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchListOfDoctors,
  fetchDoctorTreatmentPlans,
  fetchDoctorFeedbackAppointments,
} from '../store/slices/doctorsListSlice';

/** Thin unwrap-based wrapper around the doctors-list slice's thunks, with the exact same call
 * signature as before - see doctorsListSlice.js for why these resolve with the full result
 * envelope. */
export function useDoctorsList() {
  const dispatch = useDispatch();

  const getListOfDoctors = useCallback(
    (params) => dispatch(fetchListOfDoctors(params)).unwrap(),
    [dispatch],
  );

  const getDoctorTreatmentPlans = useCallback(
    (doctorId) => dispatch(fetchDoctorTreatmentPlans(doctorId)).unwrap(),
    [dispatch],
  );

  const getDoctorFeedbackAppointments = useCallback(
    (doctorId) => dispatch(fetchDoctorFeedbackAppointments(doctorId)).unwrap(),
    [dispatch],
  );

  return { getListOfDoctors, getDoctorTreatmentPlans, getDoctorFeedbackAppointments };
}
