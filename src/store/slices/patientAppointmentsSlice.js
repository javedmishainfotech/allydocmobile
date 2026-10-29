import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as patientAppointmentsService from '../../services/patientAppointmentsService';

// Single-shot fetches/mutations used by several unrelated screens - see patientsSlice.js for why
// there is no shared list state to read back here.
const initialState = {
  lastError: null,
};

/** Mirrors fetchPatientAppointmentsList. Resolves to the raw response body (callers run it
 * through `extractAppointmentList`, which expects the un-unwrapped shape). */
export const fetchPatientAppointmentsList = createAsyncThunk(
  'patientAppointments/fetchList',
  async ({ patientId, filter }, { rejectWithValue }) => {
    const result = await patientAppointmentsService.getPatientAppointmentsList(patientId, filter);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load appointments.');
    return result.raw;
  },
);

/** Mirrors PatientDoctorDropdownAction. */
export const fetchPatientDoctorDropdown = createAsyncThunk(
  'patientAppointments/fetchDoctorDropdown',
  async (patientId, { rejectWithValue }) => {
    const result = await patientAppointmentsService.getPatientDoctorDropdown(patientId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load doctor list.');
    return result.data;
  },
);

/** Mirrors AddFeedbackAction / EditFeedbackAction. */
export const submitAppointmentFeedback = createAsyncThunk(
  'patientAppointments/submitFeedback',
  async ({ appointmentId, rating, comments, isEdit }, { rejectWithValue }) => {
    const save = isEdit
      ? patientAppointmentsService.updateFeedback
      : patientAppointmentsService.addFeedback;
    const result = await save({ appointmentId, rating, comments });
    if (!result.success) return rejectWithValue(result.message || 'Unable to save your feedback.');
    return { message: result.message };
  },
);

const patientAppointmentsSlice = createSlice({
  name: 'patientAppointments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type.startsWith('patientAppointments/') && action.type.endsWith('/rejected'),
      (state, action) => {
        state.lastError = action.payload || 'Something went wrong.';
      },
    );
  },
});

export default patientAppointmentsSlice.reducer;
