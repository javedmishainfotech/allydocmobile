import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

/**
 * An inline dropdown (web's react-select, e.g. the Condition/Symptom picker in Step1): tapping the
 * field expands a search box and option list directly underneath it, in place - unlike
 * `IdpSelectField`, which opens a full-screen bottom sheet. Keep this for a single, searchable list
 * that reads naturally as "a dropdown"; `IdpSelectField` remains the right choice everywhere else
 * (Identity Proofing, the profile form, short option lists) so this does not change their behaviour.
 */
export default function SearchableDropdown({
  placeholder = 'Select',
  options,
  value,
  onChange,
  error,
  loading,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        disabled={disabled || loading}
        style={[styles.field, open && styles.fieldOpen, !!error && styles.fieldError, (disabled || loading) && styles.fieldDisabled]}
      >
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {loading ? 'Loading...' : selected?.label || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={adTokens.textMuted} />
        ) : (
          <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={adTokens.textMuted} />
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open ? (
        <View style={styles.panel}>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={17} color={adTokens.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={adTokens.textMuted}
              autoFocus
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={16} color={adTokens.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No options found</Text>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(option.value);
                      close();
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={2}>
                      {option.label}
                    </Text>
                    {active ? <MaterialCommunityIcons name="check" size={16} color={adTokens.primary} /> : null}
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  fieldOpen: { borderColor: adTokens.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  fieldError: { borderColor: adTokens.danger },
  fieldDisabled: { opacity: 0.6 },
  fieldText: { flex: 1, fontSize: 14.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },
  errorText: { fontSize: 12.5, color: adTokens.danger, marginTop: 4 },

  panel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: adTokens.primary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: adTokens.white,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: adTokens.textPrimary, paddingVertical: 4 },
  list: { maxHeight: 260 },
  empty: { padding: 16, fontSize: 13.5, color: adTokens.textMuted, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  optionActive: { backgroundColor: adTokens.primaryLight },
  optionText: { flex: 1, fontSize: 14, color: adTokens.textPrimary },
  optionTextActive: { fontWeight: '700', color: adTokens.primaryDark },
});
