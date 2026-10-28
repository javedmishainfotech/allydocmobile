import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

// Small building blocks shared by every booking step (web: the `bk-*` classes).

export function StepHeader({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ErrorText({ children }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}

export function LoadingBlock({ text }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={adTokens.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

export function ButtonRow({ children }) {
  return <View style={styles.row}>{children}</View>;
}

// Every button below defaults to `flex: 1` for the normal case - a row of them inside
// `ButtonRow`, which shares the row's width between them. That default is wrong for a button
// used on its own outside a row (e.g. a single "Try again" or a dialog's "Close"): with no row to
// grow across, `flex: 1` sets its height's flex-basis to 0 too, and it collapses to a sliver
// instead of its natural, padded size. Pass `soloButtonStyle` (below) as `style` in that case.
export const soloButtonStyle = { flex: 0, alignSelf: 'stretch' };

export function PrimaryButton({ label, onPress, loading, disabled, icon = 'arrow-right', style }) {
  const off = disabled || loading;
  return (
    <Pressable style={[styles.button, styles.primary, off && styles.off, style]} onPress={onPress} disabled={off}>
      {loading ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
      <Text style={styles.primaryText}>{label}</Text>
      {!loading && icon ? <MaterialCommunityIcons name={icon} size={18} color={adTokens.white} /> : null}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }) {
  return (
    <Pressable style={[styles.button, styles.secondary, disabled && styles.off, style]} onPress={onPress} disabled={disabled}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function DangerButton({ label, onPress, loading, style }) {
  return (
    <Pressable style={[styles.button, styles.danger, loading && styles.off, style]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color={adTokens.white} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Web: .bk-title / .bk-questionnaire__title and their .bk-subtitle siblings are all text-align:
  // center, for every step of the booking flow.
  header: { gap: 4, marginBottom: 14, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: adTokens.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19, textAlign: 'center' },
  // A plain grouping panel inside the screen's own card (BookAppointmentPage draws that outer
  // card/shadow) - web: .bk-questionnaire__card, a light inset panel, not a shadowed card itself.
  card: {
    padding: 14,
    gap: 10,
    borderRadius: 12,
    backgroundColor: adTokens.gray50,
  },
  error: { fontSize: 12.5, color: adTokens.danger, marginTop: 4 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { fontSize: 13.5, color: adTokens.textSecondary },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  primary: { backgroundColor: adTokens.primary },
  secondary: { borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  danger: { backgroundColor: adTokens.danger },
  off: { opacity: 0.55 },
  primaryText: { fontSize: 14.5, fontWeight: '700', color: adTokens.white },
  secondaryText: { fontSize: 14.5, fontWeight: '700', color: adTokens.textSecondary },
});
