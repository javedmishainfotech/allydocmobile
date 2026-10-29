// Shared formatting helpers for the Support ticket system (port of web's SupportPage.jsx helpers).

export const LIFECYCLE_STEPS = ['New', 'In Progress', 'Resolved', 'Closed'];

export const STATUS_TONES = {
  New: 'info',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'neutral',
};

export function formatDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

/** Works for both a picked local file and a server attachment. */
export function fileMeta(attachment) {
  return {
    name: attachment.fileName || attachment.name || 'attachment',
    size: attachment.sizeBytes ?? attachment.size ?? 0,
    type: attachment.contentType || attachment.mimeType || attachment.type || '',
  };
}

export function isImageAttachment(attachment) {
  const { name, type } = fileMeta(attachment);
  return type ? type.startsWith('image/') : /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

export function isPdfAttachment(attachment) {
  const { name, type } = fileMeta(attachment);
  return type ? type === 'application/pdf' : /\.pdf$/i.test(name);
}

export function attachmentIcon(attachment) {
  if (isPdfAttachment(attachment)) return 'file-pdf-box';
  if (isImageAttachment(attachment)) return 'file-image-outline';
  return 'paperclip';
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
