import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const REFILL_REPLACE_APPOINTMENT_ID = 1111;

function quantityToApiString(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || '0';
}

/** Port of RefillDetailedView.jsx's detectPrescriptionType. */
function detectPrescriptionType(prescription) {
  if (
    String(prescription?.Type || '').toLowerCase() === 'freetext' &&
    (prescription?.SupplyId === null || prescription?.SupplyId === undefined) &&
    String(prescription?.FreeTextType || '').toLowerCase() === 'supply'
  ) {
    return 'FreeTextSupply';
  }
  if (prescription?.Type === 'Coded' || prescription?.DispensableDrugId) return 'Coded';
  if (prescription?.Type === 'Supply' || prescription?.SupplyId) return 'Supply';
  if (prescription?.CompoundIngredients != null) return 'Compound';
  return 'FreeText';
}

/**
 * Port of AllyDocReactApp's ModifyRefillModal.jsx / RefillDetailedView.jsx's "Modify & Approve"
 * (Replace) flow: edits the dispensed prescription's dispensing/directions/pharmacy-notes fields,
 * then POSTs `/api/refills/{id}/replace` with a type-specific payload (the original
 * drug/supply/compound-ingredients/pharmacy are kept as-is - this doesn't let the doctor swap in
 * a different medication, only adjust dispensing details before approving, which covers the
 * common case and the controlled-substance path simple Approve can't handle).
 */
