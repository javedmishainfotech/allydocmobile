import React from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { formatDispenseUnit } from '../../utils/dispenseUnits';
import { getPrescriptionStatusTone, parseCompoundIngredients } from '../../utils/treatmentPlanFields';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const TONES = {
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  primary: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

const pick = (d, ...keys) => {
  for (const key of keys) if (d?.[key] !== undefined && d?.[key] !== null && d?.[key] !== '') return d[key];
  return null;
};
const yesNo = (value) => (value === null ? null : value === true || String(value).toLowerCase() === 'true' ? 'Yes' : 'No');
const dateText = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
    : null;
};

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

/** Port of web's PrescriptionDetailModal (`GET /api/Prescriptions/GetPrescriptionById`): every field of one prescription. */
export default function PrescriptionDetailModal({ visible, loading, data, pharmacy, pharmacyLoading, drugNames, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const status = pick(data, 'Status', 'status');
  const tone = TONES[getPrescriptionStatusTone(status)] || TONES.neutral;
  const schedule = pick(data, 'Schedule', 'schedule');
  const scheduleNumber = schedule === null ? null : Number(schedule);
  const ingredients = parseCompoundIngredients(data);
  const name = pick(data, 'DisplayName', 'displayName', 'DrugName') || 'Prescription';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {loading ? 'Prescription details' : name}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          {loading || !data ? (
            <View style={styles.center}>
              {loading ? <ActivityIndicator color={adTokens.primary} /> : <Text style={styles.value}>Unable to load this prescription.</Text>}
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.pillText, { color: tone.color }]}>{status || 'Unknown'}</Text>
              </View>

              <Text style={styles.section}>Prescription</Text>
              <Row label="Prescription ID" value={pick(data, 'PrescriptionId', 'prescriptionId')} />
              <Row label="Written" value={dateText(pick(data, 'WrittenDate', 'writtenDate'))} />
              <Row label="Effective" value={dateText(pick(data, 'EffectiveDate', 'effectiveDate'))} />
              <Row label="Directions" value={pick(data, 'Directions', 'directions')} />
              <Row label="Quantity" value={pick(data, 'Quantity', 'quantity')} />
              <Row label="Dispense unit" value={formatDispenseUnit(pick(data, 'DispenseUnitId', 'DispenseUnitTypeId', 'dispenseUnitId'))} />
              <Row label="Refills" value={pick(data, 'Refills', 'refills')} />
              <Row label="Days supply" value={pick(data, 'DaysSupply', 'daysSupply')} />
              <Row label="Strength" value={pick(data, 'Strength')} />
              <Row label="Type" value={pick(data, 'Type', 'type')} />
              <Row label="Medication status" value={pick(data, 'MedicationStatus', 'medicationStatus')} />
              <Row label="Formulary" value={pick(data, 'Formulary')} />
              <Row label="Schedule" value={scheduleNumber} />
              <Row label="EPCS" value={scheduleNumber === null ? null : scheduleNumber >= 2 ? 'Yes' : 'No'} />
              <Row label="No substitutions" value={yesNo(pick(data, 'NoSubstitutions'))} />
              <Row label="Urgent" value={yesNo(pick(data, 'IsUrgent'))} />
              <Row label="Comment" value={pick(data, 'Comment', 'comment')} />
              <Row label="Pharmacy notes" value={pick(data, 'PharmacyNotes', 'pharmacyNotes')} />
              <Row label="Renewal note" value={pick(data, 'RxRenewalNote')} />

              <Text style={styles.section}>Pharmacy</Text>
              {pharmacyLoading ? (
                <ActivityIndicator color={adTokens.primary} />
              ) : pharmacy ? (
                <>
                  <Row label="Name" value={pharmacy.StoreName || pharmacy.storeName} />
                  <Row label="Address" value={pharmacy.Address1 || pharmacy.address1} />
                  <Row label="Phone" value={pharmacy.PrimaryPhone || pharmacy.primaryPhone} />
                </>
              ) : (
                <Row label="Pharmacy" value={null} />
              )}

              {ingredients.length > 0 ? (
                <>
                  <Text style={styles.section}>Ingredients</Text>
                  {ingredients.map((ingredient, index) => {
                    const drugId = ingredient?.DispensableDrugId ?? ingredient?.dispensableDrugId;
                    return (
                      <Text key={`${drugId ?? index}-${index}`} style={styles.value}>
                        • {(drugId && drugNames?.[String(drugId)]) || ingredient?.Name || `Drug #${drugId ?? '?'}`}
                      </Text>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  center: { paddingVertical: 40, alignItems: 'center' },
  body: { gap: 8, paddingBottom: 12 },
  pill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 12, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  section: { marginTop: 8, fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: adTokens.gray50,
  },
  label: { fontSize: 12.5, color: adTokens.textSecondary },
  value: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'right' },
});
