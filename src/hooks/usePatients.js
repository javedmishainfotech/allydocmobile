import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchFreelancerPatients,
  fetchClinicPatients,
  fetchPatientUserDetails,
  fetchPatientAppointmentHistoryForDetail,
  fetchPatientPharmacies,
  fetchDoctorPatientDropdown,
} from '../store/slices/patientsSlice';

/** Thin unwrap-based wrapper around the patients slice's thunks - see patientsSlice.js for why
 * there is no shared list/status state to read here. */
export function usePatients() {
  const dispatch = useDispatch();

  const getFreelancerPatients = useCallback(
    (params) => dispatch(fetchFreelancerPatients(params)).unwrap(),
    [dispatch],
  );
  const getClinicPatients = useCallback(
    (params) => dispatch(fetchClinicPatients(params)).unwrap(),
    [dispatch],
  );
  const getUserDetails = useCallback(
    (userId) => dispatch(fetchPatientUserDetails(userId)).unwrap(),
    [dispatch],
  );
  const getPatientAppointmentHistory = useCallback(
    (patientId) => dispatch(fetchPatientAppointmentHistoryForDetail(patientId)).unwrap(),
    [dispatch],
  );
  const getPatientPharmacies = useCallback(
    (doseSpotPatientId) => dispatch(fetchPatientPharmacies(doseSpotPatientId)).unwrap(),
    [dispatch],
  );
  const getDoctorPatientDropdown = useCallback(
    () => dispatch(fetchDoctorPatientDropdown()).unwrap(),
    [dispatch],
  );

  return {
    getFreelancerPatients,
    getClinicPatients,
    getUserDetails,
    getPatientAppointmentHistory,
    getPatientPharmacies,
    getDoctorPatientDropdown,
  };
}
