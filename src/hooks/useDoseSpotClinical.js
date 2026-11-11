import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchPatientEligibilities,
  consentToMedicationHistory,
  fetchMedicationHistory,
  fetchSelfReportedMedications,
  fetchSelfReportedMedicationById,
  searchMedications,
  selectMedication,
  addCodedSelfReportedMedication,
  addFreetextSelfReportedMedication,
  addSimpleSelfReportedMedication,
  editCodedSelfReportedMedication,
  editFreetextSelfReportedMedication,
  editSimpleSelfReportedMedication,
  updateSelfReportedMedicationStatus,
  fetchPatientAllergies,
  searchAllergens,
  addCodedAllergy,
  addFreeTextAllergy,
  editPatientAllergy,
  addNoKnownAllergy,
  fetchPendingRxChangeRequests,
  fetchPendingRxChangeRequestsDetailed,
  approveRxChange,
  denyRxChange,
  fetchPharmacyById,
  fetchPendingRefillRequests,
  fetchPendingRefillRequestsDetailed,
  approveRefill,
  denyRefill,
} from '../store/slices/doseSpotClinicalSlice';

/** Thin unwrap-based wrapper around the dose-spot-clinical slice's thunks, one per
 * doseSpotClinicalService function, with the exact same call signature as before - see
 * doseSpotClinicalSlice.js for why these resolve with the full result envelope. */
