import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors, adTokens } from '../../theme/colors';

/** Port of AllyDocReactApp's MedicationHistoryConsentModal.jsx - shown EVERY
 * time the Medication History tab is tapped (no persisted consent state on
 * web either, by design - each visit re-confirms). */
export default function MedicationHistoryConsentModal({ visible, isSubmitting, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Medication History Consent</Text>
          <Text style={styles.message}>Has the patient given consent to retrieve their prescription history?</Text>
          <View style={styles.footer}>
            <Pressable style={styles.noButton} onPress={onCancel} disabled={isSubmitting}>
              <Text style={styles.noButtonText}>No</Text>
            </Pressable>
            <Pressable style={styles.yesButton} onPress={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.yesButtonText}>Yes</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: adTokens.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  message: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  noButton: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  noButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  yesButton: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 64, alignItems: 'center' },
  yesButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
