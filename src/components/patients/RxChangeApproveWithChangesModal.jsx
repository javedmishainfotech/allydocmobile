import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import DiagnosisSearchField from '../prescriptions/DiagnosisSearchField';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

function getMedicationDisplayName(item) {
  return item?.DisplayName || item?.DrugName || item?.MedicationName || item?.NameWithRouteDoseForm || item?.Name || 'N/A';
}

/**
 * Port of AllyDocReactApp's RxChangeApproveWithChangesModal.jsx: edit the requested medication's
 * dispensing/directions/pharmacy fields before approving, with optional Primary/Secondary
 * Diagnosis (only for RxChange types whose approve payload carries a full `newPrescription`
 * object - `showDiagnosis` prop). Simplified from web's multi-medication table to the single
 * medication RxChangeDetailModal.jsx already works with.
 */
export default function RxChangeApproveWithChangesModal({ visible, medication, showDiagnosis, submitting, onClose, onConfirm }) {
  const bottomSafe = useBottomSafeSpacing();
  const [fields, setFields] = useState({});
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(null);
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setFields({
      Quantity: String(medication?.Quantity ?? ''),
      Refills: String(medication?.Refills ?? ''),
      DaysSupply: String(medication?.DaysSupply ?? ''),
      EffectiveDate: medication?.EffectiveDate ? String(medication.EffectiveDate).slice(0, 10) : '',
      Directions: medication?.Directions || '',
      PharmacyNotes: medication?.PharmacyNotes || '',
      NoSubstitutions: Boolean(medication?.NoSubstitutions),
    });
    setPrimaryDiagnosis(null);
    setSecondaryDiagnosis(null);
  }, [visible, medication]);

  const setField = (key) => (value) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleConfirm = () => {
    const editedMedication = {
      ...medication,
      Quantity: fields.Quantity,
      Refills: fields.Refills,
      DaysSupply: fields.DaysSupply,
      EffectiveDate: fields.EffectiveDate,
      Directions: fields.Directions,
      PharmacyNotes: fields.PharmacyNotes,
      NoSubstitutions: fields.NoSubstitutions,
    };
    onConfirm(editedMedication, {
      primaryDiagnosisId: primaryDiagnosis?.diagnosisId ?? null,
      secondaryDiagnosisId: secondaryDiagnosis?.diagnosisId ?? null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>Approve with Changes</Text>
          <Text style={styles.subtitle}>Update prescription details, then confirm to send approval to the pharmacy.</Text>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.medCard}>
              <Text style={styles.medLabel}>Medication</Text>
              <Text style={styles.medName}>{getMedicationDisplayName(medication)}</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput style={styles.input} value={fields.Quantity} onChangeText={setField('Quantity')} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Refills</Text>
                <TextInput style={styles.input} value={fields.Refills} onChangeText={setField('Refills')} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Days Supply</Text>
                <TextInput style={styles.input} value={fields.DaysSupply} onChangeText={setField('DaysSupply')} keyboardType="numeric" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Effective Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={fields.EffectiveDate} onChangeText={setField('EffectiveDate')} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Directions</Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={fields.Directions} onChangeText={setField('Directions')} />

            <Text style={styles.fieldLabel}>Pharmacy Notes</Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={fields.PharmacyNotes} onChangeText={setField('PharmacyNotes')} />

            <Pressable style={styles.checkboxRow} onPress={() => setField('NoSubstitutions')(!fields.NoSubstitutions)}>
              <Switch value={Boolean(fields.NoSubstitutions)} onValueChange={setField('NoSubstitutions')} trackColor={{ true: adTokens.primary }} />
              <Text style={styles.checkboxLabel}>No Substitutions</Text>
            </Pressable>

            {showDiagnosis ? (
              <View style={styles.diagnosisSection}>
                <Text style={styles.sectionLabel}>Diagnosis Information (optional)</Text>
                <DiagnosisSearchField label="Primary Diagnosis" value={primaryDiagnosis} onChange={setPrimaryDiagnosis} />
                <DiagnosisSearchField label="Secondary Diagnosis" value={secondaryDiagnosis} onChange={setSecondaryDiagnosis} />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={submitting}>
              {submitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.confirmButtonText}>Approve with Changes</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 4, marginBottom: 12, lineHeight: 16 },
  body: { paddingBottom: 10 },
  flex1: { flex: 1 },

  medCard: { backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12, marginBottom: 14 },
  medLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary, textTransform: 'uppercase' },
  medName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginTop: 2 },

  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, marginBottom: 8 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },

  diagnosisSection: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: adTokens.border },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { flex: 1.3, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.success, alignItems: 'center' },
  confirmButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
