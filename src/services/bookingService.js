import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';
import { sortAndNormalizeQuestions } from '../utils/questionnaire/questionnaireTypes';

// Ports of components/BookAppointmentModal/Actions.js and the related store actions in AllyDocReactApp.

/** The conditions / symptoms a patient can book for. */
export function getAllSymptoms() {
  return callApi(() => apiClient.get('/AllSymptoms'));
}

/**
 * Mirrors GetAllQuestionsAction: the questionnaire of a condition. Passing `existingQuestionnaireId`
 * resumes an abandoned booking instead of starting a fresh row. Resolves with `data.questions`
 * already sorted and normalised.
 */
export async function getQuestionnaire({ symptomTypeId, patientId, existingQuestionnaireId }) {
  const resume = existingQuestionnaireId ? `&existingQuestionnaireId=${existingQuestionnaireId}` : '';
  const result = await callApi(() =>
    apiClient.get(`/GetQuestionnaire?symptomId=${symptomTypeId}&patientId=${patientId}${resume}`),
  );
  if (!result.success) return result;
  const data = result.data || {};
  return { ...result, data: { ...data, questions: sortAndNormalizeQuestions(data.questions || []) } };
}

/** Final submit of the answered questions (SendPatientQuestionnaire). */
export function savePatientQuestionnaire(payload) {
  return callApi(() => apiClient.post('/SavePatientQuestionnaire', payload));
}

/** Per-answer autosave (SaveQuestionnaireAnswerAction) - fire and forget. */
export function saveQuestionnaireAnswer(values) {
  return callApi(() => apiClient.post('/SaveQuestionnaireAnswer', values));
}

/** Reads the html out of a legal-document response (web: readLegalContent in CmsActions.js). */
const readLegalContent = (data) => {
  if (typeof data === 'string') return { html: data, version: '' };
  if (data && typeof data === 'object') {
    return { html: data.content ?? data.Content ?? '', version: data.version ?? data.Version ?? '' };
  }
  return { html: '', version: '' };
};

/** The booking-consent wording the super admin published. */
export async function getBookingConsent() {
  const result = await callApi(() => apiClient.get('/api/PatientBookingConsent/GetData'));
  if (!result.success) return { ...result, html: '', version: '' };
  return { ...result, ...readLegalContent(result.data) };
}

/** Records that the patient accepted the consent (the questionnaire id is null at this point). */
export function recordConsentAcceptance({ questionnaireId } = {}) {
  return callApi(() =>
    apiClient.post('/api/PatientBookingConsent/RecordAcceptance', {
      accepted: true,
      questionnaireId: questionnaireId ?? null,
    }),
  );
}

export function dismissBookingAttempt(attemptId, patientId) {
  return callApi(() => apiClient.post('/BookingProgress/Dismiss', { attemptId, patientId }));
}

/** Slots for a day (GetScheduleListAction). `appointmentDate` is a local date-only string. */
export function getScheduleList({ userId, day, appointmentDate }) {
  let url = `/ScheduleList?UserId=${userId}&Day=${day}`;
  if (appointmentDate) url += `&appointmentDate=${encodeURIComponent(appointmentDate)}`;
  return callApi(() => apiClient.get(url));
}

/** Saves the chosen slot on the questionnaire (SaveDateTimeAction). */
export function saveAppointmentTime(questionnaireId, date, time) {
  let timeZoneId = '';
  try {
    timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timeZoneId = '';
  }
  return callApi(() =>
    apiClient.post(
      `/SelectAppointmentTime?questionnaireId=${questionnaireId}&appointmentDate=${date}&appointmentTime=${time}&timeZoneId=${encodeURIComponent(timeZoneId)}`,
    ),
  );
}

/** Payment options of a booking: existing plan, available plans, one-time amount (GetPaymentDetailAction). */
export function getPaymentOptions(questionnaireId, token) {
  const sendToken = token ? `&Token=${token}` : '';
  return callApi(() =>
    apiClient.get(`GetPaymentOptionsForAppointmentBooking?QuestionnaireId=${questionnaireId}${sendToken}`),
  );
}

/** Starts a paid checkout (one-time OT or subscription BS); resolves with the payment token. */
export function checkoutAppointmentBooking(values) {
  return callApi(() => apiClient.post('/CheckoutAppointmentBooking', values));
}

/** Books using an existing, still-usable subscription plan (no payment). */
export function bookWithSubscriptionPlan(questionnaireId, token) {
  const sendToken = token ? `&Token=${token}` : '';
  return callApi(() =>
    apiClient.post(`/BookAppointmentWithSubscriptionPlan?PatientQuestionnaireId=${questionnaireId}${sendToken}`),
  );
}
