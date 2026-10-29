import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as nurseDashboardService from '../../services/nurseDashboardService';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  data: {},
};

/** Mirrors GetNurseData in AllyDocReactApp/src/store/actions/GetNurseData.js. */
export const fetchNurseDashboard = createAsyncThunk(
  'nurseDashboard/fetchData',
  async (nurseId, { rejectWithValue }) => {
    const result = await nurseDashboardService.getNurseDashboard(nurseId);
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to load dashboard data.');
    }
    return result.data || {};
  },
);

const nurseDashboardSlice = createSlice({
  name: 'nurseDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNurseDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNurseDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchNurseDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load dashboard data.';
      });
  },
});

export default nurseDashboardSlice.reducer;
