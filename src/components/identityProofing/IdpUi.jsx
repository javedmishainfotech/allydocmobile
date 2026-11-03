import React, { useMemo, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adTokens } from '../../theme/colors';

/**
 * Small shared kit for the Identity Proofing module. Colours are the ones the
 * web module hard-codes (green primary #1AA54F, red outline cancel #dc3545,
 * Bootstrap alert palettes, #E3F2FD info panels) layered on the app's adTokens.
 */
export const idpColors = {
  green: '#1AA54F',
  greenPressed: '#158a3f',
  idMeGreen: '#009900',
  red: '#dc3545',
  blue: '#0d6efd',
  muted: '#6c757d',
  text: '#3A3A3A',
  bodyText: '#5F6368',
  infoBg: '#E3F2FD',
  infoBorder: '#90CAF9',
  infoText: '#1976D2',
};

// ---------------------------------------------------------------------------
// Screen layout: keyboard-aware scroll area + optional pinned footer actions.
// ---------------------------------------------------------------------------
export function IdpScreen({ children, footer, refreshControl, contentStyle }) {
  const insets = useSafeAreaInsets();
  const containerRef = useRef(null);
  // Distance from the top of the window to this screen, so the keyboard offset is right under any header.
  const [windowTop, setWindowTop] = useState(0);

  return (
    <KeyboardAvoidingView
      ref={containerRef}
      style={styles.flex1}
      behavior="padding"
      keyboardVerticalOffset={windowTop}
      onLayout={() => containerRef.current?.measureInWindow((_x, y) => setWindowTop(y || 0))}
    >
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={[styles.screenContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function IdpCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
const BUTTON_VARIANTS = {
  success: { bg: idpColors.green, border: idpColors.green, color: '#fff' },
  idme: { bg: idpColors.idMeGreen, border: idpColors.idMeGreen, color: '#fff' },
  primary: { bg: adTokens.primary, border: adTokens.primary, color: '#fff' },
  'outline-danger': { bg: 'transparent', border: idpColors.red, color: idpColors.red },
  'outline-primary': { bg: 'transparent', border: idpColors.blue, color: idpColors.blue },
  'outline-secondary': { bg: 'transparent', border: idpColors.muted, color: idpColors.muted },
};

export function IdpButton({ label, onPress, variant = 'success', loading, disabled, icon, style, flex }) {
  const config = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.success;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: config.bg, borderColor: config.border },
        flex && styles.buttonFlex,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={config.color} /> : null}
      {icon && !loading ? <MaterialCommunityIcons name={icon} size={18} color={config.color} /> : null}
      <Text style={[styles.buttonLabel, { color: config.color }]}>{label}</Text>
    </Pressable>
  );
}

export function IdpLinkButton({ label, onPress, color = adTokens.textSecondary }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.linkButton}>
      <Text style={[styles.linkButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Alerts / pills
// ---------------------------------------------------------------------------
const ALERT_VARIANTS = {
  success: { bg: '#d1e7dd', border: '#badbcc', color: '#0f5132', icon: 'check-circle-outline' },
  danger: { bg: '#f8d7da', border: '#f5c2c7', color: '#842029', icon: 'alert-circle-outline' },
  warning: { bg: '#fff3cd', border: '#ffecb5', color: '#664d03', icon: 'alert-outline' },
  info: { bg: '#cff4fc', border: '#b6effb', color: '#055160', icon: 'information-outline' },
};

export function IdpAlert({ variant = 'info', title, children, onClose, footnote, style }) {
  const config = ALERT_VARIANTS[variant] || ALERT_VARIANTS.info;
  return (
    <View style={[styles.alert, { backgroundColor: config.bg, borderColor: config.border }, style]}>
      <MaterialCommunityIcons name={config.icon} size={20} color={config.color} style={styles.alertIcon} />
      <View style={styles.flex1}>
        {title ? <Text style={[styles.alertTitle, { color: config.color }]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.alertText, { color: config.color }]}>{children}</Text>
        ) : (
          children
        )}
        {footnote ? <Text style={styles.alertFootnote}>{footnote}</Text> : null}
      </View>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={18} color={config.color} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Light-blue "information box" used by the facial-steps / TFA guide pages. */
export function IdpInfoBox({ icon = 'information-outline', children, tone = 'info', style }) {
  const isWarn = tone === 'warning';
  return (
    <View
      style={[
        styles.infoBox,
        isWarn ? { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' } : null,
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={isWarn ? '#E65100' : idpColors.infoText}
        style={styles.alertIcon}
      />
      <View style={styles.flex1}>{children}</View>
    </View>
  );
}

export function IdpPill({ config, prefix }) {
  if (!config) return null;
  return (
    <View style={[styles.pill, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.pillText, { color: config.textColor }]}>
        {prefix ? `${prefix}: ` : ''}
        {config.label}
      </Text>
    </View>
  );
}

export function IdpBulletList({ items, bulletColor = adTokens.primary, textColor = adTokens.textSecondary, getItemStyle }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => {
        const overrides = getItemStyle ? getItemStyle(item) : null;
        return (
          <View key={item} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: overrides?.bullet || bulletColor }]} />
            <Text style={[styles.bulletText, { color: overrides?.text || textColor }]}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function IdpNumberBadge({ number, size = 32 }) {
  return (
    <View style={[styles.numberBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.numberBadgeText}>{number}</Text>
    </View>
  );
}

export function IdpBackRow({ onPress, label = 'Back' }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.backRow}>
      <MaterialCommunityIcons name="arrow-left" size={18} color={adTokens.textPrimary} />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------
function FieldLabel({ label, required }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

export function IdpTextField({
  label,
  required,
  error,
  helper,
  disabled,
  prefix,
  secureToggle,
  containerStyle,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          !!error && styles.inputWrapError,
          disabled && styles.inputWrapDisabled,
        ]}
      >
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={adTokens.textMuted}
          editable={!disabled}
          secureTextEntry={secureToggle && !visible}
          autoCorrect={false}
          autoCapitalize={inputProps.autoCapitalize ?? 'none'}
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
        {secureToggle ? (
          <Pressable onPress={() => setVisible((prev) => !prev)} hitSlop={10}>
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={adTokens.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
}

/** Native-feeling replacement for the web <select>: a tappable field that opens a searchable bottom sheet. */
export function IdpSelectField({
  label,
  required,
  error,
  disabled,
  loading,
  placeholder = 'Select',
  options,
  value,
  onChange,
  containerStyle,
  searchable = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled || loading}
        style={[styles.inputWrap, styles.selectWrap, (disabled || loading) && styles.inputWrapDisabled, !!error && styles.inputWrapError]}
      >
        <Text style={[styles.selectText, !selected && !value && { color: adTokens.textMuted }]} numberOfLines={1}>
          {loading ? 'Loading...' : selected?.label || (value ? String(value) : placeholder)}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={adTokens.textMuted} />
        ) : (
          <MaterialCommunityIcons name="chevron-down" size={20} color={adTokens.textMuted} />
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Toast />
        <Pressable style={styles.sheetBackdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label || 'Select'}</Text>
            <Pressable onPress={close} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={adTokens.textSecondary} />
            </Pressable>
          </View>
          {searchable ? (
            <TextInput
              style={styles.sheetSearch}
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={adTokens.textMuted}
              autoCorrect={false}
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.sheetEmpty}>No options available</Text>}
            renderItem={({ item }) => {
              const isActive = item.value === value;
              return (
                <Pressable
                  style={[styles.sheetOption, isActive && styles.sheetOptionActive]}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                >
                  <Text style={[styles.sheetOptionText, isActive && styles.sheetOptionTextActive]}>{item.label}</Text>
                  {isActive ? <MaterialCommunityIcons name="check" size={18} color={adTokens.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

export function IdpCheckbox({ checked, onChange, children, error }) {
  return (
    <View>
      <Pressable style={styles.checkboxRow} onPress={() => onChange(!checked)}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <MaterialCommunityIcons name="check" size={15} color="#fff" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>{children}</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function IdpLoading({ label }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={adTokens.primary} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenContent: { padding: 16, paddingBottom: 28 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: adTokens.white,
    borderTopWidth: 1,
    borderTopColor: adTokens.gray200,
  },

  card: {
    backgroundColor: adTokens.white,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.gray200,
    padding: 16,
    ...adTokens.cardShadow,
  },

  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonFlex: { flex: 1 },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  linkButton: { paddingVertical: 6 },
  linkButtonLabel: { fontSize: 13.5, fontWeight: '600' },

  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertIcon: { marginTop: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  alertText: { fontSize: 13.5, lineHeight: 19 },
  alertFootnote: { fontSize: 12, color: adTokens.textSecondary, marginTop: 4 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: idpColors.infoBg,
    borderColor: idpColors.infoBorder,
  },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '700' },

  bulletList: { gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13.5, lineHeight: 20 },

  numberBadge: { backgroundColor: idpColors.blue, alignItems: 'center', justifyContent: 'center' },
  numberBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8 },
  backLabel: { fontSize: 14, fontWeight: '500', color: adTokens.textPrimary },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary, marginBottom: 6 },
  required: { color: idpColors.red },
  inputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  inputWrapFocused: { borderColor: adTokens.primary },
  inputWrapError: { borderColor: idpColors.red },
  inputWrapDisabled: { backgroundColor: adTokens.gray100 },
  inputPrefix: { fontSize: 15, color: adTokens.textSecondary, fontWeight: '600' },
  input: { flex: 1, fontSize: 15, color: adTokens.textPrimary, paddingVertical: 10 },
  errorText: { color: idpColors.red, fontSize: 12.5, marginTop: 4 },
  helperText: { color: adTokens.textSecondary, fontSize: 12, marginTop: 4 },

  selectWrap: { justifyContent: 'space-between' },
  selectText: { flex: 1, fontSize: 15, color: adTokens.textPrimary },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  sheetSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    fontSize: 14,
    color: adTokens.textPrimary,
  },
  sheetEmpty: { textAlign: 'center', color: adTokens.textMuted, padding: 24, fontSize: 13 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: adTokens.gray100,
  },
  sheetOptionActive: { backgroundColor: adTokens.primaryLight },
  sheetOptionText: { fontSize: 15, color: adTokens.textPrimary },
  sheetOptionTextActive: { color: adTokens.primaryDark, fontWeight: '600' },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: adTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: idpColors.blue, borderColor: idpColors.blue },
  checkboxLabel: { flex: 1, fontSize: 13.5, lineHeight: 20, color: adTokens.textPrimary },

  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  loadingLabel: { fontSize: 13, color: adTokens.textSecondary },
});
