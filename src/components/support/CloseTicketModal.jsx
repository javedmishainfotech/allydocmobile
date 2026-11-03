import React from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { REMARKS_MAX } from '../../services/supportService';
import { adTokens, colors } from '../../theme/colors';

/** Port of web's "Mark ticket as closed" modal. */
export default function CloseTicketModal({ visible, remarks, onChangeRemarks, submitting, onConfirm, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>Mark ticket as closed</Text>
          <Text style={styles.body}>
            This ticket will be marked <Text style={styles.bold}>Closed</Text> and no further updates can be posted to it.
          </Text>
          <Text style={styles.label}>Remarks (optional)</Text>
          <TextInput
            style={styles.input}
            value={remarks}
            onChangeText={(text) => onChangeRemarks(text.slice(0, REMARKS_MAX))}
            multiline
            textAlignVertical="top"
            placeholder="Add a closing note, e.g. issue resolved on my end..."
            placeholderTextColor={adTokens.textMuted}
            editable={!submitting}
          />
          <Text style={styles.counter}>
            {remarks.length}/{REMARKS_MAX}
          </Text>
          <View style={styles.buttons}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={submitting}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.danger, submitting && styles.disabled]} onPress={onConfirm} disabled={submitting}>
              <Text style={styles.dangerText}>Mark as closed</Text>
              {submitting ? <ActivityIndicator size="small" color={colors.white} style={styles.spinner} /> : null}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400, gap: 10, padding: 18, borderRadius: 14, backgroundColor: adTokens.white },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  body: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19 },
  bold: { fontWeight: '800', color: adTokens.textPrimary },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginTop: 4 },
  input: { minHeight: 80, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10, fontSize: 13.5, color: adTokens.textPrimary },
  counter: { fontSize: 11, color: adTokens.textSecondary, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryText: { fontWeight: '700', fontSize: 13.5, color: adTokens.textSecondary },
  danger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.danger },
  dangerText: { fontWeight: '700', fontSize: 13.5, color: colors.white },
  spinner: { marginLeft: 8 },
  disabled: { opacity: 0.6 },
});
