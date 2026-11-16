import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { adTokens, colors } from '../../theme/colors';

/** Port of web's inline "Delete Confirmation" modal for a Medicines-card row
 * (DoctorTreatmentDetail.jsx's DeleteModalConfirmation) - `POST /DeleteMedicine?Id=`. */
export default function DeleteMedicineModal({ visible, submitting, onConfirm, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>Delete Confirmation</Text>
          <Text style={styles.body}>Are you sure, you want to delete this medicine?</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={submitting}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.danger, submitting && styles.disabled]} onPress={onConfirm} disabled={submitting}>
              <Text style={styles.dangerText}>Delete</Text>
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
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryText: { fontWeight: '700', fontSize: 13, color: adTokens.textSecondary },
  danger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.danger },
  buttonSpinner: { marginLeft: 8 },
  dangerText: { fontWeight: '700', fontSize: 13, color: colors.white },
  disabled: { opacity: 0.5 },
});
