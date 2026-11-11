import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAllSymptoms,
  fetchQuestionnaire,
  submitPatientQuestionnaire,
  autosaveQuestionnaireAnswer,
  fetchBookingConsent,
  submitConsentAcceptance,
  dismissPendingBookingAttempt,
  fetchBookingScheduleList,
  submitAppointmentTime,
  fetchBookingPaymentOptions,
  submitCheckoutAppointmentBooking,
  submitBookWithSubscriptionPlan,
} from '../store/slices/bookingSlice';

/** Thin unwrap-based wrapper around the booking slice's thunks, one per bookingService function,
 * with the exact same call signature as before - see bookingSlice.js for why every function
 * resolves with the full result envelope instead of narrowing/rejecting. */
export function useBooking() {
  const dispatch = useDispatch();

  const getAllSymptoms = useCallback(() => dispatch(fetchAllSymptoms()).unwrap(), [dispatch]);

  const getQuestionnaire = useCallback(
    (params) => dispatch(fetchQuestionnaire(params)).unwrap(),
    [dispatch],
  );

  const savePatientQuestionnaire = useCallback(
    (payload) => dispatch(submitPatientQuestionnaire(payload)).unwrap(),
    [dispatch],
  );

  const saveQuestionnaireAnswer = useCallback(
    (values) => dispatch(autosaveQuestionnaireAnswer(values)).unwrap(),
    [dispatch],
  );

  const getBookingConsent = useCallback(() => dispatch(fetchBookingConsent()).unwrap(), [dispatch]);

  const recordConsentAcceptance = useCallback(
    (params) => dispatch(submitConsentAcceptance(params)).unwrap(),
    [dispatch],
  );

  const dismissBookingAttempt = useCallback(
    (attemptId, patientId) => dispatch(dismissPendingBookingAttempt({ attemptId, patientId })).unwrap(),
    [dispatch],
  );

  const getScheduleList = useCallback(
    (params) => dispatch(fetchBookingScheduleList(params)).unwrap(),
    [dispatch],
  );

  const saveAppointmentTime = useCallback(
    (questionnaireId, date, time) =>
      dispatch(submitAppointmentTime({ questionnaireId, date, time })).unwrap(),
    [dispatch],
  );

  const getPaymentOptions = useCallback(
    (questionnaireId, token) => dispatch(fetchBookingPaymentOptions({ questionnaireId, token })).unwrap(),
    [dispatch],
  );

  const checkoutAppointmentBooking = useCallback(
    (values) => dispatch(submitCheckoutAppointmentBooking(values)).unwrap(),
    [dispatch],
  );

  const bookWithSubscriptionPlan = useCallback(
    (questionnaireId, token) =>
      dispatch(submitBookWithSubscriptionPlan({ questionnaireId, token })).unwrap(),
    [dispatch],
  );

  return {
    getAllSymptoms,
    getQuestionnaire,
    savePatientQuestionnaire,
    saveQuestionnaireAnswer,
    getBookingConsent,
    recordConsentAcceptance,
    dismissBookingAttempt,
    getScheduleList,
    saveAppointmentTime,
    getPaymentOptions,
    checkoutAppointmentBooking,
    bookWithSubscriptionPlan,
  };
}
