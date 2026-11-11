import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as callService from '../../services/callService';

/**
 * Same thin, unwrap-only shape as bookingSlice: every consumer already branches on
 * `result.success`/`result.message`/`result.data` directly, so these thunks always fulfill with
 * the full raw result object (no `rejectWithValue`) - only the import+call site changes.
 * `getCallAcceptRefusal`/`pickCallSessionId` are pure synchronous helpers (not API calls), so they
 * stay as direct imports from callService rather than becoming thunks.
 */
const initialState = {};

export const startAppointmentCall = createAsyncThunk(
  'call/startAppointmentCall',
  ({ appointmentId, callType }) => callService.startAppointmentCall(appointmentId, callType),
);

export const startCallRecording = createAsyncThunk('call/startCallRecording', (roomName) =>
  callService.startCallRecording(roomName),
);

export const stopCallRecording = createAsyncThunk(
  'call/stopCallRecording',
  ({ roomName, appointmentId }) => callService.stopCallRecording(roomName, appointmentId),
);

export const acceptCall = createAsyncThunk('call/acceptCall', (params) => callService.acceptCall(params));

export const declineCall = createAsyncThunk('call/declineCall', (params) => callService.declineCall(params));

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {},
});

export default callSlice.reducer;
