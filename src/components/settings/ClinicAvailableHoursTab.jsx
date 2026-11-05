import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  getDailyAvailableHours,
  getDuration,
  getDoctorTimeZone,
  getTimeZones,
  saveWeeklySchedule,
} from '../../services/settingsService';
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
  return DAYS_OF_WEEK.map((name) => ({ name, enabled: false, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME }));
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
 * web's `<input type="time">` produces. */
export default function ClinicAvailableHoursTab() {
  const { profile } = useAuth();
  const userId = profile?.userId;

  const [days, setDays] = useState(buildDefaultDays());
  const [timeZoneId, setTimeZoneId] = useState(DEFAULT_TIME_ZONE_ID);
  const [timeZoneOptions, setTimeZoneOptions] = useState(FALLBACK_TIME_ZONE_OPTIONS);
  const [duration, setDuration] = useState('');
  const [savedDuration, setSavedDuration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          if (!existing) return { name, enabled: false, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };
          return {
            name,
            enabled: true,
            startTime: String(existing.startTime || DEFAULT_START_TIME).slice(0, 5),
            endTime: String(existing.endTime || DEFAULT_END_TIME).slice(0, 5),
          };
        }),
      );
    }
    if (durationRes.success) {
      const savedValue = durationRes.data?.durationOfAppointment;
      setDuration(savedValue != null ? String(savedValue) : '');
      setSavedDuration(savedValue != null ? String(savedValue) : '');
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
        <Text style={styles.cardSubtitle}>Choose the days you are available and set your working hours.</Text>

        {days.map((d, index) => (
          <View key={d.name} style={styles.dayRow}>
            <View style={styles.dayToggleRow}>
              <Switch value={d.enabled} onValueChange={() => toggleDay(index)} trackColor={{ true: adTokens.primary }} />
              <Text style={styles.dayLabel}>{d.name}</Text>
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
            </View>
          </View>
        ))}

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
  dayRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  dayToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
