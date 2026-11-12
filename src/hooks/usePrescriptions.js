import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  addCodedPrescription,
  sendPrescriptions,
  deletePrescriptions,
  fetchPrescriptionById,
  cancelPrescription,
  editCodedPrescription,
  searchPharmaciesAdvanced,
  addPatientPharmacy,
  deletePatientPharmacy,
  fetchPatientPrescriptionsByStatus,
  searchSupplies,
  addSupplyPrescription,
  editSupplyPrescription,
  addSupplyFreeTextPrescription,
  editSupplyFreeTextPrescription,
  addCompiledCompoundPrescription,
  editCompiledCompoundPrescription,
  fetchPrescriptionBenefits,
  fetchClinicianFavorites,
  fetchClinicFavorites,
  createCodedFavorite,
  updateCodedFavorite,
  createSupplyFavorite,
  updateSupplyFavorite,
  createCompoundFavorite,
  updateCompoundFavorite,
  createClinicCodedFavorite,
  fetchPatientPrescriptions,
  fetchPrescriptionLog,
  fetchSupplyById,
  fetchEpcsSuggestions,
  postReadyToSign,
  sendEpcs,
  setPrintedPrescriptions,
} from '../store/slices/prescriptionSlice';

/** Thin unwrap-based wrapper around the prescription slice's thunks, one per prescriptionService
 * function, with the exact same call signature as before - see prescriptionSlice.js for why these
 * resolve with the full result envelope. */
