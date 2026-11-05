import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetListOfDoctorsAction in AllyDocReactApp/.../Doctors/action.js (Clinic/Hospital
 * admin's "Doctors" list - sub-doctors in the clinic). */
export async function getListOfDoctors({ pageNumber = 1, pageSize = 20, filters = {} } = {}) {
  const params = { PageNumber: pageNumber, PageSize: pageSize };
  if (filters.firstname) params.Firstname = filters.firstname;
  if (filters.lastname) params.Lastname = filters.lastname;
  if (filters.dob) params.Dob = filters.dob;
  if (filters.email) params.Email = filters.email;
  if (filters.gender && filters.gender !== 'both') params.Gender = filters.gender;
  if (filters.doseSpotId) params.DoseSpotID = filters.doseSpotId;
  if (filters.phoneNumber) params.Phonenumber = filters.phoneNumber;
  try {
    const response = await apiClient.get('/GetListOfDoctors', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetDoctorTreatmentPlansActions - a clinic admin's view of one doctor's
 * in-progress/completed treatment plans. */
export async function getDoctorTreatmentPlans(doctorId) {
  try {
    const response = await apiClient.get(`/GetDoctorTreatmentPlans?DoctorId=${doctorId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors the Feedback module's action.js - one doctor's rated appointments. */
export async function getDoctorFeedbackAppointments(doctorId) {
  try {
    const response = await apiClient.get(`/GetDoctorFeedbackAppointments/${doctorId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
