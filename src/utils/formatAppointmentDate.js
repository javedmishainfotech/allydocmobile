/**
 * Simplified port of getAppointmentDisplayPreferServer in
 * AllyDocReactApp/src/utils/dateTimeUtils.js. The web version has a long
 * fallback chain (server UTC instant -> several legacy local date+time
 * field combinations) for appointments created before the backend started
 * returning `appointmentStartUtc`. This mobile version only handles the
 * current, server-UTC-instant shape (`appointmentStartUtc`) - legacy
 * fallback fields can be added here if real data surfaces needing them.
 */
export function getAppointmentDisplay(appointment) {
  const raw = appointment?.appointmentStartUtc;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { date: '-', time: '-', timeWithZone: '-', instantMs: null };
  }

  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  let zoneAbbr = '';
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(
      date,
    );
    zoneAbbr = parts.find((part) => part.type === 'timeZoneName')?.value || '';
  } catch {
    zoneAbbr = '';
  }

  return {
    date: dateStr,
    time: timeStr,
    timeWithZone: zoneAbbr ? `${timeStr} (${zoneAbbr})` : timeStr,
    instantMs: date.getTime(),
  };
}
