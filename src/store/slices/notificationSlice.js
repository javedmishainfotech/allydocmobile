import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as notificationService from '../../services/notificationService';

/**
 * Mirrors the web app's NotificationContext.jsx: two lists (all / unread) plus
 * a standalone unread count so the navbar badge can refresh independently of
 * whichever tab the Notifications screen currently has open.
 */

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  unreadStatus: 'idle',
  items: [], // whichever tab was last fetched (see `tab`)
  tab: 'all', // 'all' | 'unread'
  total: 0,
  unreadCount: 0,
  error: null,
};

// Newest first, with `id` as a tiebreaker - mirrors the web app's sortNotifications()
// so repeated fetches of the same data always render in the same order, since the
// backend doesn't guarantee stable ordering across calls.
function sortNotifications(list) {
  return [...list].sort((a, b) => {
    const timeDiff = (new Date(b?.time).getTime() || 0) - (new Date(a?.time).getTime() || 0);
    if (timeDiff !== 0) return timeDiff;
    return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
  });
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (tab = 'all', { rejectWithValue }) => {
    const result =
      tab === 'unread'
        ? await notificationService.getUnreadNotifications()
        : await notificationService.getAllNotifications();
    if (result.message) return rejectWithValue(result.message);
    return { tab, total: result.total, items: sortNotifications(result.items) };
  },
);

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async () => {
  const result = await notificationService.getUnreadNotifications();
  return result.total;
});

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async ({ id, source }, { rejectWithValue }) => {
    const result = await notificationService.markNotificationAsRead(id, source);
    if (!result.success) return rejectWithValue(result.message || 'Unable to mark as read.');
    return { id };
  },
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tab = action.payload.tab;
        state.items = action.payload.items;
        state.total = action.payload.total;
        if (action.payload.tab === 'unread') state.unreadCount = action.payload.total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load notifications.';
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadStatus = 'succeeded';
        state.unreadCount = action.payload;
      })
      .addCase(markNotificationRead.pending, (state, action) => {
        // Optimistic update, mirroring the web app's NotificationContext.markAsRead -
        // the row flips to read immediately rather than waiting on the round trip.
        const row = state.items.find((item) => item.id === action.meta.arg.id);
        if (row && !row.isRead) {
          row.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        const row = state.items.find((item) => item.id === action.meta.arg.id);
        if (row) {
          row.isRead = false;
          state.unreadCount += 1;
        }
      });
  },
});

export default notificationSlice.reducer;
