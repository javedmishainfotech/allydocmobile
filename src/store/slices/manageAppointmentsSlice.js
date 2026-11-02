import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as manageAppointmentsService from '../../services/manageAppointmentsService';

// Single-shot fetches/mutations used by several unrelated screens - see patientsSlice.js for why
// there is no shared list state to read back here.
const initialState = {
  lastError: null,
};

/** Mirrors getAllAppointmentsBasedOnDate. */
export const fetchAppointmentsBasedOnDate = createAsyncThunk(
  'manageAppointments/fetchByDate',
  async (date, { rejectWithValue }) => {
    const result = await manageAppointmentsService.getAppointmentsBasedOnDate(date);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load appointments.');
    return result.data;
  },
);

/** Mirrors DoctorAppointmentsAction. */
export const fetchDoctorAppointments = createAsyncThunk(
  'manageAppointments/fetchDoctorAppointments',
  async ({ doctorId, status }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.getDoctorAppointments(doctorId, status);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load appointments.');
    return result.data;
  },
);

/** Mirrors ChangeAppointmentStatusAction. */
export const completeAppointment = createAsyncThunk(
  'manageAppointments/complete',
  async ({ appointmentId, remarks }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.markAppointmentComplete({ appointmentId, remarks });
    if (!result.success) return rejectWithValue(result.message || 'Unable to mark this appointment complete.');
    return { message: result.message };
  },
);

/** Mirrors cancelAppointmentAction. */
export const cancelAppointmentThunk = createAsyncThunk(
  'manageAppointments/cancel',
  async ({ appointmentId, cancelReason }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.cancelAppointment({ appointmentId, cancelReason });
    if (!result.success) return rejectWithValue(result.message || 'Unable to cancel this appointment.');
    return { message: result.message };
  },
);

/** Mirrors GetNotesAction. */
export const fetchAppointmentNotes = createAsyncThunk(
  'manageAppointments/fetchNotes',
  async (appointmentId, { rejectWithValue }) => {
    const result = await manageAppointmentsService.getAppointmentNotes(appointmentId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load notes.');
    return result.data;
  },
);

/** Mirrors AddNotesAction. */
export const saveAppointmentNotesThunk = createAsyncThunk(
  'manageAppointments/saveNotes',
  async ({ appointmentId, userId, notes }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.saveAppointmentNotes({ appointmentId, userId, notes });
    if (!result.success) return rejectWithValue(result.message || 'Unable to save the note.');
    return { message: result.message };
  },
);

/** Mirrors GetDoctorAppointmentsListAction. Resolves to the raw response body (callers run it
 * through `parseAppointmentListResponse`, which expects the un-unwrapped shape). */
export const fetchDoctorAppointmentsList = createAsyncThunk(
  'manageAppointments/fetchList',
  async ({ doctorId, filter }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.getDoctorAppointmentsList(doctorId, filter);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load appointments.');
    return result.raw;
  },
);

/** Mirrors UpdateAppointmentAction (reschedule). */
export const updateAppointmentThunk = createAsyncThunk(
  'manageAppointments/update',
  async ({ appointmentId, appointmentDate, appointMentTime, rescheduleReason }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.updateAppointment({
      appointmentId,
      appointmentDate,
      appointMentTime,
      rescheduleReason,
    });
    if (!result.success) return rejectWithValue(result.message || 'Unable to reschedule this appointment.');
    return { message: result.message };
  },
);

/** Mirrors GetAppointmentRecordingLinkAction. */
export const fetchAppointmentRecordingLink = createAsyncThunk(
  'manageAppointments/fetchRecordingLink',
  async ({ appointmentId, forceSync = false }, { rejectWithValue }) => {
    const result = await manageAppointmentsService.getAppointmentRecordingLink(appointmentId, forceSync);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load the recording.');
    return result.data;
  },
);

const manageAppointmentsSlice = createSlice({
  name: 'manageAppointments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type.startsWith('manageAppointments/') && action.type.endsWith('/rejected'),
      (state, action) => {
        state.lastError = action.payload || 'Something went wrong.';
      },
    );
  },
});

export default manageAppointmentsSlice.reducer;
