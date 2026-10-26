import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { changePassword } from '../../services/settingsService';
import {
  PASSWORD_MAX_LENGTH,
  getPasswordRulesStatus,
  getPasswordStrength,
  isPasswordValid,
} from '../../utils/passwordValidation';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';

const RULE_LABELS = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasNumber', label: 'At least 1 number' },
  { key: 'hasLowercase', label: 'At least 1 lowercase letter' },
  { key: 'hasUppercase', label: 'At least 1 uppercase letter' },
  { key: 'hasSpecialChar', label: 'At least 1 special character' },
];

function PasswordField({ label, value, onChangeText, visible, onToggleVisible }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder={label}
          placeholderTextColor={adTokens.textMuted}
        />
        <Pressable onPress={onToggleVisible} hitSlop={8}>
          <Feather name={visible ? 'eye-off' : 'eye'} size={16} color={adTokens.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Port of AllyDocReactApp/src/components/ChangePasswordTab.jsx. */
export default function ChangePasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rules = getPasswordRulesStatus(newPassword);
  const strength = getPasswordStrength(newPassword);

  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    confirmPassword === newPassword &&
    newPassword !== currentPassword;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (newPassword === currentPassword && newPassword) {
        toast.error('New password must be different from current password.');
      } else if (confirmPassword !== newPassword) {
        toast.error('Passwords must match.');
      }
      return;
    }
    setIsSubmitting(true);
    const response = await changePassword({ currentPassword, newPassword, confirmPassword });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(response.message || 'Unable to update password.');
    }
  };

  return (
    <View style={styles.card}>
      <PasswordField
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        visible={showCurrent}
        onToggleVisible={() => setShowCurrent((v) => !v)}
      />
      <PasswordField
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        visible={showNew}
        onToggleVisible={() => setShowNew((v) => !v)}
      />

      {newPassword.length > 0 ? (
        <View style={styles.strengthRow}>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                { width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      ) : null}

      <View style={styles.rulesList}>
        {RULE_LABELS.map(({ key, label }) => (
          <View key={key} style={styles.ruleRow}>
            <Feather
              name={rules[key] ? 'check-circle' : 'circle'}
              size={13}
              color={rules[key] ? adTokens.success : adTokens.textMuted}
            />
            <Text style={[styles.ruleText, rules[key] && styles.ruleTextDone]}>{label}</Text>
          </View>
        ))}
      </View>

      <PasswordField
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        visible={showConfirm}
        onToggleVisible={() => setShowConfirm((v) => !v)}
      />
      {confirmPassword.length > 0 && confirmPassword !== newPassword ? (
        <Text style={styles.errorText}>Passwords must match.</Text>
      ) : null}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        disabled={!canSubmit || isSubmitting}
        onPress={handleSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator size={14} color={colors.white} />
        ) : (
          <Text style={styles.submitButtonText}>Update Password</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
  },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary, padding: 0 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  strengthTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontSize: 11.5, fontWeight: '700' },

  rulesList: { gap: 5, marginBottom: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ruleText: { fontSize: 11.5, color: adTokens.textSecondary },
  ruleTextDone: { color: adTokens.success, fontWeight: '600' },

  errorText: { color: adTokens.danger, fontSize: 12, marginTop: -8, marginBottom: 10 },

  submitButton: {
    backgroundColor: adTokens.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
});
