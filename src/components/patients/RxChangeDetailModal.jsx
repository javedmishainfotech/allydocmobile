import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { approveRxChange, denyRxChange } from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const DENIAL_REASONS = [
  { value: 'DeniedPatientUnknown', label: 'Patient Unknown' },
  { value: 'DeniedPatientNotUnderCare', label: 'Patient Not Under Care' },
  { value: 'DeniedNeverPrescribed', label: 'Never Prescribed' },
  { value: 'DeniedChangeInappropriate', label: 'Change Inappropriate' },
  { value: 'DeniedNeedAppointment', label: 'Need Appointment' },
  { value: 'DeniedAtPatientRequest', label: 'At Patient Request' },
  { value: 'DeniedOrderExpired', label: 'Order Expired' },
  { value: 'DeniedPharmacyNotRecognized', label: 'Pharmacy Not Recognized' },
];

// Types that take the minimal `{ selectedMedicationId, comment }` (or
// `{priorAuthNumber, selectedMedicationId}` for Prior Authorization) approve
// payload rather than the full `newPrescription` payload - port of
// rxChangeApproveWithChangesUsesFullPayload in AllyDocReactApp.
const MINIMAL_PAYLOAD_TYPES = new Set([
  'PriorAuthorization',
  'GenericSubstitution',
  'PrescriberAuthorization',
  'DEAStatus',
  'TherapeuticInterchange',
  'OutOfStock',
  'DrugUseEvaluation',
]);

function buildApprovePayload(request, { comment, priorAuthNumber }) {
  const selectedMedicationId =
    request.RequestedMedications?.[0]?.PrescriptionId ?? request.RequestedMedications?.[0]?.PrescribedMedicationId;
  const type = request.RxChangeType;

  if (type === 'PriorAuthorization') {
    return { priorAuthNumber, selectedMedicationId };
  }
  if (MINIMAL_PAYLOAD_TYPES.has(type)) {
    return { selectedMedicationId, comment };
  }

  const med = request.RequestedMedications?.[0] || {};
  return {
    priorAuthNumber: med.PriorAuthNumber || '',
    selectedMedicationId,
    newPrescriptionPatientId: request.Patient?.PatientId,
    newPrescription: {
      dispensableDrugId: med.DispensableDrugId,
      refills: med.Refills,
      pharmacyId: med.PharmacyId,
      dispenseUnitId: med.DispenseUnitId,
      noSubstitutions: med.NoSubstitutions,
      effectiveDate: med.EffectiveDate,
      daysSupply: med.DaysSupply,
      pharmacyNotes: med.PharmacyNotes,
      isUrgent: med.IsUrgent,
      quantity: String(med.Quantity ?? ''),
      directions: med.Directions,
      status: 1,
    },
    comment,
  };
}

/** Port of AllyDocReactApp's RxChangeDetailedView.jsx - approve (payload
 * shape branches by RxChangeType) and deny (string-enum reason) parity.
 * Simplified: this always approves the FIRST requested medication exactly
 * as proposed ("approve", not "approve with changes" editing of fields) -
 * the full inline edit-before-approve UI is not ported in this pass. */
export default function RxChangeDetailModal({ visible, request, onClose, onResolved }) {
  const bottomSafe = useBottomSafeSpacing();
  const [comment, setComment] = useState('');
  const [priorAuthNumber, setPriorAuthNumber] = useState('');
  const [denialReason, setDenialReason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const med = request.RequestedMedications?.[0];

  const handleApprove = async () => {
    setIsSubmitting(true);
    const payload = buildApprovePayload(request, { comment, priorAuthNumber });
    const response = await approveRxChange(request.RxChangeRequestId ?? request.RxChangeId, payload);
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Request approved.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to approve request.');
    }
  };

  const handleDeny = async () => {
    if (!denialReason) {
      toast.error('Select a denial reason.');
      return;
    }
    setIsSubmitting(true);
    const response = await denyRxChange(request.RxChangeRequestId ?? request.RxChangeId, {
      reason: denialReason,
      selectedMedicationId: med?.PrescriptionId ?? med?.PrescribedMedicationId,
      comment,
    });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Request denied.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to deny request.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>RxChange Request</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{request.RxChangeType}</Text>
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue}>
                {[request.Patient?.FirstName, request.Patient?.LastName].filter(Boolean).join(' ')}
              </Text>
              {med ? (
                <>
                  <Text style={styles.infoLabel}>Requested Medication</Text>
                  <Text style={styles.infoValue}>{med.DisplayName}</Text>
                  <Text style={styles.infoValue}>{med.Directions}</Text>
                  <Text style={styles.infoValue}>
                    Qty {med.Quantity} · Refills {med.Refills} · Days Supply {med.DaysSupply}
                  </Text>
                </>
              ) : null}
            </View>

            {request.RxChangeType === 'PriorAuthorization' ? (
              <>
                <Text style={styles.fieldLabel}>Prior Auth Number</Text>
                <TextInput style={styles.input} value={priorAuthNumber} onChangeText={setPriorAuthNumber} placeholderTextColor={adTokens.textMuted} />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Comment (optional)</Text>
            <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholderTextColor={adTokens.textMuted} />

            <Text style={styles.fieldLabel}>Denial Reason (if denying)</Text>
            <View style={styles.reasonWrap}>
              {DENIAL_REASONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.reasonChip, denialReason === opt.value && styles.reasonChipActive]}
                  onPress={() => setDenialReason(opt.value)}
                >
                  <Text style={[styles.reasonChipText, denialReason === opt.value && styles.reasonChipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
            <Pressable style={styles.denyButton} onPress={handleDeny} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.denyButtonText}>Deny</Text>}
            </Pressable>
            <Pressable style={styles.approveButton} onPress={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.approveButtonText}>Approve</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  body: { paddingBottom: 10 },

  infoCard: { backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12, marginBottom: 14, gap: 2 },
  infoLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary, textTransform: 'uppercase', marginTop: 8 },
  infoValue: { fontSize: 13, color: adTokens.textPrimary },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, marginBottom: 8 },

  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  reasonChipActive: { backgroundColor: adTokens.danger, borderColor: adTokens.danger },
  reasonChipText: { fontSize: 11, fontWeight: '600', color: adTokens.textSecondary },
  reasonChipTextActive: { color: '#FFFFFF' },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  closeButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  denyButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.danger, alignItems: 'center' },
  denyButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  approveButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.success, alignItems: 'center' },
  approveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
