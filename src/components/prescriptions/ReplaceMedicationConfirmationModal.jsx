import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { adTokens } from '../../theme/colors';

/** Port of AllyDocReactApp's ReplaceMedicationConfirmationModal.jsx. */
export default function ReplaceMedicationConfirmationModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Replace Medication</Text>
          <Text style={styles.body}>Are you sure you want to replace the current medication with this option?</Text>
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>Ok</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: adTokens.white, borderRadius: 14, padding: 18, gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  body: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  cancelButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary },
  confirmButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
