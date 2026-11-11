import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as bookingService from '../../services/bookingService';

/**
 * Every one of this slice's call sites already branches on `result.success`/`result.message`
 * directly (and, for the consent text, extra `html`/`version` fields merged onto the result)
 * rather than throwing on failure - bookingService's own functions always resolve with a
 * normalised envelope for both success and failure. So unlike patientsSlice (which narrows to
 * `.data` and rejects via `rejectWithValue`), these thunks always fulfill with the FULL result
 * object unchanged, letting every consumer keep its exact existing `if (!result.success)` logic
 * after just swapping the import for `useBooking()`.
 */
const initialState = {};

export const fetchAllSymptoms = createAsyncThunk('booking/fetchAllSymptoms', () =>
  bookingService.getAllSymptoms(),
);

export const fetchQuestionnaire = createAsyncThunk('booking/fetchQuestionnaire', (params) =>
  bookingService.getQuestionnaire(params),
);

export const submitPatientQuestionnaire = createAsyncThunk(
  'booking/submitPatientQuestionnaire',
  (payload) => bookingService.savePatientQuestionnaire(payload),
);

export const autosaveQuestionnaireAnswer = createAsyncThunk(
  'booking/autosaveQuestionnaireAnswer',
  (values) => bookingService.saveQuestionnaireAnswer(values),
);

export const fetchBookingConsent = createAsyncThunk('booking/fetchBookingConsent', () =>
  bookingService.getBookingConsent(),
);

export const submitConsentAcceptance = createAsyncThunk(
  'booking/submitConsentAcceptance',
  (params) => bookingService.recordConsentAcceptance(params),
);

export const dismissPendingBookingAttempt = createAsyncThunk(
  'booking/dismissPendingBookingAttempt',
  ({ attemptId, patientId }) => bookingService.dismissBookingAttempt(attemptId, patientId),
);

export const fetchBookingScheduleList = createAsyncThunk('booking/fetchScheduleList', (params) =>
  bookingService.getScheduleList(params),
);

export const submitAppointmentTime = createAsyncThunk(
  'booking/submitAppointmentTime',
  ({ questionnaireId, date, time }) => bookingService.saveAppointmentTime(questionnaireId, date, time),
);

export const fetchBookingPaymentOptions = createAsyncThunk(
  'booking/fetchPaymentOptions',
  ({ questionnaireId, token }) => bookingService.getPaymentOptions(questionnaireId, token),
);

export const submitCheckoutAppointmentBooking = createAsyncThunk(
  'booking/checkoutAppointmentBooking',
  (values) => bookingService.checkoutAppointmentBooking(values),
);

export const submitBookWithSubscriptionPlan = createAsyncThunk(
  'booking/bookWithSubscriptionPlan',
  ({ questionnaireId, token }) => bookingService.bookWithSubscriptionPlan(questionnaireId, token),
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {},
});

export default bookingSlice.reducer;
