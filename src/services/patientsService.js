import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/**
 * Mirrors GetFreelancerDoctorPatientsAction in AllyDocReactApp's
 * src/module/Doctor/Pages/DoctorPatients/action.js - server-paginated list,
 * filterable by firstName/lastName/dob/email/gender/doseSpotId/phoneNumber.
 */
export function getFreelancerPatients({ pageNumber = 1, pageSize = 10, filters = {} } = {}) {
  const params = new URLSearchParams();
  params.append('pageNumber', String(pageNumber));
  params.append('pageSize', String(pageSize));
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'gender' && String(value).toLowerCase() === 'both') return;
    params.append(key, String(value));
  });
  return callApi(() => apiClient.get(`/FreelancerDoctorPatients?${params.toString()}`));
}

/** Mirrors GetUserDetailsAction (same endpoint ProfileTab/Settings already uses). */
export function getUserDetails(userId) {
  return callApi(() => apiClient.get(`/UserDetails?userid=${userId}`));
}

/** Mirrors PatientAppointmentHistory in AllyDocReactApp's ViewPatientPage.jsx. */
export function getPatientAppointmentHistory(patientId) {
  return callApi(() => apiClient.get(`/HistoryAppointmentPatient?PatientId=${patientId}`));
}

/** Mirrors GetPatientPharmaciesAction - keyed by DoseSpot patient id, not userId. */
export function getPatientPharmacies(doseSpotPatientId) {
  return callApi(() => apiClient.get(`/api/Pharmacies/GetPatientPharmacies/${doseSpotPatientId}`));
}
