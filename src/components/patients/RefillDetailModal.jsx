import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useDoseSpotClinical } from '../../hooks/useDoseSpotClinical';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import ChangePatientModal from './ChangePatientModal';
import ModifyApproveRefillModal from './ModifyApproveRefillModal';

// RefillDenialReason, numeric enum on this endpoint (unlike RxChange's
// string enum) - same small common set of reasons.
const DENIAL_REASONS = [
  { value: '1', label: 'Patient Unknown' },
  { value: '2', label: 'Patient Not Under Care' },
  { value: '3', label: 'Too Soon' },
  { value: '4', label: 'Need Appointment' },
  { value: '5', label: 'At Patient Request' },
];

/**
 * Port of AllyDocReactApp's RefillDetailedView.jsx - simple Approve/Deny, "Link Patient", and
 * "Modify & Approve" (Replace - see ModifyApproveRefillModal.jsx for the 5-way type-branched
 * payload). Controlled-substance refills block simple Approve (same as web) but can still use
 * Modify & Approve with a PIN + passcode/OTP, same as web's EPCS path for this flow.
 */
export default function RefillDetailModal({ visible, request, onClose, onResolved }) {
  const bottomSafe = useBottomSafeSpacing();
  const { approveRefill, denyRefill, changeRefillPatient, replaceRefill } = useDoseSpotClinical();
  const [refills, setRefills] = useState('0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [comment, setComment] = useState('');
  const [denialReason, setDenialReason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkPatientOpen, setLinkPatientOpen] = useState(false);
  const [modifyApproveOpen, setModifyApproveOpen] = useState(false);

  if (!request) return null;

  const refillId = request.RefillId ?? request.RefillRequestId;
  const isControlled = Boolean(request.refillRequestIsControlled ?? request.IsControlled);
  const med = request.dispensedPrescription || request.DispensedPrescription;
  // web: refillRequestIsNewPatient/isNewPatientRefill - blocks approve until linked to a patient.
  const isNewPatient = request.NewPatient === true || String(request.NewPatient).toLowerCase() === 'true';

  const handleApprove = async () => {
    if (isControlled) {
      toast.error('Controlled-substance refills cannot use simple approve. Please deny instead for now.');
      return;
    }
    if (!effectiveDate.trim()) {
      toast.error('Effective date is required.');
      return;
    }
    setIsSubmitting(true);
    const response = await approveRefill(refillId, {
      refills: Number(refills) || 0,
      effectiveDate,
      comment,
    });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Refill approved.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to approve refill.');
    }
  };

  const handleDeny = async () => {
    if (!denialReason) {
      toast.error('Select a denial reason.');
      return;
    }
    setIsSubmitting(true);
    const response = await denyRefill(refillId, {
      denialReason,
      note: comment,
    });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Refill denied.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to deny refill.');
    }
  };

  const handleLinkPatientConfirm = async (selectedPatient) => {
    const response = await changeRefillPatient(refillId, selectedPatient.doseSpotId);
    if (response.success) onResolved?.();
    return response;
  };

  const handleModifyApproveConfirm = async (payload) => {
    const response = await replaceRefill(refillId, payload);
    if (response.success) onResolved?.();
    return response;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>Refill Request</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue}>
                {[request.Patient?.FirstName, request.Patient?.LastName].filter(Boolean).join(' ')}
              </Text>
              {med ? (
                <>
                  <Text style={styles.infoLabel}>Medication</Text>
                  <Text style={styles.infoValue}>{med.DisplayName || med.DrugName}</Text>
                </>
              ) : null}
              {isControlled ? (
                <View style={styles.controlledBanner}>
                  <Text style={styles.controlledBannerText}>
                    This is a controlled-substance refill. Simple Approve is disabled - deny or escalate to the web
                    app for a modify-and-approve flow.
                  </Text>
                </View>
              ) : null}
            </View>

            {isNewPatient ? (
              <View style={styles.controlledBanner}>
                <Text style={styles.controlledBannerText}>
                  This request isn&apos;t linked to a clinic patient yet. Link it before approving - you can still deny it.
                </Text>
                <Pressable style={styles.linkPatientButton} onPress={() => setLinkPatientOpen(true)}>
                  <Text style={styles.linkPatientButtonText}>Link Patient</Text>
                </Pressable>
              </View>
            ) : null}

            {!isControlled ? (
              <>
                <Text style={styles.fieldLabel}>Refills</Text>
                <TextInput style={styles.input} value={refills} onChangeText={setRefills} keyboardType="numeric" placeholderTextColor={adTokens.textMuted} />
                <Text style={styles.fieldLabel}>Effective Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={effectiveDate} onChangeText={setEffectiveDate} placeholderTextColor={adTokens.textMuted} />
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
            <Pressable
              style={[styles.approveButton, (isControlled || isNewPatient) && styles.approveButtonDisabled]}
              onPress={handleApprove}
              disabled={isSubmitting || isControlled || isNewPatient}
            >
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.approveButtonText}>Approve</Text>}
            </Pressable>
          </View>
          {med && !isNewPatient ? (
            <Pressable style={styles.modifyApproveButton} onPress={() => setModifyApproveOpen(true)} disabled={isSubmitting}>
              <Text style={styles.modifyApproveButtonText}>Modify &amp; Approve</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ChangePatientModal
        visible={linkPatientOpen}
        requestPatient={request.Patient}
        entityLabel="refill request"
        onClose={() => setLinkPatientOpen(false)}
        onConfirm={handleLinkPatientConfirm}
      />
      <ModifyApproveRefillModal
        visible={modifyApproveOpen}
        request={request}
        isControlled={isControlled}
        onClose={() => setModifyApproveOpen(false)}
        onConfirm={handleModifyApproveConfirm}
      />
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
  controlledBanner: { backgroundColor: adTokens.warningLight, borderRadius: 8, padding: 10, marginTop: 10, gap: 8 },
  controlledBannerText: { fontSize: 11.5, color: adTokens.warningDark },
  linkPatientButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: adTokens.warningDark },
  linkPatientButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.white },

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
  approveButtonDisabled: { opacity: 0.5 },
  approveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  modifyApproveButton: { alignItems: 'center', paddingVertical: 10, marginTop: 6 },
  modifyApproveButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark, textDecorationLine: 'underline' },
});
