import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { searchPatients, mergePatients } from '../../services/settingsService';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

function getValue(row, keys, fallback = 'N/A') {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

const getPatientId = (row) => String(getValue(row, ['PatientId', 'patientId', 'id', 'Id'], ''));

function getPatientName(row) {
  const first = String(getValue(row, ['FirstName', 'firstName', 'firstname'], '')).trim();
  const last = String(getValue(row, ['LastName', 'lastName', 'lastname'], '')).trim();
  const fullName = `${first} ${last}`.trim();
  return fullName || getValue(row, ['PatientName', 'patientName', 'name']);
}

function formatDob(row) {
  const dobValue = getValue(row, ['DateOfBirth', 'dateOfBirth', 'Dob', 'dob'], '');
  if (!dobValue || dobValue === 'N/A') return 'N/A';
  const date = new Date(dobValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function getActiveStatus(row) {
  const v = row?.Active ?? row?.active;
  return v === true || v === 'true' || v === 1;
}

const STATUS_OPTIONS = [
  { value: '0', label: 'Inactive Only' },
  { value: '1', label: 'Active Only' },
  { value: '2', label: 'Both' },
];

/** Port of AllyDocReactApp/.../Settings/MergePatientTab.jsx: search patients, then merge
 * a duplicate record's medications into another patient via /api/Patients/MergePatients. */
export default function MergePatientTab() {
  const [filters, setFilters] = useState({ firstname: '', lastname: '', status: '2' });
  const [patients, setPatients] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mergeRow, setMergeRow] = useState(null);
  const [toPatientId, setToPatientId] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);

  const runSearch = async () => {
    setSearchLoading(true);
    setSearched(true);
    const res = await searchPatients({
      firstname: filters.firstname.trim() || undefined,
      lastname: filters.lastname.trim() || undefined,
      status: filters.status === '' ? undefined : Number(filters.status),
    });
    const data = res.data;
    const result =
      (Array.isArray(data?.Items) && data.Items) ||
      (Array.isArray(data?.patients) && data.patients) ||
      (Array.isArray(data?.result) && data.result) ||
      (Array.isArray(data) && data) ||
      [];
    setPatients(res.success ? result : []);
    setSearchLoading(false);
  };

  const openMergeModal = (row) => {
    setMergeRow(row);
    setToPatientId('');
  };

  const submitMerge = async () => {
    if (!toPatientId.trim()) {
      toast.error('Enter the patient id to merge into.');
      return;
    }
    setMergeLoading(true);
    const res = await mergePatients({ fromPatientId: Number(getPatientId(mergeRow)), toPatientId: Number(toPatientId) });
    setMergeLoading(false);
    setMergeRow(null);
    if (res.success) {
      toast.success(res.message || 'Patients merged successfully.');
    } else {
      toast.error(res.message || 'Failed to merge patients. Please try again.');
    }
    runSearch();
  };

  return (
    <View>
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Search Patients</Text>
        <View style={styles.filterRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter first name"
              value={filters.firstname}
              onChangeText={(v) => setFilters((p) => ({ ...p, firstname: v }))}
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter last name"
              value={filters.lastname}
              onChangeText={(v) => setFilters((p) => ({ ...p, lastname: v }))}
            />
          </View>
        </View>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.statusChip, filters.status === opt.value && styles.statusChipActive]}
              onPress={() => setFilters((p) => ({ ...p, status: opt.value }))}
            >
              <Text style={[styles.statusChipText, filters.status === opt.value && styles.statusChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.searchButton} onPress={runSearch} disabled={searchLoading}>
          {searchLoading ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.searchButtonText}>Search</Text>}
        </Pressable>
      </View>

      {searchLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : !searched ? null : patients.length === 0 ? (
        <Text style={styles.emptyText}>No patients found. Use search filters and tap Search.</Text>
      ) : (
        <View style={styles.resultsList}>
          {patients.map((row, index) => (
            <View key={`${getPatientId(row)}-${index}`} style={styles.resultRow}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{getPatientName(row)}</Text>
                <View style={[styles.statusBadge, getActiveStatus(row) ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                  <Text style={styles.statusBadgeText}>{getActiveStatus(row) ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <Text style={styles.resultMeta}>ID: {getPatientId(row)} · DOB: {formatDob(row)} · {getValue(row, ['Gender', 'gender'])}</Text>
              <Pressable style={styles.mergeButton} onPress={() => openMergeModal(row)}>
                <Text style={styles.mergeButtonText}>Merge Patient</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Modal visible={mergeRow != null} transparent animationType="fade" onRequestClose={() => !mergeLoading && setMergeRow(null)}>
        <Toast />
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Merge Patient</Text>
              <Pressable onPress={() => !mergeLoading && setMergeRow(null)} hitSlop={8}>
                <Feather name="x" size={18} color={adTokens.textSecondary} />
              </Pressable>
            </View>
            <ScrollView>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  You are about to merge two patient records. All medications from the source patient will be
                  transferred to the selected patient. This action cannot be undone easily.
                </Text>
              </View>
              <Text style={styles.label}>From Patient ID</Text>
              <TextInput style={[styles.input, styles.disabledInput]} value={mergeRow ? getPatientId(mergeRow) : ''} editable={false} />
              <Text style={styles.helpText}>The PatientID whose records will be merged.</Text>
              <Text style={styles.label}>To Patient ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter to patient id"
                keyboardType="numeric"
                value={toPatientId}
                onChangeText={setToPatientId}
              />
              <Text style={styles.helpText}>The PatientID the records will be merged to.</Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setMergeRow(null)} disabled={mergeLoading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.mergeConfirmButton, mergeLoading && styles.disabledButton]} onPress={submitMerge} disabled={mergeLoading}>
                {mergeLoading ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.mergeConfirmButtonText}>Merge</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  filterCard: { backgroundColor: adTokens.gray50, borderRadius: 12, padding: 14, marginBottom: 16, gap: 8 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginTop: 6, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: adTokens.textPrimary, backgroundColor: adTokens.white },
  disabledInput: { backgroundColor: adTokens.gray100, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  statusChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  statusChipText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  statusChipTextActive: { color: adTokens.white },
  searchButton: { marginTop: 10, backgroundColor: adTokens.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  searchButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
  loader: { marginVertical: 24 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 20 },
  resultsList: { gap: 10 },
  resultRow: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, gap: 6 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  resultMeta: { fontSize: 11.5, color: adTokens.textSecondary },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  statusBadgeActive: { backgroundColor: adTokens.successLight },
  statusBadgeInactive: { backgroundColor: adTokens.dangerLight },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: adTokens.textPrimary },
  mergeButton: { alignSelf: 'flex-start', backgroundColor: adTokens.primary, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14, marginTop: 4 },
  mergeButtonText: { fontSize: 12, fontWeight: '700', color: adTokens.white },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxHeight: '85%', backgroundColor: adTokens.white, borderRadius: 14, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  warningBox: { backgroundColor: adTokens.warningLight, borderRadius: 10, padding: 12, marginBottom: 10 },
  warningText: { fontSize: 12, color: adTokens.warningDark, lineHeight: 17 },
  helpText: { fontSize: 11, color: adTokens.textMuted, marginTop: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  mergeConfirmButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 80, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  mergeConfirmButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },
});
