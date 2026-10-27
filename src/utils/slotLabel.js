// Port of getSlotRangeLabel in AllyDocReactApp/src/utils/dateTimeUtils.js.

const toValidDate = (value) => {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDay = (date) => date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
const formatTime = (date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * A schedule slot as "<date>, <start> - <end>" in the VIEWER's own timezone. The date is repeated on
 * the end side only when the converted range crosses into another calendar day for this viewer.
 * Falls back to slotDisplay / startTime for legacy slots without startTimeUtc / endTimeUtc.
 */
export function getSlotRangeLabel(slot) {
  if (typeof slot === 'string') return slot;
  if (slot?.startTimeUtc && slot?.endTimeUtc) {
    const start = toValidDate(slot.startTimeUtc);
    const end = toValidDate(slot.endTimeUtc);
    if (start && end) {
      const startDay = formatDay(start);
      const endDay = formatDay(end);
      return startDay === endDay
        ? `${startDay}, ${formatTime(start)} - ${formatTime(end)}`
        : `${startDay}, ${formatTime(start)} - ${endDay}, ${formatTime(end)}`;
    }
  }
  return slot?.slotDisplay || slot?.startTime || '';
}

/** The value the booking call sends for a slot (web: getSlotValue in Step3). */
export function getSlotValue(slot) {
  if (typeof slot === 'string') return slot.split(':')[0]?.trim() || slot;
  return slot?.startTime || slot?.slotDisplay || '';
}
