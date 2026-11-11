import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchUserDetails,
  fetchAssignedDiseases,
  assignDiseases,
  searchPatients,
  mergePatients,
  fetchDailyAvailableHours,
  fetchDuration,
  fetchDoctorTimeZone,
  fetchTimeZones,
  saveWeeklySchedule,
  changePassword,
  fetchCertificates,
  addCertificate,
  removeCertificate,
  resetPin,
  setPin,
  updateDoseSpotStatus,
  requestTfaDeactivation,
  tfaDeactivate,
} from '../store/slices/settingsSlice';

/** Thin unwrap-based wrapper around the settings slice's thunks, one per settingsService
 * function, with the exact same call signature as before - see settingsSlice.js for why these
 * resolve with the full result envelope. */
export function useSettings() {
  const dispatch = useDispatch();

  const getUserDetails = useCallback(
    (userId) => dispatch(fetchUserDetails(userId)).unwrap(),
    [dispatch],
  );

  const getAssignedDiseases = useCallback(
    (clinicCode) => dispatch(fetchAssignedDiseases(clinicCode)).unwrap(),
    [dispatch],
  );

  const assignDiseasesFn = useCallback(
    (params) => dispatch(assignDiseases(params)).unwrap(),
    [dispatch],
  );

  const searchPatientsFn = useCallback(
    (params) => dispatch(searchPatients(params)).unwrap(),
    [dispatch],
  );

  const mergePatientsFn = useCallback(
    (params) => dispatch(mergePatients(params)).unwrap(),
    [dispatch],
  );

  const getDailyAvailableHours = useCallback(
    (doctorId) => dispatch(fetchDailyAvailableHours(doctorId)).unwrap(),
    [dispatch],
  );

  const getDuration = useCallback(
    (userId) => dispatch(fetchDuration(userId)).unwrap(),
    [dispatch],
  );

  const getDoctorTimeZone = useCallback(
    (userId) => dispatch(fetchDoctorTimeZone(userId)).unwrap(),
    [dispatch],
  );

  const getTimeZones = useCallback(() => dispatch(fetchTimeZones()).unwrap(), [dispatch]);

  const saveWeeklyScheduleFn = useCallback(
    (values) => dispatch(saveWeeklySchedule(values)).unwrap(),
    [dispatch],
  );

  const changePasswordFn = useCallback(
    (params) => dispatch(changePassword(params)).unwrap(),
    [dispatch],
  );

  const getCertificates = useCallback(
    (doctorId) => dispatch(fetchCertificates(doctorId)).unwrap(),
    [dispatch],
  );

  const addCertificateFn = useCallback(
    (params) => dispatch(addCertificate(params)).unwrap(),
    [dispatch],
  );

  const removeCertificateFn = useCallback(
    (documentId) => dispatch(removeCertificate(documentId)).unwrap(),
    [dispatch],
  );

  const resetPinFn = useCallback(() => dispatch(resetPin()).unwrap(), [dispatch]);

  const setPinFn = useCallback((pin) => dispatch(setPin(pin)).unwrap(), [dispatch]);

  const updateDoseSpotStatusFn = useCallback(
    (params) => dispatch(updateDoseSpotStatus(params)).unwrap(),
    [dispatch],
  );

  const requestTfaDeactivationFn = useCallback(
    () => dispatch(requestTfaDeactivation()).unwrap(),
    [dispatch],
  );

  const tfaDeactivateFn = useCallback(
    (params) => dispatch(tfaDeactivate(params)).unwrap(),
    [dispatch],
  );

  return {
    getUserDetails,
    getAssignedDiseases,
    assignDiseases: assignDiseasesFn,
    searchPatients: searchPatientsFn,
    mergePatients: mergePatientsFn,
    getDailyAvailableHours,
    getDuration,
    getDoctorTimeZone,
    getTimeZones,
    saveWeeklySchedule: saveWeeklyScheduleFn,
    changePassword: changePasswordFn,
    getCertificates,
    addCertificate: addCertificateFn,
    removeCertificate: removeCertificateFn,
    resetPin: resetPinFn,
    setPin: setPinFn,
    updateDoseSpotStatus: updateDoseSpotStatusFn,
    requestTfaDeactivation: requestTfaDeactivationFn,
    tfaDeactivate: tfaDeactivateFn,
  };
}
