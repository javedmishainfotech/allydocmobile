import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InlineCalendar from './InlineCalendar';
import { adTokens } from '../theme/colors';

/**
 * Bottom-sheet date picker built on the app's own InlineCalendar (no date-picker library is
 * installed). Tapping a day picks it and closes the sheet; "Clear" removes the date.
 * `value` is a Date or null.
 */
export default function DatePickerSheet({ visible, title, value, onSelect, onClear, onClose }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <InlineCalendar
            selectedDate={value || new Date()}
            onSelectDate={(date) => {
              onSelect(date);
              onClose();
            }}
          />

          <View style={styles.footer}>
            {onClear ? (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  onClear();
                  onClose();
                }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  clearButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  clearText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  closeButton: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  closeText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
