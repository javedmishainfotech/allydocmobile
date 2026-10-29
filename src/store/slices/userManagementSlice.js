import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as nurseDashboardService from '../../services/nurseDashboardService';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
};

/** Mirrors AddUserAction. Shared by Nurse's Add Doctor/Add Patient (`AddUserModal`) and,
 * later, the clinic admin's Add Sub Doctor action - same `POST /AddUser` call either way. */
export const addUser = createAsyncThunk(
  'userManagement/addUser',
  async (values, { rejectWithValue }) => {
    const result = await nurseDashboardService.addUser(values);
    if (!result.success) {
      return rejectWithValue(result.message || 'Unable to add user.');
    }
    return { message: result.message };
  },
);

const userManagementSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    resetUserManagementStatus(state) {
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addUser.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(addUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to add user.';
      });
  },
});

export const { resetUserManagementStatus } = userManagementSlice.actions;
export default userManagementSlice.reducer;
