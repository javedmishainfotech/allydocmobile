import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as doctorDashboardService from '../../services/doctorDashboardService';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  scheduledRequestList: [],
  appointmentHistoryList: [],
  todayScheduleList: [],
  analytics: {
    oldPatient: 0,
    newPatient: 0,
    totalVisit: 0,
    totalFeedBackOnCompletedAppointment: 0,
    averageRating: null,
    scheduledAppointments: 0,
    completedAppointments: 0,
  },
  acceptingAppointmentId: null,
};

/** Mirrors DoctorDashboard/index.jsx's fetchData(): one combined call that
 * supplies pending requests, appointment history (used to derive "next
 * appointment"), and today's schedule. */
export const fetchDoctorDashboardData = createAsyncThunk(
  'doctorDashboard/fetchData',
  async (doctorId, { rejectWithValue }) => {
    const result = await doctorDashboardService.getHistoryAndAppointmentRequest(doctorId);
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to load dashboard data.');
    }
    const data = result.data || {};
    return {
      scheduledRequestList: [...(data.doctorAppointmentScheduledRequest || [])].reverse(),
      appointmentHistoryList: data.doctorAppointmentHistory || [],
      todayScheduleList: data.todaysAppointmentsExcludingRequested || [],
    };
  },
);

/** Mirrors DoctorDashboard/index.jsx's getDashboardAnalytics(). */
export const fetchDoctorDashboardAnalytics = createAsyncThunk(
  'doctorDashboard/fetchAnalytics',
  async (userId, { rejectWithValue }) => {
    const result = await doctorDashboardService.getDashboardAnalytics(userId);
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to load analytics.');
    }
    return result.data || {};
  },
);

/** Mirrors DoctorDashboard/index.jsx's handleAcceptClick(). */
export const acceptAppointmentRequest = createAsyncThunk(
  'doctorDashboard/acceptAppointmentRequest',
  async ({ appointmentId, doctorId }, { dispatch, rejectWithValue }) => {
    const result = await doctorDashboardService.acceptAppointmentRequest({
      appointmentId,
      doctorId,
    });
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to accept this appointment.');
    }
    // Silent refresh after accepting, same as the web app's fetchData({ silent: true }).
    await dispatch(fetchDoctorDashboardData(doctorId));
    return { message: result.message };
  },
);

const doctorDashboardSlice = createSlice({
  name: 'doctorDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctorDashboardData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDoctorDashboardData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.scheduledRequestList = action.payload.scheduledRequestList;
        state.appointmentHistoryList = action.payload.appointmentHistoryList;
        state.todayScheduleList = action.payload.todayScheduleList;
      })
      .addCase(fetchDoctorDashboardData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load dashboard data.';
      })
      .addCase(fetchDoctorDashboardAnalytics.fulfilled, (state, action) => {
        state.analytics = { ...state.analytics, ...action.payload };
      })
      .addCase(acceptAppointmentRequest.pending, (state, action) => {
        state.acceptingAppointmentId = action.meta.arg.appointmentId;
      })
      .addCase(acceptAppointmentRequest.fulfilled, (state) => {
        state.acceptingAppointmentId = null;
      })
      .addCase(acceptAppointmentRequest.rejected, (state, action) => {
        state.acceptingAppointmentId = null;
        state.error = action.payload || 'Unable to accept this appointment.';
      });
  },
});

export default doctorDashboardSlice.reducer;
