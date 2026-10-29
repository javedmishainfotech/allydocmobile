import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetListOfDoctorsAction in AllyDocReactApp/.../Doctors/action.js (Clinic/Hospital
 * admin's "Doctors" list - sub-doctors in the clinic). */
export function getListOfDoctors({ pageNumber = 1, pageSize = 20, filters = {} } = {}) {
  const params = { PageNumber: pageNumber, PageSize: pageSize };
  if (filters.firstname) params.Firstname = filters.firstname;
  if (filters.lastname) params.Lastname = filters.lastname;
  if (filters.dob) params.Dob = filters.dob;
  if (filters.email) params.Email = filters.email;
  if (filters.gender && filters.gender !== 'both') params.Gender = filters.gender;
  if (filters.doseSpotId) params.DoseSpotID = filters.doseSpotId;
  if (filters.phoneNumber) params.Phonenumber = filters.phoneNumber;
  return callApi(() => apiClient.get('/GetListOfDoctors', { params }));
}

/** Mirrors GetDoctorTreatmentPlansActions - a clinic admin's view of one doctor's
 * in-progress/completed treatment plans. */
export function getDoctorTreatmentPlans(doctorId) {
  return callApi(() => apiClient.get(`/GetDoctorTreatmentPlans?DoctorId=${doctorId}`));
}

/** Mirrors the Feedback module's action.js - one doctor's rated appointments. */
export function getDoctorFeedbackAppointments(doctorId) {
  return callApi(() => apiClient.get(`/GetDoctorFeedbackAppointments/${doctorId}`));
}
