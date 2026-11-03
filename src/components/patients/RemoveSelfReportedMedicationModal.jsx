import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { updateSelfReportedMedicationStatus } from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';

// PatientMedicationStatusType, per AllyDocReactApp.
const STATUS_OPTIONS = [
  { value: '2', label: 'Inactive' },
  { value: '3', label: 'Discontinued' },
];

/** Port of AllyDocReactApp's RemoveSelfReportedMedicationModal.jsx -
 * "removing" a self-reported medication is really a status update
 * (Inactive/Discontinued), not a hard delete. */
export default function RemoveSelfReportedMedicationModal({ visible, doseSpotPatientId, medication, onClose, onRemoved }) {
  const [status, setStatus] = useState('2');
  const [inactiveDate, setInactiveDate] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!inactiveDate.trim()) {
      toast.error('Inactive date is required.');
      return;
    }
    setIsSubmitting(true);
    const response = await updateSelfReportedMedicationStatus(doseSpotPatientId, medication.SelfReportedMedicationId, {
      Status: status,
      InactiveDate: inactiveDate,
      Comment: comment || undefined,
    });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Medication updated.');
      onRemoved?.();
    } else {
      toast.error(response.message || 'Unable to update medication.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Remove Medication</Text>
          <Text style={styles.subtitle}>{medication?.DisplayName}</Text>

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.statusChip, status === opt.value && styles.statusChipActive]}
                onPress={() => setStatus(opt.value)}
              >
                <Text style={[styles.statusChipText, status === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Inactive Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={inactiveDate} onChangeText={setInactiveDate} placeholderTextColor={adTokens.textMuted} />

          <Text style={styles.fieldLabel}>Comment (optional)</Text>
          <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholderTextColor={adTokens.textMuted} />

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: adTokens.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 4, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6, marginTop: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  statusChipActive: { backgroundColor: adTokens.danger, borderColor: adTokens.danger },
  statusChipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  statusChipTextActive: { color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  closeButton: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, backgroundColor: adTokens.danger, minWidth: 90, alignItems: 'center' },
  confirmButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
