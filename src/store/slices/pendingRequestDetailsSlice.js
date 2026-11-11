import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as pendingRequestDetailsService from '../../services/pendingRequestDetailsService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const fetchAppointmentDetails = createAsyncThunk(
  'pendingRequestDetails/fetchAppointmentDetails',
  (appointmentId) => pendingRequestDetailsService.getAppointmentDetails(appointmentId),
);

export const fetchPatientAllergies = createAsyncThunk(
  'pendingRequestDetails/fetchPatientAllergies',
  (doseSpotPatientId) => pendingRequestDetailsService.getPatientAllergies(doseSpotPatientId),
);

const pendingRequestDetailsSlice = createSlice({
  name: 'pendingRequestDetails',
  initialState,
  reducers: {},
});

export default pendingRequestDetailsSlice.reducer;
