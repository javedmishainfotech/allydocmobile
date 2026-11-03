import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getItem } from '../../utils/storage';
import { getAssignedDiseases, assignDiseases } from '../../services/settingsService';
import { adTokens } from '../../theme/colors';
import SegmentedTabs from '../ui/SegmentedTabs';

function normalizeDiseaseOptions(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const value = item?.diseaseId ?? item?.DiseaseId;
      if (value == null || value === '') return null;
      const label = (item?.patientDisplayName ?? item?.name ?? item?.Name ?? '').trim() || String(value);
      return { value: String(value), label, isAssigned: Boolean(item?.isAssigned) };
    })
    .filter(Boolean);
}

/**
 * Port of AllyDocReactApp/.../Settings/AssignDiseaseTab.jsx (Clinic Admin's disease picker):
 * Available/Assigned two-tab checkbox list backed by `GetAssignedDiseases`/`AssignDiseases`.
 * Web reads the clinic code from `localStorage.getItem("code") || localStorage.getItem("clinicCode")`
 * - neither key is ever set anywhere in the web app's own login flow, so this feature is a no-op
 * there for every real user; ported here with the exact same (broken) lookup for parity.
 */
export default function AssignDiseaseTab() {
  const navigation = useNavigation();
  const [clinicCode, setClinicCode] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [toUnassign, setToUnassign] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');
  const [availableSearch, setAvailableSearch] = useState('');
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    (async () => {
      const code = (await getItem('code')) || (await getItem('clinicCode')) || '';
      setClinicCode(code);
    })();
  }, []);

  const load = async (code) => {
    setSelected([]);
    setToUnassign([]);
    if (!code) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setValidationError('');
    const res = await getAssignedDiseases(code);
    setOptions(res.success ? normalizeDiseaseOptions(res.data) : []);
    setLoading(false);
  };

  useEffect(() => {
    load(clinicCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicCode]);

  const assignedList = useMemo(() => options.filter((o) => o.isAssigned), [options]);
  const availableList = useMemo(() => options.filter((o) => !o.isAssigned), [options]);

  const filteredAvailable = useMemo(() => {
    const q = availableSearch.trim().toLowerCase();
    if (!q) return availableList;
    return availableList.filter((item) => item.label.toLowerCase().includes(q));
  }, [availableList, availableSearch]);

  const filteredAssigned = useMemo(() => {
    const q = assignedSearch.trim().toLowerCase();
    if (!q) return assignedList;
    return assignedList.filter((item) => item.label.toLowerCase().includes(q));
  }, [assignedList, assignedSearch]);

  const isAvailableTab = activeTab === 'available';
  const selectedCount = isAvailableTab ? selected.length : toUnassign.length;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setValidationError('');
  };

  const toggleAvailableItem = (value) => {
    if (submitting) return;
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    if (validationError) setValidationError('');
  };

  const toggleAssignedItem = (value) => {
    if (submitting) return;
    setToUnassign((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    if (validationError) setValidationError('');
  };

  const submit = async (diseaseIds) => {
    setSubmitting(true);
    await assignDiseases({ code: clinicCode, diseaseIds });
    setSubmitting(false);
    await load(clinicCode);
  };

  const handleAssign = () => {
    if (!clinicCode) {
      setValidationError('Clinic code not found. Please login again.');
      return;
    }
    if (!selected.length) {
      setValidationError('Select at least one disease to assign.');
      return;
    }
    setValidationError('');
    submit([...assignedList.map((o) => Number(o.value)), ...selected.map((v) => Number(v))]);
  };

  const handleUnassign = () => {
    if (!clinicCode) {
      setValidationError('Clinic code not found. Please login again.');
      return;
    }
    if (!toUnassign.length) {
      setValidationError('Uncheck at least one disease to unassign.');
      return;
    }
    setValidationError('');
    const removed = new Set(toUnassign);
    submit(assignedList.filter((o) => !removed.has(o.value)).map((o) => Number(o.value)));
  };

  const handleCancel = () => {
    if (isAvailableTab) setSelected([]);
    else setToUnassign([]);
    setValidationError('');
  };

  return (
    <View>
      <View style={styles.headRow}>
        <View style={styles.headIcon}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color={adTokens.primaryDark} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.headTitle}>Assign Diseases</Text>
          <Text style={styles.headSub}>Manage diseases for this clinic{clinicCode ? ` (${clinicCode})` : ''}.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Available Diseases</Text>
          <Text style={styles.statValue}>{loading ? '-' : availableList.length}</Text>
        </View>
        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={styles.statLabel}>Assigned Diseases</Text>
          <Text style={styles.statValue}>{loading ? '-' : assignedList.length}</Text>
        </View>
      </View>

      <SegmentedTabs
        tabs={[
          { key: 'available', label: 'Available', count: availableList.length },
          { key: 'assigned', label: 'Assigned', count: assignedList.length },
        ]}
        activeKey={activeTab}
        onChange={switchTab}
        style={styles.tabBar}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : isAvailableTab ? (
        <>
          <View style={styles.searchRow}>
            <Feather name="search" size={14} color={adTokens.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search diseases by name..."
              value={availableSearch}
              onChangeText={setAvailableSearch}
              editable={!submitting}
            />
          </View>
          {filteredAvailable.length === 0 ? (
            <Text style={styles.emptyText}>No diseases available to assign</Text>
          ) : (
            <ScrollView style={styles.list} nestedScrollEnabled>
              {filteredAvailable.map((item) => {
                const checked = selected.includes(item.value);
                return (
                  <Pressable key={item.value} style={styles.itemRow} onPress={() => toggleAvailableItem(item.value)}>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Feather name="check" size={12} color={adTokens.white} /> : null}
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : assignedList.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="heart-pulse" size={28} color={adTokens.textMuted} />
          <Text style={styles.emptyTitle}>No diseases assigned yet</Text>
          <Text style={styles.emptyText}>Select diseases in the Available tab and tap Assign to add them here.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.hintText}>Uncheck a disease to unassign it on save.</Text>
          <View style={styles.searchRow}>
            <Feather name="search" size={14} color={adTokens.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assigned diseases..."
              value={assignedSearch}
              onChangeText={setAssignedSearch}
              editable={!submitting}
            />
          </View>
          <ScrollView style={styles.list} nestedScrollEnabled>
            {filteredAssigned.map((item) => {
              const checked = !toUnassign.includes(item.value);
              return (
                <View key={item.value} style={styles.itemRow}>
                  <Pressable style={styles.itemRowMain} onPress={() => toggleAssignedItem(item.value)}>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Feather name="check" size={12} color={adTokens.white} /> : null}
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.manageQuestionsBtn}
                    hitSlop={6}
                    onPress={() =>
                      navigation.navigate('DiseaseQuestionnaire', {
                        diseaseId: Number(item.value),
                        diseaseName: item.label,
                      })
                    }
                  >
                    <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={adTokens.primaryDark} />
                  </Pressable>
                  <View style={[styles.chip, !checked && styles.chipRemove]}>
                    <Text style={[styles.chipText, !checked && styles.chipTextRemove]}>
                      {checked ? 'Assigned' : 'Will unassign'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {!loading && (isAvailableTab || assignedList.length > 0) ? (
        <View style={styles.footer}>
          <Text style={validationError ? styles.footerError : styles.footerCount}>
            {validationError || `${selectedCount} selected`}
          </Text>
          <View style={styles.footerButtons}>
            <Pressable style={styles.cancelButton} onPress={handleCancel} disabled={submitting || !selectedCount}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            {isAvailableTab ? (
              <Pressable
                style={[styles.assignButton, (submitting || !selected.length) && styles.disabledButton]}
                onPress={handleAssign}
                disabled={submitting || !selected.length}
              >
                {submitting ? (
                  <ActivityIndicator size={14} color={adTokens.white} />
                ) : (
                  <Text style={styles.assignButtonText}>Assign ({selected.length})</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={[styles.unassignButton, (submitting || !toUnassign.length) && styles.disabledButton]}
                onPress={handleUnassign}
                disabled={submitting || !toUnassign.length}
              >
                {submitting ? (
                  <ActivityIndicator size={14} color={adTokens.white} />
                ) : (
                  <Text style={styles.assignButtonText}>Unassign ({toUnassign.length})</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  headIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  headSub: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12 },
  statCardGreen: { backgroundColor: adTokens.successTint },
  statLabel: { fontSize: 11, color: adTokens.textSecondary },
  statValue: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary, marginTop: 2 },
  tabBar: { marginBottom: 12 },
  loader: { marginVertical: 24 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: adTokens.textPrimary },
  list: { maxHeight: 320 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  itemRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  manageQuestionsBtn: { padding: 4, borderRadius: 8, backgroundColor: adTokens.primaryTint },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: adTokens.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  itemLabel: { flex: 1, fontSize: 13, color: adTokens.textPrimary },
  chip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.successLight },
  chipRemove: { backgroundColor: adTokens.dangerLight },
  chipText: { fontSize: 10, fontWeight: '700', color: adTokens.successDark },
  chipTextRemove: { color: adTokens.dangerDark },
  hintText: { fontSize: 11.5, color: adTokens.textSecondary, marginBottom: 8 },
  emptyState: { alignItems: 'center', padding: 24, gap: 6 },
  emptyTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  emptyText: { fontSize: 12, color: adTokens.textSecondary, textAlign: 'center' },
  footer: { marginTop: 12, gap: 10 },
  footerCount: { fontSize: 12, color: adTokens.textSecondary },
  footerError: { fontSize: 12, color: adTokens.danger },
  footerButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  assignButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 100, alignItems: 'center' },
  unassignButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.danger, minWidth: 100, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  assignButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },
});
