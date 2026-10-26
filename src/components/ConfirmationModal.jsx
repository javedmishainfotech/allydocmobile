import React from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { colors, adTokens } from '../theme/colors';

const COPY = {
  cancelled: {
    title: 'Cancel Appointment',
    message: 'Are you sure you want to cancel this appointment?',
    confirmColor: adTokens.danger,
  },
  completed: {
    title: 'Mark as Complete',
    message: 'Are you sure you want to mark as complete this appointment?',
    confirmColor: adTokens.success,
  },
};

/** Port of the inline Confirmation Modal (Cancel / Mark as Complete) in
 * AllyDocReactApp's ManageAppointments.jsx. */
export default function ConfirmationModal({
  visible,
  type,
  cancelReason,
  onChangeCancelReason,
  remarks,
  onChangeRemarks,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const copy = COPY[type] || COPY.completed;
  const isCancelReasonValid = type === 'cancelled' ? cancelReason.trim().length >= 4 : true;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.title}>{copy.title}</Text>

          {type === 'cancelled' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Cancel reason..."
                placeholderTextColor={adTokens.textMuted}
                value={cancelReason}
                onChangeText={onChangeCancelReason}
              />
              {cancelReason.length > 0 && !isCancelReasonValid ? (
                <Text style={styles.errorText}>Reason must be at least 4 characters long.</Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.message}>{copy.message}</Text>

          {type !== 'cancelled' ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Remarks (optional)..."
              placeholderTextColor={adTokens.textMuted}
              value={remarks}
              onChangeText={onChangeRemarks}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          ) : null}

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: copy.confirmColor }]}
              disabled={(type === 'cancelled' && !isCancelReasonValid) || isSubmitting}
              onPress={onConfirm}
            >
              {isSubmitting ? (
                <ActivityIndicator size={14} color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Bottom sheet, same pattern as this screen's own appointment-detail sheet -
  // slides up from the bottom and takes the full width, instead of a
  // center-screen dialog card (a desktop/web modal convention).
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
    marginBottom: 8,
  },
  textArea: { minHeight: 80, marginTop: 8 },
  errorText: { color: adTokens.danger, fontSize: 12, marginBottom: 8 },
  message: { fontSize: 13.5, color: adTokens.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  closeButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, minWidth: 90, alignItems: 'center' },
  confirmButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
