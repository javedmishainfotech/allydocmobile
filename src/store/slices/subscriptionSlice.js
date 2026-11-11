import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as subscriptionService from '../../services/subscriptionService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. (`getUserActiveSubscription` is a different service - patientDashboardService -
 * see patientDashboardSlice.js's `fetchUserActiveSubscriptionRaw` for that one.) */
const initialState = {};

export const fetchSubscriptionPlansByClinic = createAsyncThunk(
  'subscription/fetchSubscriptionPlansByClinic',
  (clinicCode) => subscriptionService.getSubscriptionPlansByClinic(clinicCode),
);

export const purchaseSubscriptionPlan = createAsyncThunk(
  'subscription/purchaseSubscriptionPlan',
  (params) => subscriptionService.purchaseSubscriptionPlan(params),
);

export const renewSubscriptionPlan = createAsyncThunk(
  'subscription/renewSubscriptionPlan',
  (planId) => subscriptionService.renewSubscriptionPlan(planId),
);

export const fetchPatientSubscriptionHistory = createAsyncThunk(
  'subscription/fetchPatientSubscriptionHistory',
  (params) => subscriptionService.getPatientSubscriptionHistory(params),
);

export const fetchSubscriptionInvoice = createAsyncThunk(
  'subscription/fetchSubscriptionInvoice',
  (patientSubscriptionId) => subscriptionService.getSubscriptionInvoice(patientSubscriptionId),
);

export const confirmSuccessfulPayment = createAsyncThunk(
  'subscription/confirmSuccessfulPayment',
  (token) => subscriptionService.confirmSuccessfulPayment(token),
);

export const confirmFailedPayment = createAsyncThunk(
  'subscription/confirmFailedPayment',
  (token) => subscriptionService.confirmFailedPayment(token),
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {},
});

export default subscriptionSlice.reducer;
