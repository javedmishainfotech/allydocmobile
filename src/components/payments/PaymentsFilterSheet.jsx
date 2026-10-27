import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatePickerSheet from '../DatePickerSheet';
import { formatDateLabel } from '../../utils/dateOnly';
import { getDefaultPaymentFilter } from '../../utils/paymentFields';
import { adTokens } from '../../theme/colors';

// Same options, in the same order, as the web's "Filter Payments" modal.
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'S', label: 'Success' },
  { value: 'F', label: 'Failure' },
  { value: 'I', label: 'Initiated' },
];
const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OT', label: 'One-Time Payment' },
  { value: 'BS', label: 'Buy Subscription' },
];

function ChoiceChips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.label}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const asDate = (iso) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

/** The web date input stores `new Date('YYYY-MM-DD').toISOString()` (UTC midnight of the picked day). */
const toIsoFromPicked = (date) => {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return new Date(day).toISOString();
};

/**
 * "Filter Payments" - port of the web modal: status, payment type and a From / To date. (The web
 * modal also shows a Transaction No. box, but never sends it with the request, so it is omitted.)
 */
export default function PaymentsFilterSheet({ visible, filter, onApply, onClose }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(filter);
  const [datePicking, setDatePicking] = useState(null); // 'from' | 'to' | null

  useEffect(() => {
    if (visible) setDraft(filter);
    // Re-seed from the applied filter each time the sheet opens, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const from = asDate(draft.dateFrom);
  const to = asDate(draft.dateTo);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Filter payments</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={20} color={adTokens.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Status</Text>
              <ChoiceChips
                options={STATUS_OPTIONS}
                value={draft.paymentStatus}
                onChange={(value) => setDraft((prev) => ({ ...prev, paymentStatus: value }))}
              />

              <Text style={styles.label}>Payment type</Text>
              <ChoiceChips
                options={TYPE_OPTIONS}
                value={draft.paymentType}
                onChange={(value) => setDraft((prev) => ({ ...prev, paymentType: value }))}
              />

              <Text style={styles.label}>From</Text>
              <Pressable style={styles.field} onPress={() => setDatePicking('from')}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
                <Text style={[styles.fieldText, !from && styles.placeholder]}>
                  {from ? formatDateLabel(from) : 'Select date'}
                </Text>
              </Pressable>

              <Text style={styles.label}>To</Text>
              <Pressable style={styles.field} onPress={() => setDatePicking('to')}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
                <Text style={[styles.fieldText, !to && styles.placeholder]}>
                  {to ? formatDateLabel(to) : 'Select date'}
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.clearButton} onPress={() => setDraft(getDefaultPaymentFilter())}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              >
                <Text style={styles.applyText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerSheet
        visible={datePicking === 'from'}
        title="From date"
        value={from}
        onSelect={(date) => setDraft((prev) => ({ ...prev, dateFrom: toIsoFromPicked(date) }))}
        onClose={() => setDatePicking(null)}
      />
      <DatePickerSheet
        visible={datePicking === 'to'}
        title="To date"
        value={to || from}
        onSelect={(date) => setDraft((prev) => ({ ...prev, dateTo: toIsoFromPicked(date) }))}
        onClose={() => setDatePicking(null)}
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
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },

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
  fieldText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },

  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  clearButton: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  clearText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  applyButton: { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: adTokens.primary, alignItems: 'center' },
  applyText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
});
