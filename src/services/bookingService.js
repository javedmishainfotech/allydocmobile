import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
import { sortAndNormalizeQuestions } from '../utils/questionnaire/questionnaireTypes';

// Ports of components/BookAppointmentModal/Actions.js and the related store actions in AllyDocReactApp.

/** The conditions / symptoms a patient can book for. */
export async function getAllSymptoms() {
  try {
    const response = await apiClient.get('/AllSymptoms');
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/**
 * Mirrors GetAllQuestionsAction: the questionnaire of a condition. Passing `existingQuestionnaireId`
 * resumes an abandoned booking instead of starting a fresh row. Resolves with `data.questions`
 * already sorted and normalised.
 */
export async function getQuestionnaire({ symptomTypeId, patientId, existingQuestionnaireId }) {
  const resume = existingQuestionnaireId ? `&existingQuestionnaireId=${existingQuestionnaireId}` : '';
  let result;
  try {
    const response = await apiClient.get(`/GetQuestionnaire?symptomId=${symptomTypeId}&patientId=${patientId}${resume}`);
    result = normalizeApiBody(response.data, true);
  } catch (err) {
    result = err.response ? normalizeApiBody(err.response.data, false) : normalizeApiError(err);
  }
  if (!result.success) return result;
  const data = result.data || {};
  return { ...result, data: { ...data, questions: sortAndNormalizeQuestions(data.questions || []) } };
}

/** Final submit of the answered questions (SendPatientQuestionnaire). */
export async function savePatientQuestionnaire(payload) {
  try {
    const response = await apiClient.post('/SavePatientQuestionnaire', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Per-answer autosave (SaveQuestionnaireAnswerAction) - fire and forget. */
export async function saveQuestionnaireAnswer(values) {
  try {
    const response = await apiClient.post('/SaveQuestionnaireAnswer', values);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
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
  let result;
  try {
    const response = await apiClient.get('/api/PatientBookingConsent/GetData');
    result = normalizeApiBody(response.data, true);
  } catch (err) {
    result = err.response ? normalizeApiBody(err.response.data, false) : normalizeApiError(err);
  }
  if (!result.success) return { ...result, html: '', version: '' };
  return { ...result, ...readLegalContent(result.data) };
}

/** Records that the patient accepted the consent (the questionnaire id is null at this point). */
export async function recordConsentAcceptance({ questionnaireId } = {}) {
  try {
    const response = await apiClient.post('/api/PatientBookingConsent/RecordAcceptance', {
      accepted: true,
      questionnaireId: questionnaireId ?? null,
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function dismissBookingAttempt(attemptId, patientId) {
  try {
    const response = await apiClient.post('/BookingProgress/Dismiss', { attemptId, patientId });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Slots for a day (GetScheduleListAction). `appointmentDate` is a local date-only string. */
export async function getScheduleList({ userId, day, appointmentDate }) {
  let url = `/ScheduleList?UserId=${userId}&Day=${day}`;
  if (appointmentDate) url += `&appointmentDate=${encodeURIComponent(appointmentDate)}`;
  try {
    const response = await apiClient.get(url);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Saves the chosen slot on the questionnaire (SaveDateTimeAction). */
export async function saveAppointmentTime(questionnaireId, date, time) {
  let timeZoneId = '';
  try {
    timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timeZoneId = '';
  }
  try {
    const response = await apiClient.post(
      `/SelectAppointmentTime?questionnaireId=${questionnaireId}&appointmentDate=${date}&appointmentTime=${time}&timeZoneId=${encodeURIComponent(timeZoneId)}`,
    );
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Payment options of a booking: existing plan, available plans, one-time amount (GetPaymentDetailAction). */
export async function getPaymentOptions(questionnaireId, token) {
  const sendToken = token ? `&Token=${token}` : '';
  try {
    const response = await apiClient.get(`GetPaymentOptionsForAppointmentBooking?QuestionnaireId=${questionnaireId}${sendToken}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Starts a paid checkout (one-time OT or subscription BS); resolves with the payment token. */
export async function checkoutAppointmentBooking(values) {
  try {
    const response = await apiClient.post('/CheckoutAppointmentBooking', values);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Books using an existing, still-usable subscription plan (no payment). */
export async function bookWithSubscriptionPlan(questionnaireId, token) {
  const sendToken = token ? `&Token=${token}` : '';
  try {
    const response = await apiClient.post(`/BookAppointmentWithSubscriptionPlan?PatientQuestionnaireId=${questionnaireId}${sendToken}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
