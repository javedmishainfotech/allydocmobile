import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors SearchPharmaciesAction (module/Patient/Pages/Setting/action.js): the generic pharmacy
 * directory search, same endpoint the doctor panel uses. Empty params are left out. */
export async function searchPharmacies({ name, pageNumber, pageSize } = {}) {
  const params = {};
  if (name) params.Name = name;
  if (pageNumber) params.PageNumber = pageNumber;
  if (pageSize) params.PageSize = pageSize;
  try {
    const response = await apiClient.get('/api/Pharmacies/SearchPharmacies', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// The three "My*" endpoints resolve the DoseSpot patient id server-side from the signed-in
// patient's session, so none of them takes a patient id.

/** Mirrors GetMyPharmaciesAction. */
export async function getMyPharmacies() {
  try {
    const response = await apiClient.get('/api/Pharmacies/MyPharmacies');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors AddMyPharmacyAction: saves (or promotes / demotes) a pharmacy; `setAsDefault` also
 * makes it THE default pharmacy. */
export async function addMyPharmacy(pharmacyId, setAsDefault = false) {
  try {
    const response = await apiClient.post(`/api/Pharmacies/MyPharmacies/${pharmacyId}?setAsDefault=${setAsDefault}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors DeleteMyPharmacyAction: un-saves the pharmacy (it stays in the directory). */
export async function deleteMyPharmacy(pharmacyId) {
  try {
    const response = await apiClient.delete(`/api/Pharmacies/MyPharmacies/${pharmacyId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
