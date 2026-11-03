import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors, adTokens } from '../../theme/colors';

/** Port of SetPinModal in AllyDocReactApp/src/utils/Modals/Modals.jsx - single 4-digit PIN input. */
export default function SetPinModal({ visible, mode = 'set', onClose, onSave, isSaving }) {
  const [pin, setPin] = useState('');
  const isValid = /^\d{4}$/.test(pin);

  const handleSave = () => {
    if (!isValid) return;
    onSave(pin);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'reset' ? 'Set New PIN' : 'Set PIN'}</Text>
          <Text style={styles.subtitle}>Enter a 4-digit PIN for two-factor authentication.</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={adTokens.textMuted}
          />
          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSaving}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveButton, !isValid && styles.saveButtonDisabled]} disabled={!isValid || isSaving} onPress={handleSave}>
              {isSaving ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: adTokens.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 4, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    color: adTokens.textPrimary,
  },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  closeButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 80, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
