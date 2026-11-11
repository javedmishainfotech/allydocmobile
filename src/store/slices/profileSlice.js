import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as profileService from '../../services/profileService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. `createDoctorProfile`/`updateDoctorProfile` are the same functions as
 * `createPatientProfile`/`updatePatientProfile` under a different name (per profileService.js) -
 * mirrored here as aliases rather than duplicate thunks. */
const initialState = {};

export const createPatientProfile = createAsyncThunk(
  'profile/createPatientProfile',
  (formData) => profileService.createPatientProfile(formData),
);

export const updatePatientProfile = createAsyncThunk(
  'profile/updatePatientProfile',
  (formData) => profileService.updatePatientProfile(formData),
);

export const createDoctorProfile = createPatientProfile;
export const updateDoctorProfile = updatePatientProfile;

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
});

export default profileSlice.reducer;
