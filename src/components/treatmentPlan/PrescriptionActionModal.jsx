import React from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { adTokens, colors } from '../../theme/colors';

/** Port of web's DeletePrescriptionModal: confirm a delete (unsent prescriptions), or a cancel that needs a reason. */
export default function PrescriptionActionModal({ visible, name, mode, comment, onChangeComment, submitting, onConfirm, onClose }) {
  const isCancel = mode === 'cancel';
  const blocked = submitting || (isCancel && !comment.trim());
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{isCancel ? 'Cancel prescription' : 'Delete prescription'}</Text>
          <Text style={styles.body}>
            {isCancel
              ? `Request the pharmacy to cancel ${name || 'this prescription'}? Please enter a reason.`
              : `Delete ${name || 'this prescription'}? This cannot be undone.`}
          </Text>
          {isCancel ? (
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={onChangeComment}
              placeholder="Reason for cancellation"
              placeholderTextColor={adTokens.textMuted}
              multiline
              textAlignVertical="top"
            />
          ) : null}
          <View style={styles.buttons}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={submitting}>
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
            <Pressable style={[styles.danger, blocked && styles.disabled]} onPress={onConfirm} disabled={blocked}>
              <Text style={styles.dangerText}>{isCancel ? 'Cancel prescription' : 'Delete'}</Text>
              {submitting ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 380, backgroundColor: adTokens.white, borderRadius: 14, padding: 18, gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19 },
  input: { minHeight: 80, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10, fontSize: 13.5, color: adTokens.textPrimary },
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryText: { fontWeight: '700', fontSize: 13, color: adTokens.textSecondary },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.danger },
  buttonSpinner: { marginLeft: 8 },
  dangerText: { fontWeight: '700', fontSize: 13, color: colors.white },
  disabled: { opacity: 0.5 },
});
