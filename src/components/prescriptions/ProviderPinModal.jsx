import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { adTokens, colors } from '../../theme/colors';

/** Port of web's ProviderPinModal (send flow): the prescriber's 4-digit PIN authorizes sending the selected prescriptions. */
export default function ProviderPinModal({ visible, loading, onConfirm, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setPin('');
      setError('');
    }
  }, [visible]);

  const submit = () => {
    const trimmed = pin.trim();
    if (!trimmed) {
      setError('PIN is required');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>Enter Prescriber PIN</Text>
          <Text style={styles.body}>
            This prescriber has a PIN on file. Please enter your secure 4-digit prescriber PIN to authorize and send the
            selected prescription(s).
          </Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/\D/g, '').slice(0, 4));
              if (error) setError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="4-digit PIN"
            placeholderTextColor={adTokens.textMuted}
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={loading}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primary, (loading || !pin.trim()) && styles.disabled]} onPress={submit} disabled={loading || !pin.trim()}>
              <Text style={styles.primaryText}>Authorize & Send</Text>
              {loading ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
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
  body: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 18, letterSpacing: 6, textAlign: 'center', color: adTokens.textPrimary },
  error: { fontSize: 12, color: adTokens.danger },
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryText: { fontWeight: '700', fontSize: 13, color: adTokens.textSecondary },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary },
  buttonSpinner: { marginLeft: 8 },
  primaryText: { fontWeight: '700', fontSize: 13, color: colors.white },
  disabled: { opacity: 0.5 },
});
