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

// Every field except patientId funnels through the backend's duplicate-patient-detection query
// shape (web ChangePatientSearchModal.jsx: `duplicateFields=FirstName,LastName&firstName=...`);
// patientId alone uses a direct `PatientId` param. Filter key names here are the exact camelCase
// query param names the backend expects (not just a naming convention - e.g. "dosespotId", one s).
const PATIENT_SEARCH_DUPLICATE_FIELD = {
  firstName: 'FirstName',
  middleName: 'MiddleName',
  lastName: 'LastName',
  dateOfBirth: 'DateOfBirth',
  dosespotId: 'DosespotId',
  phoneNumber: 'PhoneNumber',
  email: 'Email',
};

/** Mirrors PatientSearchAction: `GET /PatientSearch` - finds an existing clinic patient to
 * re-link an unmatched RxChange/Refill request to (see changeRxChangePatient/changeRefillPatient
 * below). Any combination of fields may be given; `patientId` alone searches by id directly,
 * everything else goes through the duplicate-detection query shape above. */
export async function searchPatients({
  firstName,
  middleName,
  lastName,
  dateOfBirth,
  dosespotId,
  phoneNumber,
  email,
  patientId,
  pageNumber = 1,
  pageSize = 20,
} = {}) {
  const params = { pageNumber, pageSize };
  const duplicateFields = [];
  const values = { firstName, middleName, lastName, dateOfBirth, dosespotId, phoneNumber, email };
  Object.entries(values).forEach(([key, value]) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return;
    duplicateFields.push(PATIENT_SEARCH_DUPLICATE_FIELD[key]);
    params[key] = trimmed;
  });
  if (duplicateFields.length) params.duplicateFields = duplicateFields.join(',');
  const trimmedPatientId = String(patientId ?? '').trim();
  if (trimmedPatientId) params.PatientId = trimmedPatientId;

  try {
    const response = await apiClient.get('/PatientSearch', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
