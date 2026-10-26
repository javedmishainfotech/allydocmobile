/**
 * Port of localDateOnlyToApiString in AllyDocReactApp/src/utils/dateTimeUtils.js:
 * formats a Date using its LOCAL calendar date components (no "Z", no UTC
 * conversion), since a raw `.toISOString()` can shift the effective day
 * depending on the caller's timezone and time of day.
 */
export function localDateOnlyToApiString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
