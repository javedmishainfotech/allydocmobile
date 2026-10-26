import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as menuService from '../../services/menuService';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  items: [], // raw backend menu entries: [{ path, title, icon }]
  error: null,
};

export const fetchMenu = createAsyncThunk('menu/fetch', async (userId, { rejectWithValue }) => {
  const result = await menuService.getAllMenus(userId);
  if (!result.success) {
    return rejectWithValue(result.message || 'Unable to load menu.');
  }
  return Array.isArray(result.data) ? result.data : [];
});

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load menu.';
      });
  },
});

export default menuSlice.reducer;
