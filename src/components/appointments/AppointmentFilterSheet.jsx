import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DatePickerSheet from '../DatePickerSheet';
import { usePatients } from '../../hooks/usePatients';
import { localDateOnlyToApiString, formatDateLabel } from '../../utils/dateOnly';
import { adTokens } from '../../theme/colors';

// Same status options, in the same order, as the web's FilterAppointmentsModal.
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

/** The treatment-plan lists only offer these two statuses (web FilterTreatmentPlansModal). */
export const TREATMENT_PLAN_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'inprogress', label: 'In Progress' },
];

export const EMPTY_APPOINTMENT_FILTER = { status: [], fromDate: '', toDate: '', patientId: '', patientName: '' };

/** Which "person" the sheet filters by: a doctor filters by their patients, a patient by their
 * doctors (web: personFilterType). `idKey`/`nameKey` are the filter fields it reads and writes.
 * `load` must resolve to the old `{success, data}` service shape - callers that build this from
 * `usePatients()`'s unwrap-based `getDoctorPatientDropdown` wrap it to match (see `patientPerson`
 * below, and `AppointmentFilterSheet`'s own default). */
export const patientPerson = (load) => ({
  label: 'Patient',
  allLabel: 'All patients',
  searchPlaceholder: 'Search patients...',
  emptyText: 'No patients available',
  idKey: 'patientId',
  nameKey: 'patientName',
  load,
});

/** A patient's own doctors: `GET /PatientDoctorDropdown/{patientId}`. */
export const doctorPerson = (load) => ({
  label: 'Doctor',
  allLabel: 'All doctors',
  searchPlaceholder: 'Search doctors...',
  emptyText: 'No doctors available',
  idKey: 'doctorId',
  nameKey: 'doctorName',
  load,
});

const parseDay = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

function normalizePerson(row) {
  const id = row?.id ?? row?.userId ?? row?.patientId ?? row?.patientUserId ?? row?.doctorId ?? row?.doctorUserId;
  if (id == null || id === '') return null;
  const name = row?.name ?? row?.fullName ?? row?.patientName ?? row?.doctorName ?? `#${id}`;
  return { id: String(id), name: String(name) };
}

