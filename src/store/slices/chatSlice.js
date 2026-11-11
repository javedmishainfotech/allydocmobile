import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as chatService from '../../services/chatService';

/**
 * Same thin, unwrap-only shape as bookingSlice/callSlice: consumers already branch on
 * `result.success`/`result.message`/`result.raw` directly, so these thunks always fulfill with the
 * full raw result object. `uploadChatImages`'s `onProgress` callback makes its thunk arg
 * non-serializable by design (a progress callback, not state) - ignored via
 * `store/index.js`'s `serializableCheck.ignoredActionPaths` rather than restructuring the call.
 * `SIGNALR_URL` is a plain config constant (not an API call) - stays a direct `chatService` import.
 */
const initialState = {};

export const uploadChatImages = createAsyncThunk(
  'chat/uploadChatImages',
  ({ images, onProgress }) => chatService.uploadChatImages(images, onProgress),
);

export const createChatRoom = createAsyncThunk('chat/createChatRoom', (params) =>
  chatService.createChatRoom(params),
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {},
});

export default chatSlice.reducer;
