import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors AllyDocReactApp/src/store/actions/diseaseAssessmentActions.js - the clinic-admin
 * Disease Questionnaire Builder's API contract (question CRUD, publish state, reorder). */

export function getDiseaseAssessment(diseaseId) {
  return callApi(() => apiClient.get(`/DiseaseAssessment/GetAssessment?diseaseId=${diseaseId}`));
}

export function saveDiseaseQuestion(payload) {
  return callApi(() => apiClient.post('/DiseaseAssessment/SaveQuestion', payload));
}

export function deleteDiseaseQuestion(diseaseId, questionId) {
  return callApi(() =>
    apiClient.delete(`/DiseaseAssessment/DeleteQuestion?diseaseId=${diseaseId}&questionId=${questionId}`),
  );
}

export function duplicateDiseaseQuestion(questionId) {
  return callApi(() => apiClient.post(`/DiseaseAssessment/DuplicateQuestion?questionId=${questionId}`));
}

export function saveDiseaseAssessmentSettings(payload) {
  return callApi(() => apiClient.post('/DiseaseAssessment/SaveSettings', payload));
}

export function setDiseaseQuestionPublish(questionId, isPublished) {
  return callApi(() =>
    apiClient.put(`/DiseaseAssessment/SetQuestionPublish?questionId=${questionId}&isPublished=${isPublished}`),
  );
}

export function setDiseaseAssessmentPublish(diseaseId, isPublished) {
  return callApi(() =>
    apiClient.put(`/DiseaseAssessment/SetAssessmentPublish?diseaseId=${diseaseId}&isPublished=${isPublished}`),
  );
}

// Different controller than the rest (DiseaseManagement, not DiseaseAssessment) - matches web.
export function updateDiseaseQuestionSequence(diseaseId, questionIds) {
  return callApi(() =>
    apiClient.put('/DiseaseManagement/UpdateQuestionSequence', { diseaseId, questionIds }),
  );
}
