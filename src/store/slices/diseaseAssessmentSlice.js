import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as diseaseAssessmentService from '../../services/diseaseAssessmentService';

/** Same thin, unwrap-only shape as bookingSlice/callSlice/chatSlice - the single consumer already
 * branches on `result.success`/`result.message` directly, so these thunks always fulfill with the
 * full raw result object. */
const initialState = {};

export const fetchDiseaseAssessment = createAsyncThunk(
  'diseaseAssessment/fetchAssessment',
  (diseaseId) => diseaseAssessmentService.getDiseaseAssessment(diseaseId),
);

export const saveDiseaseQuestion = createAsyncThunk(
  'diseaseAssessment/saveQuestion',
  (payload) => diseaseAssessmentService.saveDiseaseQuestion(payload),
);

export const deleteDiseaseQuestion = createAsyncThunk(
  'diseaseAssessment/deleteQuestion',
  ({ diseaseId, questionId }) => diseaseAssessmentService.deleteDiseaseQuestion(diseaseId, questionId),
);

export const duplicateDiseaseQuestion = createAsyncThunk(
  'diseaseAssessment/duplicateQuestion',
  (questionId) => diseaseAssessmentService.duplicateDiseaseQuestion(questionId),
);

export const saveDiseaseAssessmentSettings = createAsyncThunk(
  'diseaseAssessment/saveSettings',
  (payload) => diseaseAssessmentService.saveDiseaseAssessmentSettings(payload),
);

export const setDiseaseQuestionPublish = createAsyncThunk(
  'diseaseAssessment/setQuestionPublish',
  ({ questionId, isPublished }) => diseaseAssessmentService.setDiseaseQuestionPublish(questionId, isPublished),
);

export const setDiseaseAssessmentPublish = createAsyncThunk(
  'diseaseAssessment/setAssessmentPublish',
  ({ diseaseId, isPublished }) => diseaseAssessmentService.setDiseaseAssessmentPublish(diseaseId, isPublished),
);

export const updateDiseaseQuestionSequence = createAsyncThunk(
  'diseaseAssessment/updateQuestionSequence',
  ({ diseaseId, questionIds }) => diseaseAssessmentService.updateDiseaseQuestionSequence(diseaseId, questionIds),
);

const diseaseAssessmentSlice = createSlice({
  name: 'diseaseAssessment',
  initialState,
  reducers: {},
});

export default diseaseAssessmentSlice.reducer;
