import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as patientPharmacyService from '../../services/patientPharmacyService';

/** Same thin, unwrap-only shape as the other recent slices - the single consumer already branches
 * on `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const searchPharmacies = createAsyncThunk('patientPharmacy/searchPharmacies', (params) =>
  patientPharmacyService.searchPharmacies(params),
);

export const fetchMyPharmacies = createAsyncThunk('patientPharmacy/fetchMyPharmacies', () =>
  patientPharmacyService.getMyPharmacies(),
);

export const addMyPharmacy = createAsyncThunk(
  'patientPharmacy/addMyPharmacy',
  ({ pharmacyId, setAsDefault }) => patientPharmacyService.addMyPharmacy(pharmacyId, setAsDefault),
);

export const deleteMyPharmacy = createAsyncThunk(
  'patientPharmacy/deleteMyPharmacy',
  (pharmacyId) => patientPharmacyService.deleteMyPharmacy(pharmacyId),
);

const patientPharmacySlice = createSlice({
  name: 'patientPharmacy',
  initialState,
  reducers: {},
});

export default patientPharmacySlice.reducer;
