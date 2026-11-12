import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usePatients } from '../../hooks/usePatients';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const EMPTY_FIELDS = { firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', email: '', dosespotId: '', patientId: '' };

function formatIncomingValue(value) {
  return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}

function getPatientDoseSpotId(raw) {
  return raw?.doseSpotPatientId ?? raw?.DoseSpotPatientId ?? raw?.doseSpotRefrenceId ?? raw?.DoseSpotRefrenceId ?? null;
}

function normalizeSearchResult(row) {
  const firstName = String(row?.FirstName ?? row?.firstName ?? '').trim();
  const lastName = String(row?.LastName ?? row?.lastName ?? '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || row?.FullName || row?.fullName || '—';
  return {
    raw: row,
    fullName,
    dob: row?.DateOfBirth ?? row?.dateOfBirth ?? null,
    phone: row?.PhoneNumber ?? row?.phoneNumber ?? null,
    email: row?.Email ?? row?.email ?? null,
    doseSpotId: getPatientDoseSpotId(row),
    patientId: row?.PatientId ?? row?.patientId ?? row?.Id ?? row?.id ?? null,
  };
}

/**
 * Port of AllyDocReactApp's ChangePatientSearchModal.jsx (shared by RxChange and Refill's "Link
 * Patient" flow, shown when a pharmacy-created request couldn't be auto-matched to a clinic
 * patient - `request.NewPatient === true`): search existing clinic patients by any combination
 * of name/DOB/phone/email/DoseSpot ID/patient ID, pick one, confirm. Simplified from web's
 * multi-select "which fields to search by" picker + comparison table to a flat search form -
 * same `/PatientSearch` query underneath, same confirm-before-linking safety step.
 */
export default function ChangePatientModal({ visible, requestPatient, entityLabel = 'request', onClose, onConfirm }) {
  const bottomSafe = useBottomSafeSpacing();
  const { searchPatients } = usePatients();
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const setField = (key) => (value) => setFields((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setFields(EMPTY_FIELDS);
    setResults([]);
    setHasSearched(false);
    setSelected(null);
    setConfirmOpen(false);
  };

  const handleClose = () => {
    if (linking) return;
    reset();
    onClose();
  };

  const runSearch = async () => {
    const hasAnyValue = Object.values(fields).some((v) => String(v).trim());
    if (!hasAnyValue) {
      toast.error('Enter at least one search value.');
      return;
    }
    setSearching(true);
    setSelected(null);
    const res = await searchPatients(fields);
    const list = Array.isArray(res.data) ? res.data : res.data?.Items || res.data?.items || [];
    setResults(res.success ? list.map(normalizeSearchResult) : []);
    setHasSearched(true);
    setSearching(false);
    if (!res.success) toast.error(res.message || 'Unable to search patients.');
  };

  const handleConfirm = async () => {
    if (!selected || linking) return;
    if (!selected.doseSpotId) {
      toast.error('Selected patient does not have a DoseSpot patient ID.');
      return;
    }
    setLinking(true);
    const result = await onConfirm(selected);
    setLinking(false);
    if (result?.success) {
      toast.success(result.message || 'Patient linked successfully.');
      reset();
      onClose();
    } else {
      toast.error(result?.message || 'Failed to link patient.');
      setConfirmOpen(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Link Patient</Text>
            <Pressable onPress={handleClose} disabled={linking} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.noteText}>
              This links only the current {entityLabel} to the patient you select - no records are merged, and this cannot
              be automatically reversed.
            </Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Incoming {entityLabel} patient</Text>
              <Text style={styles.infoValue}>
                Name: {formatIncomingValue([requestPatient?.FirstName, requestPatient?.LastName].filter(Boolean).join(' '))}
              </Text>
              <Text style={styles.infoValue}>DOB: {formatIncomingValue(requestPatient?.DateOfBirth)}</Text>
              <Text style={styles.infoValue}>Phone: {formatIncomingValue(requestPatient?.PhoneNumber)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Search clinic patients</Text>
            <View style={styles.fieldRow}>
              <TextInput style={[styles.input, styles.flex1]} placeholder="First name" value={fields.firstName} onChangeText={setField('firstName')} placeholderTextColor={adTokens.textMuted} />
              <TextInput style={[styles.input, styles.flex1]} placeholder="Last name" value={fields.lastName} onChangeText={setField('lastName')} placeholderTextColor={adTokens.textMuted} />
            </View>
            <View style={styles.fieldRow}>
              <TextInput style={[styles.input, styles.flex1]} placeholder="Date of birth (YYYY-MM-DD)" value={fields.dateOfBirth} onChangeText={setField('dateOfBirth')} placeholderTextColor={adTokens.textMuted} />
              <TextInput style={[styles.input, styles.flex1]} placeholder="Phone" value={fields.phoneNumber} onChangeText={setField('phoneNumber')} keyboardType="phone-pad" placeholderTextColor={adTokens.textMuted} />
            </View>
            <View style={styles.fieldRow}>
              <TextInput style={[styles.input, styles.flex1]} placeholder="Email" value={fields.email} onChangeText={setField('email')} keyboardType="email-address" placeholderTextColor={adTokens.textMuted} />
              <TextInput style={[styles.input, styles.flex1]} placeholder="DoseSpot ID" value={fields.dosespotId} onChangeText={setField('dosespotId')} placeholderTextColor={adTokens.textMuted} />
            </View>
            <TextInput style={styles.input} placeholder="Patient ID" value={fields.patientId} onChangeText={setField('patientId')} placeholderTextColor={adTokens.textMuted} />

            <Pressable style={styles.searchButton} onPress={runSearch} disabled={searching}>
              {searching ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.searchButtonText}>Search</Text>}
            </Pressable>

            {hasSearched && !searching ? (
              results.length === 0 ? (
                <Text style={styles.emptyText}>No matching patients found.</Text>
              ) : (
                <View style={styles.resultsWrap}>
                  {results.map((patient, index) => {
                    const isSelected = selected?.patientId === patient.patientId && selected?.doseSpotId === patient.doseSpotId;
                    return (
                      <Pressable
                        key={`${patient.patientId ?? patient.doseSpotId ?? index}`}
                        style={[styles.resultCard, isSelected && styles.resultCardSelected]}
                        onPress={() => setSelected(patient)}
                      >
                        <Text style={styles.resultName}>{patient.fullName}</Text>
                        <Text style={styles.resultMeta}>
                          DOB: {formatIncomingValue(patient.dob)} · DoseSpot ID: {formatIncomingValue(patient.doseSpotId)}
                        </Text>
                        {patient.phone || patient.email ? (
                          <Text style={styles.resultMeta}>
                            {[patient.phone, patient.email].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleClose} disabled={linking}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.linkButton, !selected && styles.linkButtonDisabled]}
              onPress={() => setConfirmOpen(true)}
              disabled={!selected || linking}
            >
              <Text style={styles.linkButtonText}>Link Patient</Text>
            </Pressable>
          </View>

          {confirmOpen ? (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>Confirm link</Text>
                <Text style={styles.confirmText}>
                  Link this {entityLabel} to <Text style={styles.confirmBold}>{selected?.fullName}</Text>
                  {selected?.doseSpotId ? <> (DoseSpot ID: {selected.doseSpotId})</> : null}? Only this {entityLabel} will
                  be reassigned.
                </Text>
                <View style={styles.confirmFooter}>
                  <Pressable style={styles.cancelButton} onPress={() => setConfirmOpen(false)} disabled={linking}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.linkButton} onPress={handleConfirm} disabled={linking}>
                    {linking ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.linkButtonText}>Confirm</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%', padding: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { paddingBottom: 10 },
  flex1: { flex: 1 },

  noteText: { fontSize: 12, color: adTokens.textSecondary, lineHeight: 17, marginBottom: 12 },

  infoCard: { backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12, marginBottom: 14, gap: 2 },
  infoLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 13, color: adTokens.textPrimary },

  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, marginBottom: 8 },
  searchButton: { backgroundColor: adTokens.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginBottom: 6 },
  searchButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },

  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 16 },
  resultsWrap: { gap: 8, marginTop: 8 },
  resultCard: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, backgroundColor: adTokens.white },
  resultCardSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  resultName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  resultMeta: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  linkButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  linkButtonDisabled: { opacity: 0.5 },
  linkButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },

  confirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { backgroundColor: adTokens.white, borderRadius: 14, padding: 18, width: '100%' },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  confirmText: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  confirmBold: { fontWeight: '700', color: adTokens.textPrimary },
  confirmFooter: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
