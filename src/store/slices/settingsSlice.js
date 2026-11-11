import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as settingsService from '../../services/settingsService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const fetchUserDetails = createAsyncThunk('settings/fetchUserDetails', (userId) =>
  settingsService.getUserDetails(userId),
);

export const fetchAssignedDiseases = createAsyncThunk(
  'settings/fetchAssignedDiseases',
  (clinicCode) => settingsService.getAssignedDiseases(clinicCode),
);

export const assignDiseases = createAsyncThunk('settings/assignDiseases', (params) =>
  settingsService.assignDiseases(params),
);

export const searchPatients = createAsyncThunk('settings/searchPatients', (params) =>
  settingsService.searchPatients(params),
);

export const mergePatients = createAsyncThunk('settings/mergePatients', (params) =>
  settingsService.mergePatients(params),
);

export const fetchDailyAvailableHours = createAsyncThunk(
  'settings/fetchDailyAvailableHours',
  (doctorId) => settingsService.getDailyAvailableHours(doctorId),
);

export const fetchDuration = createAsyncThunk('settings/fetchDuration', (userId) =>
  settingsService.getDuration(userId),
);

export const fetchDoctorTimeZone = createAsyncThunk(
  'settings/fetchDoctorTimeZone',
  (userId) => settingsService.getDoctorTimeZone(userId),
);

export const fetchTimeZones = createAsyncThunk('settings/fetchTimeZones', () =>
  settingsService.getTimeZones(),
);

export const saveWeeklySchedule = createAsyncThunk('settings/saveWeeklySchedule', (values) =>
  settingsService.saveWeeklySchedule(values),
);

export const changePassword = createAsyncThunk('settings/changePassword', (params) =>
  settingsService.changePassword(params),
);

export const fetchCertificates = createAsyncThunk('settings/fetchCertificates', (doctorId) =>
  settingsService.getCertificates(doctorId),
);

export const addCertificate = createAsyncThunk('settings/addCertificate', (params) =>
  settingsService.addCertificate(params),
);

export const removeCertificate = createAsyncThunk(
  'settings/removeCertificate',
  (documentId) => settingsService.removeCertificate(documentId),
);

export const resetPin = createAsyncThunk('settings/resetPin', () => settingsService.resetPin());

export const setPin = createAsyncThunk('settings/setPin', (pin) => settingsService.setPin(pin));

export const updateDoseSpotStatus = createAsyncThunk(
  'settings/updateDoseSpotStatus',
  (params) => settingsService.updateDoseSpotStatus(params),
);

export const requestTfaDeactivation = createAsyncThunk(
  'settings/requestTfaDeactivation',
  () => settingsService.requestTfaDeactivation(),
);

export const tfaDeactivate = createAsyncThunk('settings/tfaDeactivate', (params) =>
  settingsService.tfaDeactivate(params),
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
});

export default settingsSlice.reducer;
