import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { adTokens } from '../../theme/colors';

/** Port of web's PastEffectiveDateWarningModal: selected prescriptions whose effective date is in the past must be edited before sending. */
export default function PastDateWarningModal({ visible, prescriptions, formatDate, onEdit, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>Prescriptions with Past Effective Dates</Text>
          <Text style={styles.body}>
            The following selected prescriptions have effective dates in the past. Please review and consider updating to
            the current/future date before sending.
          </Text>
          <ScrollView style={styles.list}>
            {prescriptions.map((rx, index) => (
              <View key={String(rx.PrescriptionId ?? index)} style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{rx.medicationDisplayName || rx.DrugName || 'Medication'}</Text>
                  <Text style={styles.date}>Effective: {formatDate(rx.EffectiveDate ?? rx.effectiveDate)}</Text>
                </View>
                <Pressable style={styles.edit} onPress={() => onEdit(rx)}>
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: adTokens.white, borderRadius: 14, padding: 18, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.warningDark },
  body: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 19 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: adTokens.gray100 },
  flex1: { flex: 1 },
  name: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  date: { fontSize: 12, color: adTokens.danger, marginTop: 2 },
  edit: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9, backgroundColor: adTokens.primary },
  editText: { color: adTokens.white, fontWeight: '700', fontSize: 12 },
  close: { alignSelf: 'flex-end', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  closeText: { fontWeight: '700', fontSize: 13, color: adTokens.textSecondary },
});
