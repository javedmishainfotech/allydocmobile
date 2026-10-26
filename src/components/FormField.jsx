import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Port of .field-label / .form-group / .img-start / input[type=...] in
// newStyle.css: left icon, 1px border, blue focus ring, red error text.
export default function FormField({
  label,
  icon,
  iconSet = 'feather',
  error,
  secureToggle = false,
  containerStyle,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const IconComponent = iconSet === 'material' ? MaterialCommunityIcons : Feather;

  return (
    <View style={[styles.group, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <IconComponent name={icon} size={18} color={colors.placeholder} style={styles.iconStart} />
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureToggle && !secureVisible}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          {...inputProps}
        />
        {secureToggle && (
          <Pressable style={styles.iconEnd} onPress={() => setSecureVisible((prev) => !prev)}>
            <Feather name={secureVisible ? 'eye-off' : 'eye'} size={18} color={colors.placeholder} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 4 },
  label: { fontSize: 15, fontWeight: '500', color: colors.fieldLabel, marginBottom: 6 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  iconStart: { position: 'absolute', left: 14, zIndex: 1 },
  iconEnd: { position: 'absolute', right: 14, zIndex: 1 },
  input: {
    width: '100%',
    paddingVertical: 13,
    paddingLeft: 42,
    paddingRight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    fontSize: 15,
    color: colors.inputText,
  },
  inputFocused: { borderColor: colors.accentDark },
  error: { fontSize: 12, marginTop: 4, color: colors.dangerText },
});