export function usePrescriptions() {
  const dispatch = useDispatch();

  const addCoded = useCallback(
    (doseSpotPatientId, payload, appointmentId) =>
      dispatch(addCodedPrescription({ doseSpotPatientId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const send = useCallback(
    (doseSpotPatientId, params, appointmentId) =>
      dispatch(sendPrescriptions({ doseSpotPatientId, params, appointmentId })).unwrap(),
    [dispatch],
  );

  const deleteMany = useCallback(
    (doseSpotPatientId, prescriptionIds, appointmentId) =>
      dispatch(deletePrescriptions({ doseSpotPatientId, prescriptionIds, appointmentId })).unwrap(),
    [dispatch],
  );

  const getById = useCallback(
    (doseSpotPatientId, prescriptionId) =>
      dispatch(fetchPrescriptionById({ doseSpotPatientId, prescriptionId })).unwrap(),
    [dispatch],
  );

  const cancel = useCallback(
    (doseSpotPatientId, prescriptionId, comment, appointmentId) =>
      dispatch(cancelPrescription({ doseSpotPatientId, prescriptionId, comment, appointmentId })).unwrap(),
    [dispatch],
  );

  const editCoded = useCallback(
    (doseSpotPatientId, prescriptionId, payload, appointmentId) =>
      dispatch(editCodedPrescription({ doseSpotPatientId, prescriptionId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const searchPharmacies = useCallback(
    (params) => dispatch(searchPharmaciesAdvanced(params)).unwrap(),
    [dispatch],
  );

  const addPharmacy = useCallback(
    (doseSpotPatientId, pharmacyId, setAsPrimary = false) =>
      dispatch(addPatientPharmacy({ doseSpotPatientId, pharmacyId, setAsPrimary })).unwrap(),
    [dispatch],
  );

  const deletePharmacy = useCallback(
    (doseSpotPatientId, pharmacyId) =>
      dispatch(deletePatientPharmacy({ doseSpotPatientId, pharmacyId })).unwrap(),
    [dispatch],
  );

  const getPatientPrescriptionsByStatus = useCallback(
    (doseSpotPatientId, params) =>
      dispatch(fetchPatientPrescriptionsByStatus({ doseSpotPatientId, params })).unwrap(),
    [dispatch],
  );

  const searchSuppliesFn = useCallback(
    (name, pageNumber = 1) => dispatch(searchSupplies({ name, pageNumber })).unwrap(),
    [dispatch],
  );

  const addSupply = useCallback(
    (doseSpotPatientId, payload, appointmentId) =>
      dispatch(addSupplyPrescription({ doseSpotPatientId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const editSupply = useCallback(
    (doseSpotPatientId, prescriptionId, payload, appointmentId) =>
      dispatch(editSupplyPrescription({ doseSpotPatientId, prescriptionId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const addSupplyFreeText = useCallback(
    (doseSpotPatientId, payload, appointmentId) =>
      dispatch(addSupplyFreeTextPrescription({ doseSpotPatientId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const editSupplyFreeText = useCallback(
    (doseSpotPatientId, prescriptionId, payload, appointmentId) =>
      dispatch(
        editSupplyFreeTextPrescription({ doseSpotPatientId, prescriptionId, payload, appointmentId }),
      ).unwrap(),
    [dispatch],
  );

  const addCompiledCompound = useCallback(
    (doseSpotPatientId, payload, appointmentId) =>
      dispatch(addCompiledCompoundPrescription({ doseSpotPatientId, payload, appointmentId })).unwrap(),
    [dispatch],
  );

  const editCompiledCompound = useCallback(
    (doseSpotPatientId, prescriptionId, payload, appointmentId) =>
      dispatch(
        editCompiledCompoundPrescription({ doseSpotPatientId, prescriptionId, payload, appointmentId }),
      ).unwrap(),
    [dispatch],
  );

  const getPrescriptionBenefits = useCallback(
    (params) => dispatch(fetchPrescriptionBenefits(params)).unwrap(),
    [dispatch],
  );

  const getClinicianFavorites = useCallback(
    (clinicianId, params) => dispatch(fetchClinicianFavorites({ clinicianId, params })).unwrap(),
    [dispatch],
  );

  const getClinicFavorites = useCallback(
    (clinicId, params) => dispatch(fetchClinicFavorites({ clinicId, params })).unwrap(),
    [dispatch],
  );

  const createCoded = useCallback(
    (payload) => dispatch(createCodedFavorite(payload)).unwrap(),
    [dispatch],
  );

  const updateCoded = useCallback(
    (scope, id, favoriteId, payload) =>
      dispatch(updateCodedFavorite({ scope, id, favoriteId, payload })).unwrap(),
    [dispatch],
  );

  const createSupply = useCallback(
    (scope, id, payload) => dispatch(createSupplyFavorite({ scope, id, payload })).unwrap(),
    [dispatch],
  );

  const updateSupply = useCallback(
    (scope, id, favoriteId, payload) =>
      dispatch(updateSupplyFavorite({ scope, id, favoriteId, payload })).unwrap(),
    [dispatch],
  );

  const createCompound = useCallback(
    (scope, id, payload) => dispatch(createCompoundFavorite({ scope, id, payload })).unwrap(),
    [dispatch],
  );

  const updateCompound = useCallback(
    (scope, id, favoriteId, payload) =>
      dispatch(updateCompoundFavorite({ scope, id, favoriteId, payload })).unwrap(),
    [dispatch],
  );

  const createClinicCoded = useCallback(
    (clinicId, payload) => dispatch(createClinicCodedFavorite({ clinicId, payload })).unwrap(),
    [dispatch],
  );

  const getPatientPrescriptionsFn = useCallback(
    (doseSpotPatientId, pageNumber = 1) =>
      dispatch(fetchPatientPrescriptions({ doseSpotPatientId, pageNumber })).unwrap(),
    [dispatch],
  );

  const getPrescriptionLog = useCallback(
    (doseSpotPatientId, prescriptionId) =>
      dispatch(fetchPrescriptionLog({ doseSpotPatientId, prescriptionId })).unwrap(),
    [dispatch],
  );

  const getSupplyById = useCallback((supplyId) => dispatch(fetchSupplyById(supplyId)).unwrap(), [dispatch]);

  const getEpcsSuggestions = useCallback(
    (doseSpotPatientId, prescriptionId) =>
      dispatch(fetchEpcsSuggestions({ doseSpotPatientId, prescriptionId })).unwrap(),
    [dispatch],
  );

  const readyToSign = useCallback(
    (doseSpotPatientId, params) => dispatch(postReadyToSign({ doseSpotPatientId, params })).unwrap(),
    [dispatch],
  );

  const sendEpcsFn = useCallback(
    (doseSpotPatientId, params) => dispatch(sendEpcs({ doseSpotPatientId, params })).unwrap(),
    [dispatch],
  );

  const setPrinted = useCallback(
    (doseSpotPatientId, params) =>
      dispatch(setPrintedPrescriptions({ doseSpotPatientId, params })).unwrap(),
    [dispatch],
  );

  return {
    addCodedPrescription: addCoded,
    sendPrescriptions: send,
    deletePrescriptions: deleteMany,
    getPrescriptionById: getById,
    cancelPrescription: cancel,
    editCodedPrescription: editCoded,
    searchPharmaciesAdvanced: searchPharmacies,
    addPatientPharmacy: addPharmacy,
    deletePatientPharmacy: deletePharmacy,
    getPatientPrescriptionsByStatus,
    searchSupplies: searchSuppliesFn,
    addSupplyPrescription: addSupply,
    editSupplyPrescription: editSupply,
    addSupplyFreeTextPrescription: addSupplyFreeText,
    editSupplyFreeTextPrescription: editSupplyFreeText,
    addCompiledCompoundPrescription: addCompiledCompound,
    editCompiledCompoundPrescription: editCompiledCompound,
    getPrescriptionBenefits,
    getClinicianFavorites,
    getClinicFavorites,
    createCodedFavorite: createCoded,
    updateCodedFavorite: updateCoded,
    createSupplyFavorite: createSupply,
    updateSupplyFavorite: updateSupply,
    createCompoundFavorite: createCompound,
    updateCompoundFavorite: updateCompound,
    createClinicCodedFavorite: createClinicCoded,
    getPatientPrescriptions: getPatientPrescriptionsFn,
    getPrescriptionLog,
    getSupplyById,
    getEpcsSuggestions,
    postReadyToSign: readyToSign,
    sendEpcs: sendEpcsFn,
    setPrintedPrescriptions: setPrinted,
  };
}
