import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as forgotPasswordService from '../../services/forgotPasswordService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const sendResetCode = createAsyncThunk('forgotPassword/sendResetCode', (email) =>
  forgotPasswordService.sendResetCode(email),
);

export const resendResetCode = createAsyncThunk('forgotPassword/resendResetCode', (email) =>
  forgotPasswordService.resendResetCode(email),
);

export const verifyResetCode = createAsyncThunk('forgotPassword/verifyResetCode', (params) =>
  forgotPasswordService.verifyResetCode(params),
);

export const resetPassword = createAsyncThunk('forgotPassword/resetPassword', (params) =>
  forgotPasswordService.resetPassword(params),
);

const forgotPasswordSlice = createSlice({
  name: 'forgotPassword',
  initialState,
  reducers: {},
});

export default forgotPasswordSlice.reducer;
