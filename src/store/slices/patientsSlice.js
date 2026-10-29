import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as patientsService from '../../services/patientsService';

// This slice's thunks are single-shot fetches used by several unrelated screens at once
// (e.g. getUserDetails is called for both a patient and a doctor on the same screen), so unlike
// the dashboard slices there is no shared "list"/"status" to read back - each caller unwraps its
// own thunk dispatch and keeps its own local loading state, same as it did with the old direct
// service calls. `lastError` only exists for Redux DevTools visibility.
const initialState = {
  lastError: null,
};

/** Mirrors GetFreelancerDoctorPatientsAction. */
export const fetchFreelancerPatients = createAsyncThunk(
  'patients/fetchFreelancerPatients',
  async (params, { rejectWithValue }) => {
    const result = await patientsService.getFreelancerPatients(params);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load patients.');
    return result.data;
  },
);

/** Mirrors GetAllClinicPatientsAction. */
export const fetchClinicPatients = createAsyncThunk(
  'patients/fetchClinicPatients',
  async (params, { rejectWithValue }) => {
    const result = await patientsService.getClinicPatients(params);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load patients.');
    return result.data;
  },
);

/** Mirrors GetUserDetailsAction. */
export const fetchPatientUserDetails = createAsyncThunk(
  'patients/fetchUserDetails',
  async (userId, { rejectWithValue }) => {
    const result = await patientsService.getUserDetails(userId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load user details.');
    return result.data;
  },
);

/** Mirrors PatientAppointmentHistory (ViewPatientPage.jsx - the doctor's patient-detail tab). */
export const fetchPatientAppointmentHistoryForDetail = createAsyncThunk(
  'patients/fetchAppointmentHistory',
  async (patientId, { rejectWithValue }) => {
    const result = await patientsService.getPatientAppointmentHistory(patientId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load appointment history.');
    return result.data;
  },
);

/** Mirrors GetPatientPharmaciesAction. */
export const fetchPatientPharmacies = createAsyncThunk(
  'patients/fetchPatientPharmacies',
  async (doseSpotPatientId, { rejectWithValue }) => {
    const result = await patientsService.getPatientPharmacies(doseSpotPatientId);
    if (!result.success) return rejectWithValue(result.message || 'Unable to load pharmacies.');
    return result.data;
  },
);

/** Mirrors DoctorPatientDropdownAction. */
export const fetchDoctorPatientDropdown = createAsyncThunk(
  'patients/fetchDoctorPatientDropdown',
  async (_, { rejectWithValue }) => {
    const result = await patientsService.getDoctorPatientDropdown();
    if (!result.success) return rejectWithValue(result.message || 'Unable to load patient list.');
    return result.data;
  },
);

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type.startsWith('patients/') && action.type.endsWith('/rejected'),
      (state, action) => {
        state.lastError = action.payload || 'Something went wrong.';
      },
    );
  },
});

export default patientsSlice.reducer;
