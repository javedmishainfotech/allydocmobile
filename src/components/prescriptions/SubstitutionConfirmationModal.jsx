import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { adTokens } from '../../theme/colors';

/**
 * Port of AllyDocReactApp's SubstitutionConfirmationModal.jsx: a confirmation gate shown when
 * the "No Substitutions" checkbox is checked on a medication/supply/compound form (prescribe
 * flow and Favorites forms alike) - checking it prevents the pharmacy from substituting a
 * generic, so it needs an explicit confirm.
 */
export default function SubstitutionConfirmationModal({ visible, itemName, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>No Substitutions for {itemName || 'this medication'}</Text>
          <Text style={styles.body}>
            Checking this box will prevent the pharmacy from substituting a generic medication for the medication
            prescribed.
          </Text>
          <Text style={styles.bold}>If this is intended please confirm via the button below.</Text>
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
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
  bold: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  cancelButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary },
  confirmButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
