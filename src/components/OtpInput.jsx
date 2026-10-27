import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * One box per digit. A single transparent TextInput sits behind the boxes and holds the real
 * value, so typing, backspace, paste and the keyboard's SMS-code suggestion all work like a
 * normal field; the boxes only display it. Tapping any box focuses that input.
 */
export default function OtpInput({ value, onChange, length = 4, autoFocus = true }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        const isActive = focused && index === activeIndex;
        return (
          <View
            key={index}
            style={[styles.box, digit ? styles.boxFilled : null, isActive && styles.boxActive]}
          >
            <Text style={styles.digit}>{digit}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel={`${length}-digit verification code`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 20 },
  box: {
    width: 58,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.hintBorder, backgroundColor: colors.hintBg },
  boxActive: { borderColor: colors.accentDark, borderWidth: 2 },
  digit: { fontSize: 26, fontWeight: '700', color: colors.heading },
  // Covers the whole row, invisible: the user's taps and the keyboard land here.
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0.011, color: 'transparent' },
});
