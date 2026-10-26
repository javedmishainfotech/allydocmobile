/**
 * Mobile port of AllyDocReactAppLatest's notification helpers (src/utils/index.jsx's
 * renderMessage/notificationVisual/timeAgo + src/utils/dateTimeUtils.js's instant parsing) -
 * trimmed to plain JS with no browser/Intl-timezone dependency, since the mobile list only
 * needs a short relative/absolute time, not the full timezone-abbreviation treatment the web
 * app layers on top for appointment rows.
 */

// A bare "YYYY-MM-DDTHH:mm:ss" with no trailing "Z"/offset is still a UTC instant per the
// backend's contract - treated as UTC here too, same as the web app, instead of letting
// `new Date(...)` silently reinterpret it as local time.
const DATE_TIME_NO_TZ_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function parseApiInstant(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized =
    typeof value === 'string' && DATE_TIME_NO_TZ_PATTERN.test(value.trim()) ? `${value.trim()}Z` : value;
  const date = normalized instanceof Date ? normalized : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "just now" / "5m ago" / "3h ago" / "yesterday" / "4d ago" / a short date past a week. */
export function timeAgo(value) {
  const date = parseApiInstant(value);
  if (!date) return '';
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Same category rules as the web app's notificationVisual(), mapped to MaterialCommunityIcons. */
const CATEGORIES = [
  { test: /pharmac|dosespot|prescri|rx/i, label: 'Pharmacy', icon: 'pill', tone: 'teal' },
  { test: /tfa|idp|verif/i, label: 'Verification', icon: 'shield-account-outline', tone: 'violet' },
  { test: /support|ticket/i, label: 'Support', icon: 'face-agent', tone: 'blue' },
  { test: /payment|refund|invoice|paid/i, label: 'Payment', icon: 'credit-card-outline', tone: 'green' },
  { test: /subscription|plan/i, label: 'Subscription', icon: 'crown-outline', tone: 'cyan' },
  { test: /call|video|audio/i, label: 'Call', icon: 'video-outline', tone: 'blue' },
  { test: /appointment|reminder|booking|booked|reschedul|cancel|schedule/i, label: 'Appointment', icon: 'calendar-outline', tone: 'amber' },
  { test: /feedback|rating|review/i, label: 'Feedback', icon: 'star-outline', tone: 'amber' },
];

export function notificationVisual(...texts) {
  const text = texts.filter(Boolean).join(' ');
  const match = CATEGORIES.find((category) => category.test.test(text));
  return match || { label: 'Update', icon: 'bell-outline', tone: 'slate' };
}

/** Strips the web app's `<a href="...">text</a>` join-call markup down to plain text -
 * the mobile app has no in-app video-call screen for this link to open yet. */
export function cleanNotificationMessage(message) {
  const text = String(message ?? '');
  const match = text.match(/<a href="([^"]*)">([^<]*)<\/a>/);
  if (!match) return text;
  const [fullMatch, , linkText] = match;
  return text.split(fullMatch).join(linkText);
}

export function formatUnreadCount(count) {
  if (!count || count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}
