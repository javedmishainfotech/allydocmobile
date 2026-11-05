import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors AllyDocReactApp/src/store/actions/diseaseAssessmentActions.js - the clinic-admin
 * Disease Questionnaire Builder's API contract (question CRUD, publish state, reorder). */

export async function getDiseaseAssessment(diseaseId) {
  try {
    const response = await apiClient.get(`/DiseaseAssessment/GetAssessment?diseaseId=${diseaseId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function saveDiseaseQuestion(payload) {
  try {
    const response = await apiClient.post('/DiseaseAssessment/SaveQuestion', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function deleteDiseaseQuestion(diseaseId, questionId) {
  try {
    const response = await apiClient.delete(`/DiseaseAssessment/DeleteQuestion?diseaseId=${diseaseId}&questionId=${questionId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function duplicateDiseaseQuestion(questionId) {
  try {
    const response = await apiClient.post(`/DiseaseAssessment/DuplicateQuestion?questionId=${questionId}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function saveDiseaseAssessmentSettings(payload) {
  try {
    const response = await apiClient.post('/DiseaseAssessment/SaveSettings', payload);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function setDiseaseQuestionPublish(questionId, isPublished) {
  try {
    const response = await apiClient.put(`/DiseaseAssessment/SetQuestionPublish?questionId=${questionId}&isPublished=${isPublished}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function setDiseaseAssessmentPublish(diseaseId, isPublished) {
  try {
    const response = await apiClient.put(`/DiseaseAssessment/SetAssessmentPublish?diseaseId=${diseaseId}&isPublished=${isPublished}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

// Different controller than the rest (DiseaseManagement, not DiseaseAssessment) - matches web.
export async function updateDiseaseQuestionSequence(diseaseId, questionIds) {
  try {
    const response = await apiClient.put('/DiseaseManagement/UpdateQuestionSequence', { diseaseId, questionIds });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
