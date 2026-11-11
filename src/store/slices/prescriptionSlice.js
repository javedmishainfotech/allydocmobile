import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as prescriptionService from '../../services/prescriptionService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message`/`result.raw` directly, so these thunks always fulfill with
 * the full raw result object. `FAVORITE_TYPE` and `favoritesBasePath` aren't API calls - not
 * ported here (the former is re-exported as-is where needed, the latter is private to the
 * service). */
const initialState = {};

export const addCodedPrescription = createAsyncThunk(
  'prescription/addCodedPrescription',
  ({ doseSpotPatientId, payload, appointmentId }) =>
    prescriptionService.addCodedPrescription(doseSpotPatientId, payload, appointmentId),
);

export const sendPrescriptions = createAsyncThunk(
  'prescription/sendPrescriptions',
  ({ doseSpotPatientId, params, appointmentId }) =>
    prescriptionService.sendPrescriptions(doseSpotPatientId, params, appointmentId),
);

export const deletePrescriptions = createAsyncThunk(
  'prescription/deletePrescriptions',
  ({ doseSpotPatientId, prescriptionIds, appointmentId }) =>
    prescriptionService.deletePrescriptions(doseSpotPatientId, prescriptionIds, appointmentId),
);

export const fetchPrescriptionById = createAsyncThunk(
  'prescription/fetchPrescriptionById',
  ({ doseSpotPatientId, prescriptionId }) =>
    prescriptionService.getPrescriptionById(doseSpotPatientId, prescriptionId),
);

export const cancelPrescription = createAsyncThunk(
  'prescription/cancelPrescription',
  ({ doseSpotPatientId, prescriptionId, comment, appointmentId }) =>
    prescriptionService.cancelPrescription(doseSpotPatientId, prescriptionId, comment, appointmentId),
);

export const editCodedPrescription = createAsyncThunk(
  'prescription/editCodedPrescription',
  ({ doseSpotPatientId, prescriptionId, payload, appointmentId }) =>
    prescriptionService.editCodedPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId),
);

export const searchPharmaciesAdvanced = createAsyncThunk(
  'prescription/searchPharmaciesAdvanced',
  (params) => prescriptionService.searchPharmaciesAdvanced(params),
);

export const addPatientPharmacy = createAsyncThunk(
  'prescription/addPatientPharmacy',
  ({ doseSpotPatientId, pharmacyId, setAsPrimary }) =>
    prescriptionService.addPatientPharmacy(doseSpotPatientId, pharmacyId, setAsPrimary),
);

export const deletePatientPharmacy = createAsyncThunk(
  'prescription/deletePatientPharmacy',
  ({ doseSpotPatientId, pharmacyId }) =>
    prescriptionService.deletePatientPharmacy(doseSpotPatientId, pharmacyId),
);

export const fetchPatientPrescriptionsByStatus = createAsyncThunk(
  'prescription/fetchPatientPrescriptionsByStatus',
  ({ doseSpotPatientId, params }) =>
    prescriptionService.getPatientPrescriptionsByStatus(doseSpotPatientId, params),
);

export const searchSupplies = createAsyncThunk(
  'prescription/searchSupplies',
  ({ name, pageNumber }) => prescriptionService.searchSupplies(name, pageNumber),
);

export const addSupplyPrescription = createAsyncThunk(
  'prescription/addSupplyPrescription',
  ({ doseSpotPatientId, payload, appointmentId }) =>
    prescriptionService.addSupplyPrescription(doseSpotPatientId, payload, appointmentId),
);

export const editSupplyPrescription = createAsyncThunk(
  'prescription/editSupplyPrescription',
  ({ doseSpotPatientId, prescriptionId, payload, appointmentId }) =>
    prescriptionService.editSupplyPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId),
);

export const addSupplyFreeTextPrescription = createAsyncThunk(
  'prescription/addSupplyFreeTextPrescription',
  ({ doseSpotPatientId, payload, appointmentId }) =>
    prescriptionService.addSupplyFreeTextPrescription(doseSpotPatientId, payload, appointmentId),
);

export const editSupplyFreeTextPrescription = createAsyncThunk(
  'prescription/editSupplyFreeTextPrescription',
  ({ doseSpotPatientId, prescriptionId, payload, appointmentId }) =>
    prescriptionService.editSupplyFreeTextPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId),
);

