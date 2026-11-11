import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as supportService from '../../services/supportService';

/** Same thin, unwrap-only shape as the other recent slices - every consumer already branches on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. Only the 5 true `{success, data, message}`-envelope API calls are ported as
 * thunks; `checkAttachments` (pure sync), `downloadAttachmentToCache`/`shareAttachment` (throw-
 * or-boolean semantics, not the normalized envelope, and `shareAttachment` already fires its own
 * toast) stay as direct `supportService` imports, same as the constants
 * (`SUBJECT_OPTIONS`/`ATTACHMENT_MIME_TYPES`/etc). */
const initialState = {};

export const fetchMyTickets = createAsyncThunk('support/fetchMyTickets', (params) =>
  supportService.fetchMyTickets(params),
);

export const fetchMyTicket = createAsyncThunk('support/fetchMyTicket', (id) =>
  supportService.fetchMyTicket(id),
);

export const createTicket = createAsyncThunk('support/createTicket', (params) =>
  supportService.createTicket(params),
);

export const replyToTicket = createAsyncThunk(
  'support/replyToTicket',
  ({ id, message, files }) => supportService.replyToTicket(id, message, files),
);

export const closeTicket = createAsyncThunk('support/closeTicket', ({ id, remarks }) =>
  supportService.closeTicket(id, remarks),
);

const supportSlice = createSlice({
  name: 'support',
  initialState,
  reducers: {},
});

export default supportSlice.reducer;
