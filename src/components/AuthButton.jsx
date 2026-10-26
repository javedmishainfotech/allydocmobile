import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

// Port of .btn-auth in newStyle.css.
export default function AuthButton({ label, onPress, disabled, loading }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : pressed && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.white} size="small" /> : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.accentDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPressed: { backgroundColor: colors.accentDarker },
  buttonDisabled: { backgroundColor: colors.disabledButtonBg },
  label: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
