import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchPatientAppointmentsList,
  fetchPatientDoctorDropdown,
  submitAppointmentFeedback,
} from '../store/slices/patientAppointmentsSlice';

export function usePatientAppointments() {
  const dispatch = useDispatch();

  const getPatientAppointmentsList = useCallback(
    (patientId, filter) => dispatch(fetchPatientAppointmentsList({ patientId, filter })).unwrap(),
    [dispatch],
  );

  const getPatientDoctorDropdown = useCallback(
    (patientId) => dispatch(fetchPatientDoctorDropdown(patientId)).unwrap(),
    [dispatch],
  );

  const saveFeedback = useCallback(
    (appointmentId, rating, comments, isEdit) =>
      dispatch(submitAppointmentFeedback({ appointmentId, rating, comments, isEdit })).unwrap(),
    [dispatch],
  );

  return { getPatientAppointmentsList, getPatientDoctorDropdown, saveFeedback };
}
