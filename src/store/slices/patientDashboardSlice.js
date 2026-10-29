import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as patientDashboardService from '../../services/patientDashboardService';

const initialState = {
  appointments: [],
  appointmentsStatus: 'idle', // idle | loading | succeeded | failed
  appointmentsError: null,
  subscription: null,
  subscriptionStatus: 'idle',
  pendingPayment: null,
  pendingPaymentStatus: 'idle',
};

const getSubscriptionList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return value ? [value] : [];
};

/** Mirrors PatientAppointmentHistory. `silent` (web's `{silent: true}` background polling
 * refresh) keeps whatever is on screen if the call fails, and never flips the loading flag. */
export const fetchPatientAppointmentHistory = createAsyncThunk(
  'patientDashboard/fetchAppointments',
  async ({ patientId, silent = false }, { rejectWithValue }) => {
    const result = await patientDashboardService.getPatientAppointmentHistory(patientId);
    if (!result.success || !Array.isArray(result.data)) {
      return rejectWithValue({ silent, message: result.message || 'Unable to load appointments.' });
    }
    return { silent, appointments: result.data };
  },
);

/** Mirrors GetUserActiveSubscriptionAction. */
export const fetchUserActiveSubscription = createAsyncThunk(
  'patientDashboard/fetchSubscription',
  async (_, { rejectWithValue }) => {
    const result = await patientDashboardService.getUserActiveSubscription();
    if (!result.success) return rejectWithValue(result.message || 'Unable to load subscription.');
    return getSubscriptionList(result.data).find(Boolean) || null;
  },
);

/** Mirrors GetPendingBookingAttemptAction. Returns the raw attempt (or null) - callers decide
 * what to do with it: the dashboard only cares about a staff-initiated one sitting at the
 * payment step ("Pay now" banner), BookAppointmentPage resumes ANY attempt's wizard state. */
export const fetchPendingBookingAttempt = createAsyncThunk(
  'patientDashboard/fetchPendingPayment',
  async (patientId, { rejectWithValue }) => {
    const result = await patientDashboardService.getPendingBookingAttempt(patientId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load pending booking attempt.');
    return result.data || null;
  },
);

const patientDashboardSlice = createSlice({
  name: 'patientDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientAppointmentHistory.pending, (state, action) => {
        if (!action.meta.arg.silent) state.appointmentsStatus = 'loading';
      })
      .addCase(fetchPatientAppointmentHistory.fulfilled, (state, action) => {
        state.appointmentsStatus = 'succeeded';
        state.appointmentsError = null;
        state.appointments = action.payload.appointments;
      })
      .addCase(fetchPatientAppointmentHistory.rejected, (state, action) => {
        // A failed silent refresh keeps whatever is already on screen.
        if (action.payload?.silent) return;
        state.appointmentsStatus = 'failed';
        state.appointmentsError = action.payload?.message || 'Unable to load appointments.';
      })
      .addCase(fetchUserActiveSubscription.pending, (state) => {
        state.subscriptionStatus = 'loading';
      })
      .addCase(fetchUserActiveSubscription.fulfilled, (state, action) => {
        state.subscriptionStatus = 'succeeded';
        state.subscription = action.payload;
      })
      .addCase(fetchUserActiveSubscription.rejected, (state) => {
        state.subscriptionStatus = 'failed';
        state.subscription = null;
      })
      .addCase(fetchPendingBookingAttempt.pending, (state) => {
        state.pendingPaymentStatus = 'loading';
      })
      .addCase(fetchPendingBookingAttempt.fulfilled, (state, action) => {
        state.pendingPaymentStatus = 'succeeded';
        state.pendingPayment = action.payload;
      })
      .addCase(fetchPendingBookingAttempt.rejected, (state) => {
        state.pendingPaymentStatus = 'failed';
      });
  },
});

export default patientDashboardSlice.reducer;
