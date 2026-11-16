import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const FALLBACK_TIME_ZONE_OPTIONS = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { id: 'America/New_York', label: 'America/New_York (EST/EDT)' },
];
const DEFAULT_TIME_ZONE_ID = 'Asia/Kolkata';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '17:00';
const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
];

function buildDefaultDays() {
  return DAYS_OF_WEEK.map((name) => ({
    name,
    enabled: false,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    scheduleId: null,
  }));
}

function timeStringToDate(value) {
  const [hours, minutes] = String(value || DEFAULT_START_TIME).split(':').map((n) => parseInt(n, 10) || 0);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function dateToTimeString(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "09:00" -> "9:00 AM" - web's native `<input type="time">` displays times in the browser's own
 * locale format; this is the mobile equivalent for the read-only field display. */
function formatTimeDisplay(value) {
  const [hours, minutes] = String(value || '').split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Port of AllyDocReactApp/.../Settings/MyAvailableHours.jsx (Clinic Admin's weekly schedule
 * editor): timezone + default appointment duration, then per-day enable/start/end time, saved
 * via `POST /SaveWeeklySchedule`. Times use a plain "HH:MM" (24h) text field, same value shape
 * web's `<input type="time">` produces.
 *
 * Also ports the granular per-entry CRUD that the web app's AddScheduleModal.jsx /
 * DailyAvailbleHours.jsx + its Add/UpdateDuration button expose (the older, still-live wiring
 * in AllyDocReactApp - the "Latest" web app kept the Add/Update/DeleteSchedule and
 * Add/UpdateDuration actions but currently only drives them from that same component tree):
 * each day row below gets its own Save/Delete action (AddSchedule/UpdateSchedule/DeleteSchedule,
 * keyed by the row's `scheduleId`) so one day can be added, edited or removed without resaving
 * the whole week, and the duration chips get their own Save action (AddDuration/UpdateDuration,
 * keyed by `durationId`) so the default duration can be set independently of the bulk save. */
export default function ClinicAvailableHoursTab() {
  const { profile } = useAuth();
  const {
    getDailyAvailableHours,
    getDuration,
    getDoctorTimeZone,
    getTimeZones,
    saveWeeklySchedule,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    addDuration,
    updateDuration,
  } = useSettings();
  const userId = profile?.userId;

  const [days, setDays] = useState(buildDefaultDays());
  const [timeZoneId, setTimeZoneId] = useState(DEFAULT_TIME_ZONE_ID);
  const [timeZoneOptions, setTimeZoneOptions] = useState(FALLBACK_TIME_ZONE_OPTIONS);
  const [duration, setDuration] = useState('');
  const [savedDuration, setSavedDuration] = useState('');
  const [durationId, setDurationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [durationSaving, setDurationSaving] = useState(false);
  // Which day's single-slot Save or Delete action is in flight, e.g. "Monday-save" - only one
  // row action at a time, independent of the bulk `saving` flag above.
  const [rowActionKey, setRowActionKey] = useState(null);
  const [formError, setFormError] = useState('');
  // Which day/field's native time picker is currently open - only one at a time.
  const [activePicker, setActivePicker] = useState(null); // { index, field }

  const selectedTimeZoneLabel = timeZoneOptions.find((tz) => tz.id === timeZoneId)?.label || timeZoneId;

  const loadAvailability = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [hoursRes, durationRes, timeZoneRes, timeZoneListRes] = await Promise.all([
      getDailyAvailableHours(userId),
      getDuration(userId),
      getDoctorTimeZone(userId),
      getTimeZones(),
    ]);

    if (timeZoneListRes.success && timeZoneListRes.data?.length) {
      setTimeZoneOptions(timeZoneListRes.data.map((tz) => ({ id: tz.ianaId, label: tz.displayName })));
    }
    if (timeZoneRes.success && timeZoneRes.data?.timeZoneId) {
      setTimeZoneId(timeZoneRes.data.timeZoneId);
    }
    if (hoursRes.success) {
      const existingByDay = new Map((hoursRes.data || []).map((entry) => [String(entry.day).trim().toLowerCase(), entry]));
      setDays(
        DAYS_OF_WEEK.map((name) => {
          const existing = existingByDay.get(name.toLowerCase());
          if (!existing) {
            return { name, enabled: false, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME, scheduleId: null };
          }
          return {
            name,
            enabled: true,
            startTime: String(existing.startTime || DEFAULT_START_TIME).slice(0, 5),
            endTime: String(existing.endTime || DEFAULT_END_TIME).slice(0, 5),
            scheduleId: existing.id ?? null,
          };
        }),
      );
    }
    if (durationRes.success) {
      // GET /Duration returns the raw FacilityMaster entity - durationOfAppointment is the
      // saved value, `id` is what Add/UpdateDuration needs to tell which call to make.
      const savedValue = durationRes.data?.durationOfAppointment;
      setDuration(savedValue != null ? String(savedValue) : '');
      setSavedDuration(savedValue != null ? String(savedValue) : '');
      setDurationId(durationRes.data?.id ?? null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const toggleDay = (index) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d)));
  };

  const updateDayTime = (index, field, value) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const handleSave = async () => {
    setFormError('');
    const enabledDays = days.filter((d) => d.enabled);
    if (enabledDays.length === 0) {
      setFormError('Select at least one day.');
      return;
    }
    if (!duration) {
      setFormError('Please set an appointment duration.');
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const d of enabledDays) {
      if (!timePattern.test(d.startTime) || !timePattern.test(d.endTime) || d.startTime >= d.endTime) {
        setFormError(`${d.name}: enter valid times (HH:MM) with end time after start time.`);
        return;
      }
    }

    setSaving(true);
    const res = await saveWeeklySchedule({
      userId,
      timeZoneId,
      duration,
      days: days.map((d) => ({ day: d.name, enabled: d.enabled, startTime: d.startTime, endTime: d.endTime })),
    });
    setSaving(false);
    if (res.success) {
      toast.success(res.message || 'Availability saved.');
      loadAvailability();
    } else {
      toast.error(res.message || 'Error saving availability.');
    }
  };

  /** Granular duration save - AddDuration if none is saved yet, UpdateDuration otherwise.
   * Independent of handleSave's bulk SaveWeeklySchedule, which also carries `duration` along. */
  const handleSaveDuration = async () => {
    if (!duration) {
      toast.error('Select a duration first.');
      return;
    }
    setDurationSaving(true);
    const res = durationId
      ? await updateDuration({ id: durationId, duration })
      : await addDuration({ userId, duration });
    setDurationSaving(false);
    if (res.success) {
      toast.success(res.message || 'Duration saved.');
      loadAvailability();
    } else {
      toast.error(res.message || 'Unable to save duration.');
    }
  };

  /** Granular single-day save - AddSchedule for a day with no scheduleId yet, UpdateSchedule
   * for one that already has a saved slot. Only touches this one day's row. */
  const handleSaveDaySlot = async (index) => {
    const d = days[index];
    if (!d.enabled) {
      setFormError(`Enable ${d.name} before saving it.`);
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(d.startTime) || !timePattern.test(d.endTime) || d.startTime >= d.endTime) {
      setFormError(`${d.name}: enter valid times (HH:MM) with end time after start time.`);
      return;
    }
    setFormError('');
    setRowActionKey(`${d.name}-save`);
    const payload = { day: d.name, userId, startTime: d.startTime, endTime: d.endTime, timeZoneId };
    const res = d.scheduleId
      ? await updateSchedule({ ...payload, id: d.scheduleId })
      : await addSchedule(payload);
    setRowActionKey(null);
    if (res.success) {
      toast.success(res.message || `${d.name} slot saved.`);
      loadAvailability();
    } else {
      toast.error(res.message || `Unable to save ${d.name}'s slot.`);
    }
  };

  /** Granular single-day delete - DeleteSchedule by scheduleId, leaving every other day alone. */
  const handleDeleteDaySlot = async (index) => {
    const d = days[index];
    if (!d.scheduleId) return;
    setRowActionKey(`${d.name}-delete`);
    const res = await deleteSchedule(d.scheduleId);
    setRowActionKey(null);
    if (res.success) {
      toast.success(res.message || `${d.name} slot deleted.`);
      loadAvailability();
    } else {
      toast.error(res.message || `Unable to delete ${d.name}'s slot.`);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  return (
    <View>
      <Text style={styles.heading}>Create Availability Slots</Text>
      <Text style={styles.subheading}>
        Set your working hours and generate appointment slots. Clients across the world will see the time in their
        local timezone.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Basic Settings</Text>

        <Text style={styles.label}>Timezone *</Text>
        <View style={styles.chipWrap}>
          {timeZoneOptions.map((tz) => (
            <Pressable
              key={tz.id}
              style={[styles.chip, timeZoneId === tz.id && styles.chipActive]}
              onPress={() => setTimeZoneId(tz.id)}
            >
              <Text style={[styles.chipText, timeZoneId === tz.id && styles.chipTextActive]}>{tz.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Default Appointment Duration *</Text>
        <View style={styles.chipWrap}>
          {DURATION_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, duration === opt.value && styles.chipActive]}
              onPress={() => setDuration(opt.value)}
            >
              <Text style={[styles.chipText, duration === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.saveDurationButton, (!duration || durationSaving) && styles.disabledButton]}
            disabled={!duration || durationSaving}
            onPress={handleSaveDuration}
          >
            {durationSaving ? (
              <ActivityIndicator size={13} color={adTokens.white} />
            ) : (
              <>
                <Feather name="save" size={12} color={adTokens.white} />
                <Text style={styles.saveDurationButtonText}>{durationId ? 'Update' : 'Save'}</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Feather name="info" size={13} color={adTokens.infoDark} />
          <Text style={styles.infoText}>
            You are creating slots in <Text style={styles.bold}>{selectedTimeZoneLabel}</Text> timezone.
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Feather name="clock" size={13} color={adTokens.infoDark} />
          <Text style={styles.infoText}>
            Current saved default duration:{' '}
            <Text style={styles.bold}>{savedDuration ? `${savedDuration} minutes` : 'Not set yet'}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Days &amp; Timing</Text>
        <Text style={styles.cardSubtitle}>
          Choose the days you are available and set your working hours. Use "Save Availability" below to save every
          day at once, or the per-day icons to save/delete just that one day's slot.
        </Text>

        {days.map((d, index) => {
          const isRowSaving = rowActionKey === `${d.name}-save`;
          const isRowDeleting = rowActionKey === `${d.name}-delete`;
          const isRowBusy = isRowSaving || isRowDeleting;
          return (
            <View key={d.name} style={styles.dayRow}>
              <View style={styles.dayToggleRow}>
                <Switch value={d.enabled} onValueChange={() => toggleDay(index)} trackColor={{ true: adTokens.primary }} />
                <Text style={styles.dayLabel}>{d.name}</Text>
                {d.scheduleId ? <Text style={styles.savedBadge}>Saved</Text> : null}
              </View>
              <View style={styles.timeRow}>
                <Pressable
                  style={[styles.timeField, !d.enabled && styles.timeFieldDisabled]}
                  disabled={!d.enabled}
                  onPress={() => setActivePicker({ index, field: 'startTime' })}
                >
                  <Feather name="clock" size={13} color={d.enabled ? adTokens.textSecondary : adTokens.textMuted} />
                  <Text style={[styles.timeFieldText, !d.enabled && styles.timeFieldTextDisabled]}>
                    {formatTimeDisplay(d.startTime)}
                  </Text>
                </Pressable>
                <Text style={styles.toText}>to</Text>
                <Pressable
                  style={[styles.timeField, !d.enabled && styles.timeFieldDisabled]}
                  disabled={!d.enabled}
                  onPress={() => setActivePicker({ index, field: 'endTime' })}
                >
                  <Feather name="clock" size={13} color={d.enabled ? adTokens.textSecondary : adTokens.textMuted} />
                  <Text style={[styles.timeFieldText, !d.enabled && styles.timeFieldTextDisabled]}>
                    {formatTimeDisplay(d.endTime)}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.rowActionButton}
                  disabled={!d.enabled || isRowBusy}
                  onPress={() => handleSaveDaySlot(index)}
                  hitSlop={6}
                >
                  {isRowSaving ? (
                    <ActivityIndicator size={13} color={adTokens.primary} />
                  ) : (
                    <Feather name={d.scheduleId ? 'edit-2' : 'plus-circle'} size={15} color={d.enabled ? adTokens.primary : adTokens.textMuted} />
                  )}
                </Pressable>
                {d.scheduleId ? (
                  <Pressable
                    style={styles.rowActionButton}
                    disabled={isRowBusy}
                    onPress={() => handleDeleteDaySlot(index)}
                    hitSlop={6}
                  >
                    {isRowDeleting ? (
                      <ActivityIndicator size={13} color={adTokens.danger} />
                    ) : (
                      <Feather name="trash-2" size={15} color={adTokens.danger} />
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        {activePicker ? (
          <DateTimePicker
            value={timeStringToDate(days[activePicker.index][activePicker.field])}
            mode="time"
            onChange={(event, date) => {
              const { index, field } = activePicker;
              setActivePicker(null);
              if (event.type !== 'dismissed' && date) updateDayTime(index, field, dateToTimeString(date));
            }}
          />
        ) : null}
      </View>

      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

      <View style={styles.footerRow}>
        <Pressable style={styles.cancelButton} onPress={loadAvailability} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveButtonText}>Save Availability</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 40 },
  heading: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  subheading: { fontSize: 12, color: adTokens.textSecondary, marginTop: 4, marginBottom: 16, lineHeight: 17 },
  card: { backgroundColor: adTokens.gray50, borderRadius: 12, padding: 14, marginBottom: 16 },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginTop: 10, marginBottom: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: adTokens.infoLight, borderRadius: 8, padding: 10, marginTop: 10 },
  infoText: { fontSize: 11.5, color: adTokens.infoDark, flex: 1, lineHeight: 16 },
  bold: { fontWeight: '700' },
  saveDurationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: adTokens.primaryDark || adTokens.primary,
  },
  saveDurationButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.white },
  dayRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  dayToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  savedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: adTokens.primaryDark || adTokens.primary,
    backgroundColor: adTokens.primaryTint || adTokens.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowActionButton: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  timeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: adTokens.white,
  },
  timeFieldDisabled: { backgroundColor: adTokens.gray100 },
  timeFieldText: { fontSize: 13, color: adTokens.textPrimary },
  timeFieldTextDisabled: { color: adTokens.textMuted },
  toText: { fontSize: 12, color: adTokens.textSecondary },
  errorText: { fontSize: 12, color: adTokens.danger, marginBottom: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 140, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
