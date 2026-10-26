import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors AppointmentDetailsAction in AllyDocReactApp/src/module/Doctor/Pages/DoctorAppointments/action.js. */
export function getAppointmentDetails(appointmentId) {
  return callApi(() => apiClient.get(`/AppointmentDetails?AppointmentId=${appointmentId}`));
}

/** Mirrors GetPatientAllergiesAction in AllyDocReactApp/src/module/Doctor/Pages/Patients/action.js.
 * Keyed by the DoseSpot patient id (details.doseSpotId), not the internal AllyDoc user id. */
export function getPatientAllergies(doseSpotPatientId) {
  return callApi(() => apiClient.get(`/api/Allergies/${doseSpotPatientId}/allergies`));
}