/** Searchable single-choice list of people ("All ..." clears it). */
function PersonPicker({ person, visible, people, loading, error, selectedId, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? people.filter((entry) => entry.name.toLowerCase().includes(needle)) : people;
  }, [people, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{person.label}</Text>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={adTokens.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={person.searchPlaceholder}
              placeholderTextColor={adTokens.textMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={styles.pickerState} color={adTokens.primary} />
          ) : error ? (
            <Text style={[styles.pickerState, styles.errorText]}>{error}</Text>
          ) : (
            <FlatList
              data={[{ id: '', name: person.allLabel }, ...shown]}
              keyExtractor={(patient) => patient.id || 'all'}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.pickerState}>{person.emptyText}</Text>}
              renderItem={({ item }) => {
                const active = String(selectedId) === item.id;
                return (
                  <Pressable
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>{item.name}</Text>
                    {active ? <MaterialCommunityIcons name="check" size={18} color={adTokens.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Filter sheet for the appointment lists - port of the web's FilterAppointmentsModal:
 * multi-select status, From / To date (To stays disabled until From is set and can never
 * be earlier than From), and the doctor's patients. `showRescheduledOption` is false for a
 * freelancer doctor (the web hides "Rescheduled" for them). The patient list is fetched
 * when the sheet opens, as the web does on `onEntered`.
 */
export default function AppointmentFilterSheet({
  visible,
  filter,
  person,
  title = 'Filter appointments',
  statusOptions: statusOptionsProp,
  showRescheduledOption = true,
  onApply,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { getDoctorPatientDropdown } = usePatients();
  const defaultPerson = useMemo(
    () =>
      patientPerson(() =>
        getDoctorPatientDropdown()
          .then((data) => ({ success: true, data }))
          .catch((message) => ({ success: false, message })),
      ),
    [getDoctorPatientDropdown],
  );
  const effectivePerson = person || defaultPerson;
  const [draft, setDraft] = useState(filter);
  const [datePicking, setDatePicking] = useState(null); // 'from' | 'to' | null
  const [personPickerOpen, setPersonPickerOpen] = useState(false);
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(null);
  const { idKey, nameKey } = effectivePerson;

  useEffect(() => {
    if (!visible) return undefined;
    setDraft(filter);
    let active = true;
    setPeopleLoading(true);
    setPeopleError(null);
    effectivePerson.load().then((response) => {
      if (!active) return;
      setPeopleLoading(false);
      if (!response.success) {
        setPeople([]);
        setPeopleError(response.message || `Could not load ${effectivePerson.label.toLowerCase()}s.`);
        return;
      }
      const rows = Array.isArray(response.data) ? response.data : [];
      setPeople(
        rows
          .map(normalizePerson)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      );
    });
    return () => {
      active = false;
    };
    // Re-seed from the applied filter each time the sheet opens, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const statusOptions =
    statusOptionsProp ??
    (showRescheduledOption ? STATUS_OPTIONS : STATUS_OPTIONS.filter((option) => option.value !== 'rescheduled'));
  const selectedStatuses = Array.isArray(draft.status) ? draft.status : [];

  const toggleStatus = (value) => {
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((status) => status !== value)
      : [...selectedStatuses, value];
    setDraft((prev) => ({ ...prev, status: next }));
  };

  const patch = (changes) => {
    setDraft((prev) => {
      const next = { ...prev, ...changes };
      // To can never be earlier than From (the web clamps it the same way).
      if (next.fromDate && next.toDate && next.toDate < next.fromDate) next.toDate = next.fromDate;
      return next;
    });
  };

  const fromDay = parseDay(draft.fromDate);
  const toDay = parseDay(draft.toDate);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Toast />
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={20} color={adTokens.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Status</Text>
              <View style={styles.chips}>
                <Pressable
                  style={[styles.chip, selectedStatuses.length === 0 && styles.chipActive]}
                  onPress={() => setDraft((prev) => ({ ...prev, status: [] }))}
                >
                  <Text style={[styles.chipText, selectedStatuses.length === 0 && styles.chipTextActive]}>All</Text>
                </Pressable>
                {statusOptions.map((option) => {
                  const active = selectedStatuses.includes(option.value);
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleStatus(option.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>From date</Text>
              <Pressable style={styles.field} onPress={() => setDatePicking('from')}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
                <Text style={[styles.fieldText, !fromDay && styles.placeholder]}>
                  {fromDay ? formatDateLabel(fromDay) : 'Select date'}
                </Text>
              </Pressable>

              <Text style={styles.label}>To date</Text>
              <Pressable
                style={[styles.field, !fromDay && styles.fieldDisabled]}
                disabled={!fromDay}
                onPress={() => setDatePicking('to')}
              >
                <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
                <Text style={[styles.fieldText, !toDay && styles.placeholder]}>
                  {toDay ? formatDateLabel(toDay) : 'Select date'}
                </Text>
              </Pressable>
              {!fromDay ? <Text style={styles.hint}>Select a From date first.</Text> : null}

              <Text style={styles.label}>{effectivePerson.label}</Text>
              <Pressable style={styles.field} onPress={() => setPersonPickerOpen(true)}>
                <MaterialCommunityIcons name="account-outline" size={18} color={adTokens.textMuted} />
                <Text style={[styles.fieldText, !draft[idKey] && styles.placeholder]} numberOfLines={1}>
                  {draft[idKey] ? draft[nameKey] || `Selected ${effectivePerson.label.toLowerCase()}` : effectivePerson.allLabel}
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={styles.resetButton}
                onPress={() => {
                  onApply({ status: [], fromDate: '', toDate: '', [idKey]: '', [nameKey]: '' });
                  onClose();
                }}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerSheet
        visible={datePicking === 'from'}
        title="From date"
        value={fromDay}
        onSelect={(date) => patch({ fromDate: localDateOnlyToApiString(date) })}
        onClear={() => patch({ fromDate: '', toDate: '' })}
        onClose={() => setDatePicking(null)}
      />
      <DatePickerSheet
        visible={datePicking === 'to'}
        title="To date"
        value={toDay || fromDay}
        onSelect={(date) => patch({ toDate: localDateOnlyToApiString(date) })}
        onClear={() => patch({ toDate: '' })}
        onClose={() => setDatePicking(null)}
      />
      <PersonPicker
        person={effectivePerson}
        visible={personPickerOpen}
        people={people}
        loading={peopleLoading}
        error={peopleError}
        selectedId={draft[idKey]}
        onSelect={(entry) => patch({ [idKey]: entry.id, [nameKey]: entry.id ? entry.name : '' })}
        onClose={() => setPersonPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '88%',
  },
  pickerSheet: { height: '75%' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 4 },

  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary, marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },
  hint: { fontSize: 11.5, color: adTokens.textMuted, marginTop: 4 },

  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  resetButton: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  resetText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  applyButton: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: adTokens.primary, alignItems: 'center' },
  applyText: { fontSize: 14, fontWeight: '700', color: adTokens.white },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: adTokens.gray100, borderRadius: 12, paddingHorizontal: 12, marginVertical: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10 },
  pickerRowActive: { backgroundColor: adTokens.primaryLight },
  pickerRowText: { fontSize: 14, color: adTokens.textPrimary },
  pickerRowTextActive: { fontWeight: '700', color: adTokens.primaryDark },
  pickerState: { textAlign: 'center', paddingVertical: 28, fontSize: 13, color: adTokens.textSecondary },
  errorText: { color: adTokens.danger },
});
