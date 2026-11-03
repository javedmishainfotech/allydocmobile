import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { IdpButton, IdpTextField } from './IdpUi';
import { adTokens } from '../../theme/colors';

const isSequential = (str) => {
  const digits = str.split('').map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return ascending || descending;
};

const onlyPinDigits = (text) => text.replace(/\D/g, '').slice(0, 4);

/**
 * Port of SetPinModal (set / update modes) in AllyDocReactApp utils/Modals/Modals.jsx,
 * with the same validation: 4 digits, no sequential or repeated digits, new PIN must
 * differ from the current one and match its confirmation.
 *
 * `onSave` receives the PIN string (set) or `{ currentPin, newPin }` (update) and may
 * resolve with `{ currentPinError }` to flag a wrong current PIN on that field.
 */
export default function IdpPinModal({ visible, ...formProps }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={formProps.onClose}>
      <Toast />
      {/* Mounted only while open, so every opening starts with a clean form. */}
      {visible ? <PinForm {...formProps} /> : null}
    </Modal>
  );
}

function PinForm({ mode = 'set', isSubmitting = false, onClose, onSave }) {
  const isUpdateMode = mode === 'update';
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState({ currentPin: '', pin: '', confirmPin: '' });

  const validate = () => {
    const next = { currentPin: '', pin: '', confirmPin: '' };

    if (isUpdateMode && currentPin.length !== 4) {
      next.currentPin = 'Current PIN must be 4 digits';
      setErrors(next);
      return false;
    }

    if (pin.length !== 4) {
      next.pin = 'PIN must be 4 digits';
    } else if (isSequential(pin)) {
      next.pin = 'Avoid using sequential numbers (1234)';
      setErrors(next);
      return false;
    } else if (/^(\d)\1{3}$/.test(pin)) {
      next.pin = "Don't use repeated digits (1111, 0000)";
      setErrors(next);
      return false;
    } else if (isUpdateMode && currentPin === pin) {
      next.pin = 'New PIN must be different from current PIN';
      setErrors(next);
      return false;
    }

    if (pin !== confirmPin) next.confirmPin = 'PINs do not match';

    setErrors(next);
    return !next.currentPin && !next.pin && !next.confirmPin;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const outcome = await onSave(isUpdateMode ? { currentPin, newPin: pin } : pin);
    if (outcome?.currentPinError) {
      setErrors((prev) => ({ ...prev, currentPin: outcome.currentPinError }));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Pressable style={styles.close} onPress={onClose} hitSlop={10} disabled={isSubmitting}>
              <MaterialCommunityIcons name="close" size={20} color={adTokens.textSecondary} />
            </Pressable>

            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock" size={28} color="#4688F1" />
              </View>
              <Text style={styles.title}>{isUpdateMode ? 'Update Your 4-Digit PIN' : 'Set Your 4-Digit PIN'}</Text>
              {!isUpdateMode ? (
                <Text style={styles.subtitle}>Create a secure 4-digit PIN for prescribing controlled substances</Text>
              ) : null}
            </View>

            {isUpdateMode ? (
              <IdpTextField
                label="Current PIN"
                required
                secureToggle
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Enter current 4-digit PIN"
                value={currentPin}
                onChangeText={(text) => {
                  setCurrentPin(onlyPinDigits(text));
                  setErrors((prev) => ({ ...prev, currentPin: '' }));
                }}
                error={errors.currentPin ? errors.currentPin : undefined}
              />
            ) : null}

            <IdpTextField
              label={isUpdateMode ? 'New PIN' : 'Enter your PIN'}
              required
              secureToggle
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Enter new 4-digit PIN"
              value={pin}
              onChangeText={(text) => {
                setPin(onlyPinDigits(text));
                setErrors((prev) => ({ ...prev, pin: '' }));
              }}
              error={errors.pin || undefined}
              helper={isUpdateMode ? 'Please enter your new 4-digit PIN' : undefined}
            />
            <IdpTextField
              label={isUpdateMode ? 'Confirm New PIN' : 'Confirm your PIN'}
              required
              secureToggle
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Re-enter new 4-digit PIN"
              value={confirmPin}
              onChangeText={(text) => {
                setConfirmPin(onlyPinDigits(text));
                setErrors((prev) => ({ ...prev, confirmPin: '' }));
              }}
              error={errors.confirmPin || undefined}
              helper={isUpdateMode ? 'Please confirm your new 4-digit PIN' : undefined}
            />

            <View style={styles.tips}>
              {isUpdateMode ? (
                <>
                  <Text style={styles.tipsTitle}>Security Tip:</Text>
                  <Text style={styles.tipText}>
                    Choose a unique PIN that you haven&apos;t used elsewhere for enhanced security.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.tipsTitle}>Security Tips:</Text>
                  <Text style={styles.tipText}>• Avoid using sequential numbers (1234)</Text>
                  <Text style={styles.tipText}>• Don&apos;t use repeated digits (1111, 0000)</Text>
                  <Text style={styles.tipText}>• Choose a PIN you can remember easily</Text>
                  <Text style={styles.tipText}>• Don&apos;t share your PIN with anyone</Text>
                </>
              )}
            </View>

            <View style={styles.actions}>
              <IdpButton label="Cancel" variant="outline-secondary" onPress={onClose} disabled={isSubmitting} flex />
              <IdpButton
                label={isUpdateMode ? 'Update PIN' : 'Save'}
                variant="primary"
                onPress={handleSave}
                loading={isSubmitting}
                flex
              />
            </View>
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, maxHeight: '92%', backgroundColor: adTokens.white, borderRadius: 14 },
  body: { padding: 20 },
  close: { position: 'absolute', top: 0, right: 0, zIndex: 2, padding: 4 },
  header: { alignItems: 'center', marginBottom: 16 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, color: adTokens.textSecondary, textAlign: 'center', marginTop: 4 },
  tips: { padding: 12, borderRadius: 8, backgroundColor: '#F8FAFC', marginBottom: 14 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
  tipText: { fontSize: 12.5, lineHeight: 19, color: adTokens.textSecondary },
  actions: { flexDirection: 'row', gap: 12 },
});
