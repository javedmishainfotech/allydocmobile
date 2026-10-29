import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as nursePendingAppointmentsService from '../../services/nursePendingAppointmentsService';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  appointments: [],
  doctorsStatus: 'idle',
  doctorsError: null,
  availableDoctors: [],
  assigning: false,
  assignError: null,
};

/** Mirrors getPendingAppointmentsAction in AllyDocReactApp/src/module/Nurse/PendingAppointments/actions.js. */
export const fetchPendingAppointments = createAsyncThunk(
  'nursePendingAppointments/fetchList',
  async (_, { rejectWithValue }) => {
    const result = await nursePendingAppointmentsService.getPendingAppointments();
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to load pending appointments.');
    }
    return result.data || [];
  },
);

/** Mirrors getAvailableDoctorAction. */
export const fetchAvailableDoctors = createAsyncThunk(
  'nursePendingAppointments/fetchAvailableDoctors',
  async (appointmentId, { rejectWithValue }) => {
    const result = await nursePendingAppointmentsService.getAvailableDoctors(appointmentId);
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to load available doctors.');
    }
    return result.data || [];
  },
);

/** Mirrors AppointmentRequestAcceptAction, reused here to assign a doctor. Refreshes the
 * pending list on success, same as the web app does after a successful assignment. */
export const assignDoctorToPendingAppointment = createAsyncThunk(
  'nursePendingAppointments/assignDoctor',
  async ({ appointmentId, doctorId }, { dispatch, rejectWithValue }) => {
    const result = await nursePendingAppointmentsService.assignDoctorToAppointment({ appointmentId, doctorId });
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to assign doctor.');
    }
    await dispatch(fetchPendingAppointments());
    return { message: result.message };
  },
);

const nursePendingAppointmentsSlice = createSlice({
  name: 'nursePendingAppointments',
  initialState,
  reducers: {
    clearAvailableDoctors(state) {
      state.availableDoctors = [];
      state.doctorsStatus = 'idle';
      state.doctorsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingAppointments.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPendingAppointments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.appointments = action.payload;
      })
      .addCase(fetchPendingAppointments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load pending appointments.';
      })
      .addCase(fetchAvailableDoctors.pending, (state) => {
        state.doctorsStatus = 'loading';
        state.doctorsError = null;
      })
      .addCase(fetchAvailableDoctors.fulfilled, (state, action) => {
        state.doctorsStatus = 'succeeded';
        state.availableDoctors = action.payload;
      })
      .addCase(fetchAvailableDoctors.rejected, (state, action) => {
        state.doctorsStatus = 'failed';
        state.doctorsError = action.payload || 'Unable to load available doctors.';
      })
      .addCase(assignDoctorToPendingAppointment.pending, (state) => {
        state.assigning = true;
        state.assignError = null;
      })
      .addCase(assignDoctorToPendingAppointment.fulfilled, (state) => {
        state.assigning = false;
      })
      .addCase(assignDoctorToPendingAppointment.rejected, (state, action) => {
        state.assigning = false;
        state.assignError = action.payload || 'Unable to assign doctor.';
      });
  },
});

export const { clearAvailableDoctors } = nursePendingAppointmentsSlice.actions;
export default nursePendingAppointmentsSlice.reducer;