export const addCompiledCompoundPrescription = createAsyncThunk(
  'prescription/addCompiledCompoundPrescription',
  ({ doseSpotPatientId, payload, appointmentId }) =>
    prescriptionService.addCompiledCompoundPrescription(doseSpotPatientId, payload, appointmentId),
);

export const editCompiledCompoundPrescription = createAsyncThunk(
  'prescription/editCompiledCompoundPrescription',
  ({ doseSpotPatientId, prescriptionId, payload, appointmentId }) =>
    prescriptionService.editCompiledCompoundPrescription(doseSpotPatientId, prescriptionId, payload, appointmentId),
);

export const fetchPrescriptionBenefits = createAsyncThunk(
  'prescription/fetchPrescriptionBenefits',
  (params) => prescriptionService.getPrescriptionBenefits(params),
);

export const fetchClinicianFavorites = createAsyncThunk(
  'prescription/fetchClinicianFavorites',
  ({ clinicianId, params }) => prescriptionService.getClinicianFavorites(clinicianId, params),
);

export const fetchClinicFavorites = createAsyncThunk(
  'prescription/fetchClinicFavorites',
  ({ clinicId, params }) => prescriptionService.getClinicFavorites(clinicId, params),
);

export const createCodedFavorite = createAsyncThunk(
  'prescription/createCodedFavorite',
  (payload) => prescriptionService.createCodedFavorite(payload),
);

export const updateCodedFavorite = createAsyncThunk(
  'prescription/updateCodedFavorite',
  ({ scope, id, favoriteId, payload }) =>
    prescriptionService.updateCodedFavorite(scope, id, favoriteId, payload),
);

export const createSupplyFavorite = createAsyncThunk(
  'prescription/createSupplyFavorite',
  ({ scope, id, payload }) => prescriptionService.createSupplyFavorite(scope, id, payload),
);

export const updateSupplyFavorite = createAsyncThunk(
  'prescription/updateSupplyFavorite',
  ({ scope, id, favoriteId, payload }) =>
    prescriptionService.updateSupplyFavorite(scope, id, favoriteId, payload),
);

export const createCompoundFavorite = createAsyncThunk(
  'prescription/createCompoundFavorite',
  ({ scope, id, payload }) => prescriptionService.createCompoundFavorite(scope, id, payload),
);

export const updateCompoundFavorite = createAsyncThunk(
  'prescription/updateCompoundFavorite',
  ({ scope, id, favoriteId, payload }) =>
    prescriptionService.updateCompoundFavorite(scope, id, favoriteId, payload),
);

export const createClinicCodedFavorite = createAsyncThunk(
  'prescription/createClinicCodedFavorite',
  ({ clinicId, payload }) => prescriptionService.createClinicCodedFavorite(clinicId, payload),
);

export const fetchPatientPrescriptions = createAsyncThunk(
  'prescription/fetchPatientPrescriptions',
  ({ doseSpotPatientId, pageNumber }) =>
    prescriptionService.getPatientPrescriptions(doseSpotPatientId, pageNumber),
);

export const fetchPrescriptionLog = createAsyncThunk(
  'prescription/fetchPrescriptionLog',
  ({ doseSpotPatientId, prescriptionId }) =>
    prescriptionService.getPrescriptionLog(doseSpotPatientId, prescriptionId),
);

export const fetchEpcsSuggestions = createAsyncThunk(
  'prescription/fetchEpcsSuggestions',
  ({ doseSpotPatientId, prescriptionId }) =>
    prescriptionService.getEpcsSuggestions(doseSpotPatientId, prescriptionId),
);

export const postReadyToSign = createAsyncThunk(
  'prescription/postReadyToSign',
  ({ doseSpotPatientId, params }) => prescriptionService.postReadyToSign(doseSpotPatientId, params),
);

export const sendEpcs = createAsyncThunk(
  'prescription/sendEpcs',
  ({ doseSpotPatientId, params }) => prescriptionService.sendEpcs(doseSpotPatientId, params),
);

export const setPrintedPrescriptions = createAsyncThunk(
  'prescription/setPrintedPrescriptions',
  ({ doseSpotPatientId, params }) => prescriptionService.setPrintedPrescriptions(doseSpotPatientId, params),
);

const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState,
  reducers: {},
});

export default prescriptionSlice.reducer;
