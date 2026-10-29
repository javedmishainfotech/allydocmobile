// Expo 58's expo-file-system switched its main import to the new File/Directory API; downloadAsync /
// cacheDirectory (what this needs) still live under the explicit `/legacy` entry point.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';
import { getItem } from '../utils/storage';
import { toast } from '../utils/toast';

/** Port of AllyDocReactApp/src/module/Support/supportStore.js - the user-panel "My Support Tickets"
 * API. Tickets belong to the logged-in user on the server (from the session token). */

export const SUBJECT_OPTIONS = ['General Inquiry', 'Appointment Support', 'Billing', 'Technical Issue', 'EPCS Question', 'Other'];

// Same rules the API enforces: PDF / PNG / JPG / WEBP, 5 MB each, 5 files per message.
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const MESSAGE_MAX = 1000;
export const REPLY_MAX = 2000;
export const REMARKS_MAX = 500;

/** Checks picked files (from expo-document-picker, `{name, size, mimeType, uri}`) against the upload
 * rules; returns { accepted, errors }. */
export function checkAttachments(existing, picked) {
  const errors = [];
  const accepted = [];
  for (const file of picked) {
    const mimeType = file.mimeType || file.type || '';
    if (!ATTACHMENT_MIME_TYPES.includes(mimeType)) {
      errors.push(`${file.name}: only PDF, PNG, JPG or WEBP files are allowed.`);
    } else if (file.size > MAX_ATTACHMENT_SIZE) {
      errors.push(`${file.name}: larger than 5 MB.`);
    } else if (existing.length + accepted.length >= MAX_ATTACHMENTS) {
      errors.push(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      break;
    } else if (!existing.some((f) => f.name === file.name && f.size === file.size)) {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}

function toForm(fields, files = []) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value);
  });
  files.forEach((file) => {
    form.append('attachments', { uri: file.uri, name: file.name, type: file.mimeType || file.type || 'application/octet-stream' });
  });
  return form;
}

/** My tickets (newest activity first) plus counts per status. */
export function fetchMyTickets({ status, search } = {}) {
  const params = { page: 1, pageSize: 100 };
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;
  return callApi(() => apiClient.get('/api/Support/Tickets', { params }));
}

/** One of my tickets with its attachments and conversation. */
export function fetchMyTicket(id) {
  return callApi(() => apiClient.get(`/api/Support/Tickets/${encodeURIComponent(id)}`));
}

/** New ticket; name and e-mail are taken from the account on the server. Returns { id, ticketNumber }. */
export function createTicket({ subject, message, files = [] }) {
  return callApi(() =>
    apiClient.post('/api/Support/Tickets', toForm({ subject, message }, files), { headers: { 'Content-Type': 'multipart/form-data' } }),
  );
}

/** Adds my reply (with optional attachments); returns the updated ticket. */
export function replyToTicket(id, message, files = []) {
  return callApi(() =>
    apiClient.post(`/api/Support/Tickets/${encodeURIComponent(id)}/Replies`, toForm({ message }, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

/** Closes my ticket with optional remarks; returns the updated ticket. */
export function closeTicket(id, remarks) {
  return callApi(() => apiClient.post(`/api/Support/Tickets/${encodeURIComponent(id)}/Close`, { remarks: remarks || null }));
}

/** Downloads one of my attachments (auth'd) to a temp file, then opens the native share/open sheet -
 * the mobile equivalent of web's "open in a new tab" (files are only served to their owner). */
export async function openAttachment(attachment) {
  try {
    const token = await getItem('auth_token');
    const baseUrl = Constants.expoConfig?.extra?.apiBaseUrl || '';
    const fileUri = `${FileSystem.cacheDirectory}${attachment.fileName || attachment.name || `attachment-${attachment.id}`}`;
    const result = await FileSystem.downloadAsync(`${baseUrl}/api/Support/Attachments/${encodeURIComponent(attachment.id)}`, fileUri, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    });
    if (result.status !== 200) throw new Error(`Download failed (${result.status})`);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, { mimeType: attachment.contentType || attachment.type });
    }
    return true;
  } catch (_error) {
    toast.error(`Could not open "${attachment.fileName || attachment.name || 'attachment'}".`);
    return false;
  }
}
