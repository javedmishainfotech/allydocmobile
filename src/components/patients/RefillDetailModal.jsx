import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { approveRefill, denyRefill } from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';

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
 * Port of AllyDocReactApp's RefillDetailedView.jsx - simple Approve and
 * Deny parity. "Modify & Approve" (replace) is NOT ported here: web branches
 * its request body 5 ways by prescription type for that action and
 * hardcodes a TODO placeholder appointmentId, which needs its own dedicated
 * pass rather than guessing at the full payload shape. Controlled-substance
 * refills correctly block simple Approve here too, same as web.
 */
export default function RefillDetailModal({ visible, request, onClose, onResolved }) {
  const [refills, setRefills] = useState('0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [comment, setComment] = useState('');
  const [denialReason, setDenialReason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const isControlled = Boolean(request.refillRequestIsControlled ?? request.IsControlled);
  const med = request.dispensedPrescription || request.DispensedPrescription;

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
    const response = await approveRefill(request.RefillId ?? request.RefillRequestId, {
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
    const response = await denyRefill(request.RefillId ?? request.RefillRequestId, {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
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
            <Pressable style={[styles.approveButton, isControlled && styles.approveButtonDisabled]} onPress={handleApprove} disabled={isSubmitting || isControlled}>
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
  controlledBanner: { backgroundColor: adTokens.warningLight, borderRadius: 8, padding: 10, marginTop: 10 },
  controlledBannerText: { fontSize: 11.5, color: adTokens.warningDark },

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
});
