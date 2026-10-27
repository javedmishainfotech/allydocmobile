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

// Query-param names GET /GetListOfPatients expects (web CLINIC_LIST_FILTER_KEYS) for each filter field
// the shared patient filter modal produces.
const CLINIC_FILTER_PARAM = {
  firstName: 'Firstname',
  lastName: 'Lastname',
  dob: 'Dob',
  email: 'Email',
  gender: 'Gender',
  doseSpotId: 'DoseSpotID',
  phoneNumber: 'Phonenumber',
};

/**
 * Mirrors GetAllClinicPatientsAction in AllyDocReactApp's module/Doctor/Pages/Patients/action.js:
 * GET /GetListOfPatients - what hospital/clinic doctors (doctor sub, doctor admin, clinic
 * doctors) see. Takes the same filter object as getFreelancerPatients.
 */
export function getClinicPatients({ pageNumber = 1, pageSize = 10, filters = {} } = {}) {
  const params = { pageNumber, pageSize };
  Object.entries(CLINIC_FILTER_PARAM).forEach(([key, paramName]) => {
    const value = filters[key];
    if (value === undefined || value === null || String(value).trim() === '') return;
    params[paramName] = String(value).trim();
  });
  return callApi(() => apiClient.get('/GetListOfPatients', { params }));
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

/** Mirrors DoctorPatientDropdownAction: `GET /DoctorPatientDropdown` (no parameters) - the logged-in
 * doctor's patients as { id, name }, used by the filter modals of the appointment and
 * treatment-plan lists. */
export function getDoctorPatientDropdown() {
  return callApi(() => apiClient.get('/DoctorPatientDropdown'));
}
