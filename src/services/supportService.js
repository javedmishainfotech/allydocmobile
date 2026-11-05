// Expo 58's expo-file-system switched its main import to the new File/Directory API; downloadAsync /
// cacheDirectory (what this needs) still live under the explicit `/legacy` entry point.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';
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
export async function fetchMyTickets({ status, search } = {}) {
  const params = { page: 1, pageSize: 100 };
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;
  try {
    const response = await apiClient.get('/api/Support/Tickets', { params });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** One of my tickets with its attachments and conversation. */
export async function fetchMyTicket(id) {
  try {
    const response = await apiClient.get(`/api/Support/Tickets/${encodeURIComponent(id)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** New ticket; name and e-mail are taken from the account on the server. Returns { id, ticketNumber }. */
export async function createTicket({ subject, message, files = [] }) {
  try {
    const response = await apiClient.post('/api/Support/Tickets', toForm({ subject, message }, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Adds my reply (with optional attachments); returns the updated ticket. */
export async function replyToTicket(id, message, files = []) {
  try {
    const response = await apiClient.post(`/api/Support/Tickets/${encodeURIComponent(id)}/Replies`, toForm({ message }, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Closes my ticket with optional remarks; returns the updated ticket. */
export async function closeTicket(id, remarks) {
  try {
    const response = await apiClient.post(`/api/Support/Tickets/${encodeURIComponent(id)}/Close`, { remarks: remarks || null });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Downloads one of my attachments (auth'd) to a cache file and returns its local `file://` uri -
 * the mobile equivalent of web's "open in a new tab" (files are only served to their owner), but
 * as a local file an in-app preview (Image / WebView) can render directly, rather than always
 * handing off to the OS share sheet. */
export async function downloadAttachmentToCache(attachment) {
  const token = await getItem('auth_token');
  const baseUrl = Constants.expoConfig?.extra?.apiBaseUrl || '';
  const fileUri = `${FileSystem.cacheDirectory}${attachment.fileName || attachment.name || `attachment-${attachment.id}`}`;
  const result = await FileSystem.downloadAsync(`${baseUrl}/api/Support/Attachments/${encodeURIComponent(attachment.id)}`, fileUri, {
    headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
  });
  if (result.status !== 200) throw new Error(`Download failed (${result.status})`);
  return result.uri;
}

/** Explicit "share / save a copy" action (the OS share sheet) - no longer what tapping an
 * attachment does by itself; now only reached via a deliberate "Share" button in the preview. */
export async function shareAttachment(attachment, localUri) {
  try {
    const uri = localUri || (await downloadAttachmentToCache(attachment));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: attachment.contentType || attachment.type });
    }
    return true;
  } catch (_error) {
    toast.error(`Could not share "${attachment.fileName || attachment.name || 'attachment'}".`);
    return false;
  }
}
