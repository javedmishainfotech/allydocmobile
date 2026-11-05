import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors AppointmentDetailsAction in AllyDocReactApp/src/module/Doctor/Pages/DoctorAppointments/action.js. */
export async function getAppointmentDetails(appointmentId) {
  try {
    const response = await apiClient.get(`/AppointmentDetails?AppointmentId=${appointmentId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPatientAllergiesAction in AllyDocReactApp/src/module/Doctor/Pages/Patients/action.js.
 * Keyed by the DoseSpot patient id (details.doseSpotId), not the internal AllyDoc user id. */
export async function getPatientAllergies(doseSpotPatientId) {
  try {
    const response = await apiClient.get(`/api/Allergies/${doseSpotPatientId}/allergies`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