export function useDoseSpotClinical() {
  const dispatch = useDispatch();

  const getPatientEligibilities = useCallback(
    (doseSpotPatientId) => dispatch(fetchPatientEligibilities(doseSpotPatientId)).unwrap(),
    [dispatch],
  );

  const consentMedicationHistory = useCallback(
    (doseSpotPatientId) => dispatch(consentToMedicationHistory(doseSpotPatientId)).unwrap(),
    [dispatch],
  );

  const getMedicationHistory = useCallback(
    (doseSpotPatientId, pageNumber = 1) =>
      dispatch(fetchMedicationHistory({ doseSpotPatientId, pageNumber })).unwrap(),
    [dispatch],
  );

  const getSelfReportedMedications = useCallback(
    (doseSpotPatientId, pageNumber = 1) =>
      dispatch(fetchSelfReportedMedications({ doseSpotPatientId, pageNumber })).unwrap(),
    [dispatch],
  );

  const getSelfReportedMedicationById = useCallback(
    (doseSpotPatientId, selfReportedMedicationId) =>
      dispatch(fetchSelfReportedMedicationById({ doseSpotPatientId, selfReportedMedicationId })).unwrap(),
    [dispatch],
  );

  const searchMedicationsFn = useCallback(
    (name, pageNumber = 1) => dispatch(searchMedications({ name, pageNumber })).unwrap(),
    [dispatch],
  );

  const selectMedicationFn = useCallback(
    (dispensableDrugId) => dispatch(selectMedication(dispensableDrugId)).unwrap(),
    [dispatch],
  );

  const addCodedSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, fields) =>
      dispatch(addCodedSelfReportedMedication({ doseSpotPatientId, fields })).unwrap(),
    [dispatch],
  );

  const addFreetextSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, fields) =>
      dispatch(addFreetextSelfReportedMedication({ doseSpotPatientId, fields })).unwrap(),
    [dispatch],
  );

  const addSimpleSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, fields) =>
      dispatch(addSimpleSelfReportedMedication({ doseSpotPatientId, fields })).unwrap(),
    [dispatch],
  );

  const editCodedSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, id, fields) =>
      dispatch(editCodedSelfReportedMedication({ doseSpotPatientId, id, fields })).unwrap(),
    [dispatch],
  );

  const editFreetextSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, id, fields) =>
      dispatch(editFreetextSelfReportedMedication({ doseSpotPatientId, id, fields })).unwrap(),
    [dispatch],
  );

  const editSimpleSelfReportedMedicationFn = useCallback(
    (doseSpotPatientId, id, fields) =>
      dispatch(editSimpleSelfReportedMedication({ doseSpotPatientId, id, fields })).unwrap(),
    [dispatch],
  );

  const updateSelfReportedMedicationStatusFn = useCallback(
    (doseSpotPatientId, id, fields) =>
      dispatch(updateSelfReportedMedicationStatus({ doseSpotPatientId, id, fields })).unwrap(),
    [dispatch],
  );

  const getPatientAllergies = useCallback(
    (doseSpotPatientId) => dispatch(fetchPatientAllergies(doseSpotPatientId)).unwrap(),
    [dispatch],
  );

  const searchAllergensFn = useCallback(
    (name, pageNumber = 1) => dispatch(searchAllergens({ name, pageNumber })).unwrap(),
    [dispatch],
  );

  const addCodedAllergyFn = useCallback(
    (doseSpotPatientId, fields) => dispatch(addCodedAllergy({ doseSpotPatientId, fields })).unwrap(),
    [dispatch],
  );

  const addFreeTextAllergyFn = useCallback(
    (doseSpotPatientId, fields) => dispatch(addFreeTextAllergy({ doseSpotPatientId, fields })).unwrap(),
    [dispatch],
  );

  const editPatientAllergyFn = useCallback(
    (doseSpotPatientId, patientAllergyId, fields) =>
      dispatch(editPatientAllergy({ doseSpotPatientId, patientAllergyId, fields })).unwrap(),
    [dispatch],
  );

  const addNoKnownAllergyFn = useCallback(
    (doseSpotPatientId) => dispatch(addNoKnownAllergy(doseSpotPatientId)).unwrap(),
    [dispatch],
  );

  const getPendingRxChangeRequests = useCallback(
    (params) => dispatch(fetchPendingRxChangeRequests(params)).unwrap(),
    [dispatch],
  );

  const getPendingRxChangeRequestsDetailed = useCallback(
    (params) => dispatch(fetchPendingRxChangeRequestsDetailed(params)).unwrap(),
    [dispatch],
  );

  const approveRxChangeFn = useCallback(
    (rxChangeId, payload) => dispatch(approveRxChange({ rxChangeId, payload })).unwrap(),
    [dispatch],
  );

  const denyRxChangeFn = useCallback(
    (rxChangeId, fields) => dispatch(denyRxChange({ rxChangeId, fields })).unwrap(),
    [dispatch],
  );

  const getPharmacyById = useCallback(
    (pharmacyId) => dispatch(fetchPharmacyById(pharmacyId)).unwrap(),
    [dispatch],
  );

  const getPendingRefillRequests = useCallback(
    (params) => dispatch(fetchPendingRefillRequests(params)).unwrap(),
    [dispatch],
  );

  const getPendingRefillRequestsDetailed = useCallback(
    (params) => dispatch(fetchPendingRefillRequestsDetailed(params)).unwrap(),
    [dispatch],
  );

  const approveRefillFn = useCallback(
    (refillId, fields) => dispatch(approveRefill({ refillId, fields })).unwrap(),
    [dispatch],
  );

  const denyRefillFn = useCallback(
    (refillId, fields) => dispatch(denyRefill({ refillId, fields })).unwrap(),
    [dispatch],
  );

  return {
    getPatientEligibilities,
    consentToMedicationHistory: consentMedicationHistory,
    getMedicationHistory,
    getSelfReportedMedications,
    getSelfReportedMedicationById,
    searchMedications: searchMedicationsFn,
    selectMedication: selectMedicationFn,
    addCodedSelfReportedMedication: addCodedSelfReportedMedicationFn,
    addFreetextSelfReportedMedication: addFreetextSelfReportedMedicationFn,
    addSimpleSelfReportedMedication: addSimpleSelfReportedMedicationFn,
    editCodedSelfReportedMedication: editCodedSelfReportedMedicationFn,
    editFreetextSelfReportedMedication: editFreetextSelfReportedMedicationFn,
    editSimpleSelfReportedMedication: editSimpleSelfReportedMedicationFn,
    updateSelfReportedMedicationStatus: updateSelfReportedMedicationStatusFn,
    getPatientAllergies,
    searchAllergens: searchAllergensFn,
    addCodedAllergy: addCodedAllergyFn,
    addFreeTextAllergy: addFreeTextAllergyFn,
    editPatientAllergy: editPatientAllergyFn,
    addNoKnownAllergy: addNoKnownAllergyFn,
    getPendingRxChangeRequests,
    getPendingRxChangeRequestsDetailed,
    approveRxChange: approveRxChangeFn,
    denyRxChange: denyRxChangeFn,
    getPharmacyById,
    getPendingRefillRequests,
    getPendingRefillRequestsDetailed,
    approveRefill: approveRefillFn,
    denyRefill: denyRefillFn,
  };
}
