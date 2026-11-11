import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as doctorsListService from '../../services/doctorsListService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const fetchListOfDoctors = createAsyncThunk(
  'doctorsList/fetchListOfDoctors',
  (params) => doctorsListService.getListOfDoctors(params),
);

export const fetchDoctorTreatmentPlans = createAsyncThunk(
  'doctorsList/fetchDoctorTreatmentPlans',
  (doctorId) => doctorsListService.getDoctorTreatmentPlans(doctorId),
);

export const fetchDoctorFeedbackAppointments = createAsyncThunk(
  'doctorsList/fetchDoctorFeedbackAppointments',
  (doctorId) => doctorsListService.getDoctorFeedbackAppointments(doctorId),
);

const doctorsListSlice = createSlice({
  name: 'doctorsList',
  initialState,
  reducers: {},
});

export default doctorsListSlice.reducer;
