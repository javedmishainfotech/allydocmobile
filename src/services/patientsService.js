import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/**
 * Mirrors GetFreelancerDoctorPatientsAction in AllyDocReactApp's
 * src/module/Doctor/Pages/DoctorPatients/action.js - server-paginated list,
 * filterable by firstName/lastName/dob/email/gender/doseSpotId/phoneNumber.
 */
export async function getFreelancerPatients({ pageNumber = 1, pageSize = 10, filters = {} } = {}) {
  const params = new URLSearchParams();
  params.append('pageNumber', String(pageNumber));
  params.append('pageSize', String(pageSize));
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'gender' && String(value).toLowerCase() === 'both') return;
    params.append(key, String(value));
  });
  try {
    const response = await apiClient.get(`/FreelancerDoctorPatients?${params.toString()}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
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
export async function getClinicPatients({ pageNumber = 1, pageSize = 10, filters = {} } = {}) {
  const params = { pageNumber, pageSize };
  Object.entries(CLINIC_FILTER_PARAM).forEach(([key, paramName]) => {
    const value = filters[key];
    if (value === undefined || value === null || String(value).trim() === '') return;
    params[paramName] = String(value).trim();
  });
  try {
    const response = await apiClient.get('/GetListOfPatients', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetUserDetailsAction (same endpoint ProfileTab/Settings already uses). */
export async function getUserDetails(userId) {
  try {
    const response = await apiClient.get(`/UserDetails?userid=${userId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors PatientAppointmentHistory in AllyDocReactApp's ViewPatientPage.jsx. */
export async function getPatientAppointmentHistory(patientId) {
  try {
    const response = await apiClient.get(`/HistoryAppointmentPatient?PatientId=${patientId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPatientPharmaciesAction - keyed by DoseSpot patient id, not userId. */
export async function getPatientPharmacies(doseSpotPatientId) {
  try {
    const response = await apiClient.get(`/api/Pharmacies/GetPatientPharmacies/${doseSpotPatientId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DoctorPatientDropdownAction: `GET /DoctorPatientDropdown` (no parameters) - the logged-in
 * doctor's patients as { id, name }, used by the filter modals of the appointment and
 * treatment-plan lists. */
export async function getDoctorPatientDropdown() {
  try {
    const response = await apiClient.get('/DoctorPatientDropdown');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
