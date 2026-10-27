import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors SearchPharmaciesAction (module/Patient/Pages/Setting/action.js): the generic pharmacy
 * directory search, same endpoint the doctor panel uses. Empty params are left out. */
export function searchPharmacies({ name, pageNumber, pageSize } = {}) {
  const params = {};
  if (name) params.Name = name;
  if (pageNumber) params.PageNumber = pageNumber;
  if (pageSize) params.PageSize = pageSize;
  return callApi(() => apiClient.get('/api/Pharmacies/SearchPharmacies', { params }));
}

// The three "My*" endpoints resolve the DoseSpot patient id server-side from the signed-in
// patient's session, so none of them takes a patient id.

/** Mirrors GetMyPharmaciesAction. */
export function getMyPharmacies() {
  return callApi(() => apiClient.get('/api/Pharmacies/MyPharmacies'));
}

/** Mirrors AddMyPharmacyAction: saves (or promotes / demotes) a pharmacy; `setAsDefault` also
 * makes it THE default pharmacy. */
export function addMyPharmacy(pharmacyId, setAsDefault = false) {
  return callApi(() => apiClient.post(`/api/Pharmacies/MyPharmacies/${pharmacyId}?setAsDefault=${setAsDefault}`));
}

/** Mirrors DeleteMyPharmacyAction: un-saves the pharmacy (it stays in the directory). */
export function deleteMyPharmacy(pharmacyId) {
  return callApi(() => apiClient.delete(`/api/Pharmacies/MyPharmacies/${pharmacyId}`));
}
