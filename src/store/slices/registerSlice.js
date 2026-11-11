import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as registerService from '../../services/registerService';

/** Same thin, unwrap-only shape as the other recent slices - the single consumer already branches
 * on `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const registerUser = createAsyncThunk('register/registerUser', (values) =>
  registerService.registerUser(values),
);

export const verifyRegistrationOtp = createAsyncThunk(
  'register/verifyRegistrationOtp',
  (params) => registerService.verifyRegistrationOtp(params),
);

const registerSlice = createSlice({
  name: 'register',
  initialState,
  reducers: {},
});

export default registerSlice.reducer;
