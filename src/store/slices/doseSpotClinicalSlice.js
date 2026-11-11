import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as doseSpotClinicalService from '../../services/doseSpotClinicalService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. One thunk per doseSpotClinicalService function, same grouping/order as the
 * service file. */
const initialState = {};

// ---- Coverage / Eligibilities ----
export const fetchPatientEligibilities = createAsyncThunk(
  'doseSpotClinical/fetchPatientEligibilities',
  (doseSpotPatientId) => doseSpotClinicalService.getPatientEligibilities(doseSpotPatientId),
);

// ---- Medication History ----
export const consentToMedicationHistory = createAsyncThunk(
  'doseSpotClinical/consentToMedicationHistory',
  (doseSpotPatientId) => doseSpotClinicalService.consentToMedicationHistory(doseSpotPatientId),
);

export const fetchMedicationHistory = createAsyncThunk(
  'doseSpotClinical/fetchMedicationHistory',
  ({ doseSpotPatientId, pageNumber }) => doseSpotClinicalService.getMedicationHistory(doseSpotPatientId, pageNumber),
);

// ---- Self Reported Medications ----
export const fetchSelfReportedMedications = createAsyncThunk(
  'doseSpotClinical/fetchSelfReportedMedications',
  ({ doseSpotPatientId, pageNumber }) =>
    doseSpotClinicalService.getSelfReportedMedications(doseSpotPatientId, pageNumber),
);

export const fetchSelfReportedMedicationById = createAsyncThunk(
  'doseSpotClinical/fetchSelfReportedMedicationById',
  ({ doseSpotPatientId, selfReportedMedicationId }) =>
    doseSpotClinicalService.getSelfReportedMedicationById(doseSpotPatientId, selfReportedMedicationId),
);

export const searchMedications = createAsyncThunk(
  'doseSpotClinical/searchMedications',
  ({ name, pageNumber }) => doseSpotClinicalService.searchMedications(name, pageNumber),
);

export const selectMedication = createAsyncThunk(
  'doseSpotClinical/selectMedication',
  (dispensableDrugId) => doseSpotClinicalService.selectMedication(dispensableDrugId),
);

export const addCodedSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/addCodedSelfReportedMedication',
  ({ doseSpotPatientId, fields }) =>
    doseSpotClinicalService.addCodedSelfReportedMedication(doseSpotPatientId, fields),
);

export const addFreetextSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/addFreetextSelfReportedMedication',
  ({ doseSpotPatientId, fields }) =>
    doseSpotClinicalService.addFreetextSelfReportedMedication(doseSpotPatientId, fields),
);

export const addSimpleSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/addSimpleSelfReportedMedication',
  ({ doseSpotPatientId, fields }) =>
    doseSpotClinicalService.addSimpleSelfReportedMedication(doseSpotPatientId, fields),
);

export const editCodedSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/editCodedSelfReportedMedication',
  ({ doseSpotPatientId, id, fields }) =>
    doseSpotClinicalService.editCodedSelfReportedMedication(doseSpotPatientId, id, fields),
);

export const editFreetextSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/editFreetextSelfReportedMedication',
  ({ doseSpotPatientId, id, fields }) =>
    doseSpotClinicalService.editFreetextSelfReportedMedication(doseSpotPatientId, id, fields),
);

export const editSimpleSelfReportedMedication = createAsyncThunk(
  'doseSpotClinical/editSimpleSelfReportedMedication',
  ({ doseSpotPatientId, id, fields }) =>
    doseSpotClinicalService.editSimpleSelfReportedMedication(doseSpotPatientId, id, fields),
);

export const updateSelfReportedMedicationStatus = createAsyncThunk(
  'doseSpotClinical/updateSelfReportedMedicationStatus',
  ({ doseSpotPatientId, id, fields }) =>
    doseSpotClinicalService.updateSelfReportedMedicationStatus(doseSpotPatientId, id, fields),
);

// ---- Allergies ----
export const fetchPatientAllergies = createAsyncThunk(
  'doseSpotClinical/fetchPatientAllergies',
  (doseSpotPatientId) => doseSpotClinicalService.getPatientAllergies(doseSpotPatientId),
);

export const searchAllergens = createAsyncThunk(
  'doseSpotClinical/searchAllergens',
  ({ name, pageNumber }) => doseSpotClinicalService.searchAllergens(name, pageNumber),
);

export const addCodedAllergy = createAsyncThunk(
  'doseSpotClinical/addCodedAllergy',
  ({ doseSpotPatientId, fields }) => doseSpotClinicalService.addCodedAllergy(doseSpotPatientId, fields),
);

export const addFreeTextAllergy = createAsyncThunk(
  'doseSpotClinical/addFreeTextAllergy',
  ({ doseSpotPatientId, fields }) => doseSpotClinicalService.addFreeTextAllergy(doseSpotPatientId, fields),
);

export const editPatientAllergy = createAsyncThunk(
  'doseSpotClinical/editPatientAllergy',
  ({ doseSpotPatientId, patientAllergyId, fields }) =>
    doseSpotClinicalService.editPatientAllergy(doseSpotPatientId, patientAllergyId, fields),
);

export const addNoKnownAllergy = createAsyncThunk(
  'doseSpotClinical/addNoKnownAllergy',
  (doseSpotPatientId) => doseSpotClinicalService.addNoKnownAllergy(doseSpotPatientId),
);

// ---- RxChange Requests ----
export const fetchPendingRxChangeRequests = createAsyncThunk(
  'doseSpotClinical/fetchPendingRxChangeRequests',
  (params) => doseSpotClinicalService.getPendingRxChangeRequests(params),
);

export const fetchPendingRxChangeRequestsDetailed = createAsyncThunk(
  'doseSpotClinical/fetchPendingRxChangeRequestsDetailed',
  (params) => doseSpotClinicalService.getPendingRxChangeRequestsDetailed(params),
);

export const approveRxChange = createAsyncThunk(
  'doseSpotClinical/approveRxChange',
  ({ rxChangeId, payload }) => doseSpotClinicalService.approveRxChange(rxChangeId, payload),
);

export const denyRxChange = createAsyncThunk(
  'doseSpotClinical/denyRxChange',
  ({ rxChangeId, fields }) => doseSpotClinicalService.denyRxChange(rxChangeId, fields),
);

export const fetchPharmacyById = createAsyncThunk(
  'doseSpotClinical/fetchPharmacyById',
  (pharmacyId) => doseSpotClinicalService.getPharmacyById(pharmacyId),
);

// ---- Refill Requests ----
export const fetchPendingRefillRequests = createAsyncThunk(
  'doseSpotClinical/fetchPendingRefillRequests',
  (params) => doseSpotClinicalService.getPendingRefillRequests(params),
);

export const fetchPendingRefillRequestsDetailed = createAsyncThunk(
  'doseSpotClinical/fetchPendingRefillRequestsDetailed',
  (params) => doseSpotClinicalService.getPendingRefillRequestsDetailed(params),
);

export const approveRefill = createAsyncThunk(
  'doseSpotClinical/approveRefill',
  ({ refillId, fields }) => doseSpotClinicalService.approveRefill(refillId, fields),
);

export const denyRefill = createAsyncThunk(
  'doseSpotClinical/denyRefill',
  ({ refillId, fields }) => doseSpotClinicalService.denyRefill(refillId, fields),
);

const doseSpotClinicalSlice = createSlice({
  name: 'doseSpotClinical',
  initialState,
  reducers: {},
});

export default doseSpotClinicalSlice.reducer;