export default function ModifyApproveRefillModal({ visible, request, isControlled, patientId, onClose, onConfirm }) {
  const bottomSafe = useBottomSafeSpacing();
  const [fields, setFields] = useState({});
  const [pin, setPin] = useState('');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sourcePrescription = request?.dispensedPrescription || request?.DispensedPrescription || null;
  const prescriptionType = sourcePrescription ? detectPrescriptionType(sourcePrescription) : null;
  const showRefillsAndDays = prescriptionType === 'Coded' || prescriptionType === 'Supply';
  const showRefillsOnly = prescriptionType === 'Compound';
  const showMedicationName = prescriptionType === 'FreeText' || prescriptionType === 'FreeTextSupply';
  const showCompoundDescription = prescriptionType === 'Compound';

  useEffect(() => {
    if (!visible || !sourcePrescription) return;
    setFields({
      medication: sourcePrescription.DisplayName || '',
      compoundDescription: sourcePrescription.DisplayName || '',
      quantity: String(sourcePrescription.Quantity ?? ''),
      refills: String(sourcePrescription.Refills ?? '0'),
      daysSupply: String(sourcePrescription.DaysSupply ?? '0'),
      directions: sourcePrescription.Directions || '',
      pharmacyNotes: sourcePrescription.PharmacyNotes || '',
    });
    setPin('');
    setPasscode('');
  }, [visible, sourcePrescription]);

  const setField = (key) => (value) => setFields((prev) => ({ ...prev, [key]: value }));

  if (!sourcePrescription || !prescriptionType) return null;

  const lockedPharmacyId =
    request?.originalPrescription?.PharmacyId ??
    request?.OriginalPrescription?.PharmacyId ??
    sourcePrescription?.PharmacyId ??
    request?.requestedPrescription?.PharmacyId ??
    request?.RequestedPrescription?.PharmacyId ??
    0;

  const buildPayload = () => {
    const resolvedPatientId = request?.Patient?.PatientId || patientId;
    const pharmacyNotes = String(fields.pharmacyNotes ?? '').trim();
    const basePayload = { patientId: resolvedPatientId };
    if (pin.trim()) basePayload.pin = pin.trim();
    if (passcode.trim()) basePayload.passcode = passcode.trim();

    if (prescriptionType === 'Coded') {
      return {
        ...basePayload,
        newPrescription: {
          appointmentId: REFILL_REPLACE_APPOINTMENT_ID,
          DispensableDrugId: Number(sourcePrescription.DispensableDrugId) || 0,
          Quantity: quantityToApiString(fields.quantity),
          Refills: parseInt(fields.refills, 10) || 0,
          DaysSupply: parseInt(fields.daysSupply, 10) || 0,
          Directions: fields.directions,
          PharmacyId: lockedPharmacyId,
          DispenseUnitId: sourcePrescription.DispenseUnitId || sourcePrescription.DispenseUnitTypeId || 0,
          EffectiveDate: sourcePrescription.EffectiveDate || new Date().toISOString(),
          PharmacyNotes: pharmacyNotes,
        },
      };
    }
    if (prescriptionType === 'Supply') {
      return {
        ...basePayload,
        newSupplyPrescription: {
          appointmentId: REFILL_REPLACE_APPOINTMENT_ID,
          SupplyId: Number(sourcePrescription.SupplyId) || 0,
          Quantity: quantityToApiString(fields.quantity),
          Refills: parseInt(fields.refills, 10) || 0,
          DaysSupply: parseInt(fields.daysSupply, 10) || 0,
          Directions: fields.directions,
          PharmacyId: lockedPharmacyId,
          PharmacyNotes: pharmacyNotes,
        },
      };
    }
    if (prescriptionType === 'Compound') {
      return {
        ...basePayload,
        newCompoundPrescription: {
          appointmentId: REFILL_REPLACE_APPOINTMENT_ID,
          CompoundIngredients: sourcePrescription.CompoundIngredients,
          Quantity: quantityToApiString(fields.quantity),
          Refills: parseInt(fields.refills, 10) || 0,
          Directions: fields.directions,
          PharmacyId: lockedPharmacyId || Number(sourcePrescription.PharmacyId) || Number(request?.PharmacyId) || 0,
          DispenseUnitId: sourcePrescription.DispenseUnitId || sourcePrescription.DispenseUnitTypeId || 0,
          CompoundDescription: String(fields.compoundDescription || sourcePrescription.DisplayName || '').trim(),
          PharmacyNotes: pharmacyNotes,
        },
      };
    }
    if (prescriptionType === 'FreeTextSupply') {
      return {
        ...basePayload,
        newFreeTextPrescription: {
          appointmentId: REFILL_REPLACE_APPOINTMENT_ID,
          DisplayName: String(fields.medication || sourcePrescription.DisplayName || '').trim(),
          Quantity: quantityToApiString(fields.quantity),
          Directions: fields.directions,
          SupplyId: null,
          FreeTextType: 'Supply',
          PharmacyNotes: pharmacyNotes,
        },
      };
    }
    // FreeText
    return {
      ...basePayload,
      newFreeTextPrescription: {
        appointmentId: REFILL_REPLACE_APPOINTMENT_ID,
        DisplayName: String(fields.medication || sourcePrescription.DisplayName || '').trim(),
        Quantity: quantityToApiString(fields.quantity),
        Directions: fields.directions,
        PharmacyNotes: pharmacyNotes,
      },
    };
  };

  const handleConfirm = async () => {
    if (!fields.quantity?.trim() || !fields.directions?.trim()) {
      toast.error('Quantity and Directions are required.');
      return;
    }
    if (isControlled && (!pin.trim() || !passcode.trim())) {
      toast.error('Enter your prescriber PIN and passcode/OTP to modify a controlled-substance refill.');
      return;
    }
    setSubmitting(true);
    const response = await onConfirm(buildPayload());
    setSubmitting(false);
    if (response?.success) {
      toast.success(response.message || 'Refill replaced successfully.');
      onClose();
    } else {
      toast.error(response?.message || 'Failed to replace refill request.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>Modify &amp; Approve</Text>
          <Text style={styles.subtitle}>
            Adjust the dispensing details below, then approve. The medication/supply itself can&apos;t be changed here.
          </Text>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.medCard}>
              <Text style={styles.medLabel}>{prescriptionType}</Text>
              <Text style={styles.medName}>{sourcePrescription.DisplayName || sourcePrescription.DrugName || 'N/A'}</Text>
            </View>

            {showMedicationName ? (
              <>
                <Text style={styles.fieldLabel}>Medication Name</Text>
                <TextInput style={styles.input} value={fields.medication} onChangeText={setField('medication')} />
              </>
            ) : null}

            {showCompoundDescription ? (
              <>
                <Text style={styles.fieldLabel}>Compound Description</Text>
                <TextInput style={styles.input} value={fields.compoundDescription} onChangeText={setField('compoundDescription')} />
              </>
            ) : null}

            <View style={styles.fieldRow}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput style={styles.input} value={fields.quantity} onChangeText={setField('quantity')} />
              </View>
              {showRefillsAndDays || showRefillsOnly ? (
                <View style={styles.flex1}>
                  <Text style={styles.fieldLabel}>Refills</Text>
                  <TextInput style={styles.input} value={fields.refills} onChangeText={setField('refills')} keyboardType="numeric" />
                </View>
              ) : null}
            </View>

            {showRefillsAndDays ? (
              <>
                <Text style={styles.fieldLabel}>Days Supply</Text>
                <TextInput style={styles.input} value={fields.daysSupply} onChangeText={setField('daysSupply')} keyboardType="numeric" />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Directions</Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={fields.directions} onChangeText={setField('directions')} />

            <Text style={styles.fieldLabel}>Pharmacy Notes</Text>
            <TextInput style={[styles.input, styles.textarea]} multiline value={fields.pharmacyNotes} onChangeText={setField('pharmacyNotes')} />

            {isControlled ? (
              <View style={styles.epcsSection}>
                <Text style={styles.sectionLabel}>Controlled refill requires EPCS authorization</Text>
                <Text style={styles.fieldLabel}>Prescriber PIN</Text>
                <TextInput style={styles.input} value={pin} onChangeText={setPin} secureTextEntry />
                <Text style={styles.fieldLabel}>Passcode / OTP</Text>
                <TextInput style={styles.input} value={passcode} onChangeText={setPasscode} />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={submitting}>
              {submitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.confirmButtonText}>Modify &amp; Approve</Text>}
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
  textarea: { minHeight: 60, textAlignVertical: 'top' },

  epcsSection: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: adTokens.border },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.warningDark, marginBottom: 8 },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { flex: 1.3, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.success, alignItems: 'center' },
  confirmButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
