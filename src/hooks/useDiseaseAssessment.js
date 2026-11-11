import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchDiseaseAssessment,
  saveDiseaseQuestion,
  deleteDiseaseQuestion,
  duplicateDiseaseQuestion,
  saveDiseaseAssessmentSettings,
  setDiseaseQuestionPublish,
  setDiseaseAssessmentPublish,
  updateDiseaseQuestionSequence,
} from '../store/slices/diseaseAssessmentSlice';

/** Thin unwrap-based wrapper around the disease-assessment slice's thunks, with the exact same
 * call signature as before - see diseaseAssessmentSlice.js for why these resolve with the full
 * result envelope. */
export function useDiseaseAssessment() {
  const dispatch = useDispatch();

  const getDiseaseAssessment = useCallback(
    (diseaseId) => dispatch(fetchDiseaseAssessment(diseaseId)).unwrap(),
    [dispatch],
  );

  const saveQuestion = useCallback(
    (payload) => dispatch(saveDiseaseQuestion(payload)).unwrap(),
    [dispatch],
  );

  const deleteQuestion = useCallback(
    (diseaseId, questionId) => dispatch(deleteDiseaseQuestion({ diseaseId, questionId })).unwrap(),
    [dispatch],
  );

  const duplicateQuestion = useCallback(
    (questionId) => dispatch(duplicateDiseaseQuestion(questionId)).unwrap(),
    [dispatch],
  );

  const saveAssessmentSettings = useCallback(
    (payload) => dispatch(saveDiseaseAssessmentSettings(payload)).unwrap(),
    [dispatch],
  );

  const setQuestionPublish = useCallback(
    (questionId, isPublished) =>
      dispatch(setDiseaseQuestionPublish({ questionId, isPublished })).unwrap(),
    [dispatch],
  );

  const setAssessmentPublish = useCallback(
    (diseaseId, isPublished) =>
      dispatch(setDiseaseAssessmentPublish({ diseaseId, isPublished })).unwrap(),
    [dispatch],
  );

  const updateQuestionSequence = useCallback(
    (diseaseId, questionIds) =>
      dispatch(updateDiseaseQuestionSequence({ diseaseId, questionIds })).unwrap(),
    [dispatch],
  );

  return {
    getDiseaseAssessment,
    saveDiseaseQuestion: saveQuestion,
    deleteDiseaseQuestion: deleteQuestion,
    duplicateDiseaseQuestion: duplicateQuestion,
    saveDiseaseAssessmentSettings: saveAssessmentSettings,
    setDiseaseQuestionPublish: setQuestionPublish,
    setDiseaseAssessmentPublish: setAssessmentPublish,
    updateDiseaseQuestionSequence: updateQuestionSequence,
  };
}
