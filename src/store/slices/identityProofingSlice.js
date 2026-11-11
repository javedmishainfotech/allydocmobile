import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as identityProofingService from '../../services/identityProofingService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message`/`result.raw` directly, so these thunks always fulfill with
 * the full raw result object. */
const initialState = {};

export const createIdp = createAsyncThunk('identityProofing/createIdp', (payload) =>
  identityProofingService.createIdp(payload),
);

export const submitIdpAnswers = createAsyncThunk('identityProofing/submitIdpAnswers', (payload) =>
  identityProofingService.submitIdpAnswers(payload),
);

export const fetchRegistrationStatus = createAsyncThunk(
  'identityProofing/fetchRegistrationStatus',
  (clinicianId) => identityProofingService.getRegistrationStatus(clinicianId),
);

export const fetchLegalAgreement = createAsyncThunk(
  'identityProofing/fetchLegalAgreement',
  (clinicianId) => identityProofingService.getLegalAgreement(clinicianId),
);

export const acceptLegalAgreement = createAsyncThunk(
  'identityProofing/acceptLegalAgreement',
  (params) => identityProofingService.acceptLegalAgreement(params),
);

export const fetchIdpDisclaimer = createAsyncThunk('identityProofing/fetchIdpDisclaimer', () =>
  identityProofingService.getIdpDisclaimer(),
);

export const acceptIdpDisclaimer = createAsyncThunk(
  'identityProofing/acceptIdpDisclaimer',
  (payload) => identityProofingService.acceptIdpDisclaimer(payload),
);

export const fetchStates = createAsyncThunk('identityProofing/fetchStates', () =>
  identityProofingService.getStates(),
);

export const fetchCitiesByStateId = createAsyncThunk(
  'identityProofing/fetchCitiesByStateId',
  (stateId) => identityProofingService.getCitiesByStateId(stateId),
);

export const sendMobileTfa = createAsyncThunk('identityProofing/sendMobileTfa', (params) =>
  identityProofingService.sendMobileTfa(params),
);

export const tfaActivate = createAsyncThunk('identityProofing/tfaActivate', (params) =>
  identityProofingService.tfaActivate(params),
);

export const updatePin = createAsyncThunk('identityProofing/updatePin', (params) =>
  identityProofingService.updatePin(params),
);

export const requestTfaActivation = createAsyncThunk('identityProofing/requestTfaActivation', () =>
  identityProofingService.requestTfaActivation(),
);

const identityProofingSlice = createSlice({
  name: 'identityProofing',
  initialState,
  reducers: {},
});

export default identityProofingSlice.reducer;
