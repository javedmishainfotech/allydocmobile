import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as treatmentPlanService from '../../services/treatmentPlanService';

/** Same thin, unwrap-only shape as the other recent slices - both consumers already branch on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const fetchTreatmentPlansList = createAsyncThunk(
  'treatmentPlan/fetchTreatmentPlansList',
  (filter) => treatmentPlanService.getTreatmentPlansList(filter),
);

export const fetchTreatmentPlanDetails = createAsyncThunk(
  'treatmentPlan/fetchTreatmentPlanDetails',
  (appointmentId) => treatmentPlanService.getTreatmentPlanDetails(appointmentId),
);

export const saveTranscriptData = createAsyncThunk(
  'treatmentPlan/saveTranscriptData',
  (params) => treatmentPlanService.saveTranscriptData(params),
);

export const fetchMedicineStock = createAsyncThunk(
  'treatmentPlan/fetchMedicineStock',
  () => treatmentPlanService.getAllActiveMedicineStock(),
);

export const addMedicine = createAsyncThunk(
  'treatmentPlan/addMedicine',
  (params) => treatmentPlanService.addMedicine(params),
);

export const deleteMedicine = createAsyncThunk(
  'treatmentPlan/deleteMedicine',
  (id) => treatmentPlanService.deleteMedicine(id),
);

const treatmentPlanSlice = createSlice({
  name: 'treatmentPlan',
  initialState,
  reducers: {},
});

export default treatmentPlanSlice.reducer;
