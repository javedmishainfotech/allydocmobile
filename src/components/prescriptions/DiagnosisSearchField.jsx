import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useDoseSpotClinical } from '../../hooks/useDoseSpotClinical';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

const MIN_CHARS = 3;

function normalizeDiagnosisResult(row) {
  const diagnosisId = row?.diagnosisId ?? row?.DiagnosisId ?? row?.id ?? row?.Id ?? null;
  const diagnosisCode = String(row?.diagnosisCode ?? row?.DiagnosisCode ?? '').trim();
  const diagnosisName = String(row?.diagnosisName ?? row?.DiagnosisName ?? row?.diagnosisDescription ?? row?.DiagnosisDescription ?? '').trim();
  if (diagnosisId == null || diagnosisId === '') return null;
  const label = diagnosisCode && diagnosisName ? `${diagnosisCode} - ${diagnosisName}` : diagnosisCode || diagnosisName || String(diagnosisId);
  return { diagnosisId: Number(diagnosisId), diagnosisCode, diagnosisName, label };
}

/**
 * Port of AllyDocReactApp's DiagnosisSearchField.jsx (used by RxChangeApproveWithChangesModal's
 * Primary/Secondary Diagnosis fields): search ICD code/description, pick one. Simplified from
 * web's inline-card result list + pagination to a flat tap-to-select list.
 */
export default function DiagnosisSearchField({ label, value, onChange, disabled }) {
  const { searchDiagnoses } = useDoseSpotClinical();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      toast.error(`Type at least ${MIN_CHARS} characters to search.`);
      return;
    }
    setSearching(true);
    const res = await searchDiagnoses(trimmed, 1);
    const data = res.data || {};
    const rawItems = data.Items || data.items || [];
    const list = (Array.isArray(rawItems) ? rawItems : []).map(normalizeDiagnosisResult).filter(Boolean);
    setResults(res.success ? list : []);
    setSearching(false);
    if (!res.success) toast.error(res.message || 'Unable to search diagnoses.');
  };

  const handleSelect = (diagnosis) => {
    onChange?.(diagnosis);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    onChange?.(null);
    setQuery('');
    setResults([]);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedText} numberOfLines={2}>{value.label || value.diagnosisName}</Text>
          {!disabled ? (
            <Pressable onPress={handleClear} hitSlop={6}>
              <Feather name="x-circle" size={16} color={adTokens.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : !disabled ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="Search ICD code or description..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              placeholderTextColor={adTokens.textMuted}
            />
            <Pressable style={styles.searchButton} onPress={runSearch} disabled={searching}>
              {searching ? <ActivityIndicator size={14} color={colors.white} /> : <Feather name="search" size={15} color={colors.white} />}
            </Pressable>
          </View>
          {results.map((item) => (
            <Pressable key={item.diagnosisId} style={styles.resultRow} onPress={() => handleSelect(item)}>
              <Text style={styles.resultText}>{item.label}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6 },
  flex1: { flex: 1 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: adTokens.textPrimary },
  searchButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center', justifyContent: 'center' },
  resultRow: { paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  resultText: { fontSize: 12.5, color: adTokens.textPrimary },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10, backgroundColor: adTokens.gray50 },
  selectedText: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary },
});
