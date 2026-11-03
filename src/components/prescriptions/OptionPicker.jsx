import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { adTokens } from '../../theme/colors';

const SEARCH_THRESHOLD = 7;
const MAX_PANEL_HEIGHT = 230;
const SCREEN_MARGIN = 12;

/**
 * A labelled dropdown that opens as a floating overlay anchored to its field - like a web
 * <select>, the option list renders ON TOP of whatever is on screen (a transparent Modal,
 * positioned at the field's measured on-screen coordinates) instead of expanding inline and
 * pushing the rest of the layout down. The inline-expand approach used to visually collide with
 * sibling buttons in the same row (e.g. the "Medication/Supplies" picker next to "Add Custom
 * Supply" on the Add Prescription screen) because a flex row re-centers its shorter siblings
 * against the picker's new (taller) height; an overlay sidesteps that entirely since it no
 * longer affects layout.
 */
export default function OptionPicker({ label, value, options, placeholder = 'Select', onChange, required }) {
  const fieldRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState(null); // { x, y, width, height } in window coordinates
  const showSearch = options.length > SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((option) => String(option).toLowerCase().includes(term)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const pick = (item) => {
    onChange(item);
    close();
  };

  // Clamp the panel so it never runs off the bottom of the screen - open it upward instead when
  // there isn't enough room below the field.
  const windowHeight = Dimensions.get('window').height;
  const spaceBelow = anchor ? windowHeight - (anchor.y + anchor.height) - SCREEN_MARGIN : 0;
  const panelHeight = Math.min(MAX_PANEL_HEIGHT + (showSearch ? 44 : 0), Math.max(spaceBelow, 140));
  const openUpward = anchor ? spaceBelow < 160 && anchor.y > spaceBelow : false;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <Pressable ref={fieldRef} style={[styles.field, open && styles.fieldOpen]} onPress={toggle}>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={adTokens.textSecondary} />
      </Pressable>

      {open && anchor ? (
        <Modal visible transparent animationType="fade" onRequestClose={close}>
          <Toast />
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View
            style={[
              styles.panel,
              {
                left: anchor.x,
                width: anchor.width,
                maxHeight: panelHeight,
                ...(openUpward
                  ? { bottom: windowHeight - anchor.y + 4 }
                  : { top: anchor.y + anchor.height + 4 }),
              },
            ]}
          >
            {showSearch ? (
              <View style={styles.searchRow}>
                <Feather name="search" size={14} color={adTokens.textSecondary} />
                <TextInput
                  style={styles.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor={adTokens.textMuted}
                  autoFocus
                />
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {value ? (
                <Pressable style={styles.option} onPress={() => pick('')}>
                  <Text style={styles.optionClearText}>Clear selection</Text>
                </Pressable>
              ) : null}
              {filtered.length === 0 ? (
                <Text style={styles.empty}>No matches</Text>
              ) : (
                filtered.map((item) => {
                  const active = item === value;
                  return (
                    <Pressable key={String(item)} style={[styles.option, active && styles.optionActive]} onPress={() => pick(item)}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={2}>
                        {String(item)}
                      </Text>
                      {active ? <Feather name="check" size={15} color={adTokens.primaryDark} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', color: adTokens.textSecondary },
  required: { color: adTokens.danger },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: adTokens.white,
  },
  fieldOpen: { borderColor: adTokens.primary },
  fieldText: { flex: 1, fontSize: 13, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },

  // Absolutely positioned (top/left/bottom set inline from the measured field) inside the
  // Modal's full-screen layer, so it floats above everything on the page underneath.
  panel: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: adTokens.primary,
    borderRadius: 10,
    backgroundColor: adTokens.white,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  search: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary, paddingVertical: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  optionActive: { backgroundColor: adTokens.primaryLight },
  optionText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },
  optionTextActive: { fontWeight: '700', color: adTokens.primaryDark },
  optionClearText: { fontSize: 13, color: adTokens.textSecondary, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: adTokens.textSecondary, paddingVertical: 16, fontSize: 13 },
});
