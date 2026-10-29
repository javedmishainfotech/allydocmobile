import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { getPrescriptionStatusTone } from '../../utils/treatmentPlanFields';
import { adTokens } from '../../theme/colors';

const TONES = {
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  primary: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textPrimary },
};

export const rxField = (rx, ...keys) => {
  for (const key of keys) if (rx?.[key] !== undefined && rx?.[key] !== null && rx?.[key] !== '') return rx[key];
  return null;
};
export const rxIdOf = (rx) => rxField(rx, 'PrescriptionId', 'prescriptionId', 'doseSpotPrescriptionId');
export const rxNameOf = (rx) => rxField(rx, 'DisplayName', 'displayName', 'medicationDisplayName', 'DrugName') || 'Prescription';
export const rxTypeOf = (rx) => String(rxField(rx, 'Type', 'type', 'prescriptionType') || 'Coded');

/** One "Items to prescribe" card (web AddPrescription step 2 right column). */
export default function PrescriptionItemCard({ rx, selectable, selected, onToggle, canModify, busy, onEdit, onDelete, onBenefits }) {
  const status = rxField(rx, 'Status', 'status');
  const tone = TONES[getPrescriptionStatusTone(status)] || TONES.neutral;
  const type = rxTypeOf(rx);
  const freeTextType = rxField(rx, 'FreeTextType', 'freeTextType');
  const isCoded = type.toLowerCase() === 'coded' && rxField(rx, 'DispensableDrugId', 'dispensableDrugId');
  const schedule = Number(rxField(rx, 'Schedule', 'schedule') ?? 0);
  const isEpcs = schedule >= 2 && schedule <= 5;
  const apptId = rxField(rx, 'AppointmentId', 'appointmentId');

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.top}>
        {selectable ? (
          <Pressable onPress={onToggle} hitSlop={8}>
            <Feather name={selected ? 'check-square' : 'square'} size={20} color={selected ? adTokens.primaryDark : adTokens.textSecondary} />
          </Pressable>
        ) : null}
        <View style={styles.flex1}>
          <Text style={styles.name}>{rxNameOf(rx)}</Text>
          {isCoded ? (
            <View style={[styles.epcs, { backgroundColor: isEpcs ? adTokens.dangerLight : adTokens.successLight }]}>
              <Text style={[styles.epcsText, { color: isEpcs ? adTokens.dangerDark : adTokens.successDark }]}>{isEpcs ? 'EPCS' : 'Not EPCS'}</Text>
            </View>
          ) : null}
        </View>
        {canModify ? (
          busy ? (
            <ActivityIndicator size="small" color={adTokens.danger} />
          ) : (
            <Pressable style={styles.deleteButton} onPress={onDelete} hitSlop={6}>
              <Feather name="x" size={16} color={adTokens.danger} />
            </Pressable>
          )
        ) : null}
      </View>

      {rxField(rx, 'Directions', 'directions') ? <Text style={styles.directions}>{rxField(rx, 'Directions', 'directions')}</Text> : null}
      <Text style={styles.meta}>
        Dispense: {rxField(rx, 'Quantity', 'quantity') ?? '—'}    Refills: {rxField(rx, 'Refills', 'refills') ?? 0}
      </Text>

      <View style={styles.footer}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {type.toUpperCase()}
            {freeTextType ? ` · ${String(freeTextType).toUpperCase()}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>{status || 'Unknown'}</Text>
        </View>
        {apptId ? (
          <View style={styles.apptPill}>
            <Text style={styles.apptText}>Appt ID: {apptId}</Text>
          </View>
        ) : null}
        <View style={styles.flex1} />
        {isCoded && onBenefits ? (
          <Pressable style={styles.benefitsButton} onPress={onBenefits} hitSlop={6}>
            <Feather name="shield" size={13} color={adTokens.infoDark} />
            <Text style={styles.benefitsText}>Benefits</Text>
          </Pressable>
        ) : null}
        {canModify && onEdit ? (
          <Pressable style={styles.editButton} onPress={onEdit} hitSlop={6}>
            <Feather name="edit-2" size={14} color={adTokens.primaryDark} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  cardSelected: { borderColor: adTokens.primary, borderWidth: 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex1: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#16A34A' },
  epcs: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  epcsText: { fontSize: 11, fontWeight: '800' },
  deleteButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.dangerLight },
  directions: { fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19 },
  meta: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  typeBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: adTokens.gray100 },
  typeText: { fontSize: 10.5, fontWeight: '800', color: adTokens.textPrimary, letterSpacing: 0.4 },
  pill: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800' },
  apptPill: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, backgroundColor: adTokens.primaryLight },
  apptText: { fontSize: 11, fontWeight: '700', color: adTokens.primaryDark },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.primary },
  editText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },
  benefitsButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.infoDark },
  benefitsText: { fontSize: 12, fontWeight: '700', color: adTokens.infoDark },
});
