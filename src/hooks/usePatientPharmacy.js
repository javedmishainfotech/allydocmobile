import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  searchPharmacies,
  fetchMyPharmacies,
  addMyPharmacy,
  deleteMyPharmacy,
} from '../store/slices/patientPharmacySlice';

/** Thin unwrap-based wrapper around the patient-pharmacy slice's thunks, with the exact same call
 * signature as before - see patientPharmacySlice.js for why these resolve with the full result
 * envelope. */
export function usePatientPharmacy() {
  const dispatch = useDispatch();

  const search = useCallback((params) => dispatch(searchPharmacies(params)).unwrap(), [dispatch]);

  const getMyPharmacies = useCallback(() => dispatch(fetchMyPharmacies()).unwrap(), [dispatch]);

  const addPharmacy = useCallback(
    (pharmacyId, setAsDefault = false) =>
      dispatch(addMyPharmacy({ pharmacyId, setAsDefault })).unwrap(),
    [dispatch],
  );

  const deletePharmacy = useCallback(
    (pharmacyId) => dispatch(deleteMyPharmacy(pharmacyId)).unwrap(),
    [dispatch],
  );

  return {
    searchPharmacies: search,
    getMyPharmacies,
    addMyPharmacy: addPharmacy,
    deleteMyPharmacy: deletePharmacy,
  };
}
