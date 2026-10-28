import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

const SEARCH_THRESHOLD = 7;
const MAX_PANEL_HEIGHT = 230;

/**
 * A labelled dropdown that expands INLINE directly below its field (no modal / popup / bottom sheet),
 * matching native <select> behaviour: tapping the field opens a bordered panel in the normal layout
 * flow (pushing following content down, never overlapping or getting clipped), with the option list
 * capped and scrollable for long lists (e.g. Frequency's ~80 entries) and a search box for lists long
 * enough to need one.
 */
export default function OptionPicker({ label, value, options, placeholder = 'Select', onChange, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const showSearch = options.length > SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((option) => String(option).toLowerCase().includes(term)) : options;
  }, [options, query]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      setQuery('');
    } else {
      setOpen(true);
    }
  };

  const pick = (item) => {
    onChange(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <Pressable style={[styles.field, open && styles.fieldOpen]} onPress={toggle}>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={adTokens.textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.panel}>
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
          <ScrollView style={styles.optionScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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
  fieldOpen: { borderColor: adTokens.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  fieldText: { flex: 1, fontSize: 13, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },

  panel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: adTokens.primary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
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
  optionScroll: { maxHeight: MAX_PANEL_HEIGHT },
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
