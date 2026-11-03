import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { searchMedications, selectMedication } from '../../services/doseSpotClinicalService';
import { createCodedFavorite, createClinicCodedFavorite, updateCodedFavorite } from '../../services/prescriptionService';
import OptionPicker from '../prescriptions/OptionPicker';
import SubstitutionConfirmationModal from '../prescriptions/SubstitutionConfirmationModal';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISPENSE_UNIT_NAME_LIST = DISPENSE_UNIT_OPTIONS.map((o) => o.name);
const DISPENSE_UNIT_ID_BY_NAME = Object.fromEntries(DISPENSE_UNIT_OPTIONS.map((o) => [o.name, o.id]));
const REFILL_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

function Field({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

/**
 * Port of AllyDocReactApp's Favorites "Add/Edit Medication" form (AddItemModal.jsx +
 * MedicationFormSection.jsx), simplified to its "Custom Format" directions mode (free-text
 * Patient Directions) rather than also porting the SIG-Builder auto-compose dropdowns - both
 * are first-class supported paths on web, Custom Format is just the simpler one to operate.
 */
export default function MedicationFavoriteModal({ visible, scope, scopeId, favorite, onClose, onSaved }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const isEdit = Boolean(favorite);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [noSubstitutions, setNoSubstitutions] = useState(false);
  const [patientDirections, setPatientDirections] = useState('');
  const [totalDispense, setTotalDispense] = useState('');
  const [totalDispenseForm, setTotalDispenseForm] = useState('Each');
  const [refills, setRefills] = useState('0');
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [substitutionConfirmOpen, setSubstitutionConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery('');
    setSearchResults([]);
    setSelectedDrug(null);
    if (isEdit) {
      setDisplayName(favorite.Title || favorite.MedDisplayName || '');
      setNoSubstitutions(Boolean(favorite.NoSubstitutions));
      setPatientDirections(favorite.Directions || favorite.directions || '');
      setTotalDispense(String(favorite.Quantity ?? ''));
      setTotalDispenseForm(DISPENSE_UNIT_OPTIONS.find((o) => o.id === favorite.DispenseUnitId)?.name || 'Each');
      setRefills(String(favorite.Refills ?? '0'));
      setPharmacyNotes(favorite.Notes || favorite.notes || '');
    } else {
      setDisplayName('');
      setNoSubstitutions(false);
      setPatientDirections('');
      setTotalDispense('');
      setTotalDispenseForm('Each');
      setRefills('0');
      setPharmacyNotes('');
    }
  }, [visible, isEdit, favorite]);

  const runSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await searchMedications(text.trim(), 1);
    const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
    setSearchResults(res.success ? list : []);
    setSearching(false);
  };

  const pickDrug = async (item) => {
    const id = item.DispensableDrugId ?? item.dispensableDrugId;
    setSearching(true);
    const res = await selectMedication(id);
    setSearching(false);
    if (res.success) {
      const detail = res.data;
      setSelectedDrug({ ...detail, DispensableDrugId: id });
      setDisplayName(detail.DisplayName || detail.Name || item.DisplayName || '');
      setTotalDispenseForm(DISPENSE_UNIT_OPTIONS.find((o) => o.id === (detail.DispenseUnitId ?? detail.DispenseUnitTypeId))?.name || 'Each');
      setSearchResults([]);
      setSearchQuery('');
    } else {
      toast.error(res.message || 'Unable to load medication details.');
    }
  };

  const canSubmit = displayName.trim() && patientDirections.trim() && totalDispense.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      dispensableDrugId: selectedDrug?.DispensableDrugId ?? favorite?.DispensableDrugId,
      refills: Number(refills) || 0,
      daysSupply: 0,
      quantity: Number(totalDispense) || 0,
      dispenseUnitTypeId: DISPENSE_UNIT_ID_BY_NAME[totalDispenseForm] || 32,
      noSubstitutions,
      notes: pharmacyNotes,
      directions: patientDirections.trim(),
      title: displayName.trim(),
      firstPrescriptionDiagnosis1: 0,
      firstPrescriptionDiagnosis2: 0,
      firstPrescriptionDiagnosis3: 0,
      firstPrescriptionDiagnosis4: 0,
    };
    const res = isEdit
      ? await updateCodedFavorite(scope, scopeId, favorite.Id ?? favorite.id, payload)
      : scope === 'clinic'
        ? await createClinicCodedFavorite(scopeId, payload)
        : await createCodedFavorite(payload);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message || 'Favorite saved.');
      onSaved();
    } else {
      toast.error(res.message || 'Unable to save favorite.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <Toast />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{isEdit ? 'Edit' : 'Add'} Medication Favorite</Text>
        <Pressable onPress={onClose} disabled={submitting} hitSlop={8}>
          <Feather name="x" size={20} color={adTokens.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {!isEdit ? (
          <Field label="Search medication">
            <TextInput
              style={styles.input}
              placeholder="Type at least 3 characters..."
              value={searchQuery}
              onChangeText={runSearch}
            />
            {searching ? <ActivityIndicator style={styles.loader} /> : null}
            {searchResults.map((item, index) => (
              <Pressable key={item.DispensableDrugId ?? index} style={styles.resultRow} onPress={() => pickDrug(item)}>
                <Text style={styles.resultText}>{item.DisplayName || item.Name}</Text>
              </Pressable>
            ))}
          </Field>
        ) : null}

        <Field label="Display Name" required>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
        </Field>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => (noSubstitutions ? setNoSubstitutions(false) : setSubstitutionConfirmOpen(true))}
        >
          <Switch
            value={noSubstitutions}
            onValueChange={(v) => (v ? setSubstitutionConfirmOpen(true) : setNoSubstitutions(false))}
            trackColor={{ true: adTokens.primary }}
          />
          <Text style={styles.checkboxLabel}>No Substitutions</Text>
        </Pressable>

        <SubstitutionConfirmationModal
          visible={substitutionConfirmOpen}
          itemName={displayName}
          onCancel={() => setSubstitutionConfirmOpen(false)}
          onConfirm={() => {
            setNoSubstitutions(true);
            setSubstitutionConfirmOpen(false);
          }}
        />

        <Field label="Patient Directions" required>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={3}
            value={patientDirections}
            onChangeText={setPatientDirections}
          />
        </Field>

        <Field label="Total Dispense" required>
          <TextInput style={styles.input} keyboardType="numeric" value={totalDispense} onChangeText={setTotalDispense} />
        </Field>

        <OptionPicker label="Total Dispense Form" value={totalDispenseForm} options={DISPENSE_UNIT_NAME_LIST} onChange={setTotalDispenseForm} required />
        <OptionPicker label="Refills" value={refills} options={REFILL_OPTIONS} onChange={setRefills} required />

        <Field label="Pharmacy Notes">
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={2} value={pharmacyNotes} onChangeText={setPharmacyNotes} />
        </Field>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
        <Pressable style={styles.cancelButton} onPress={onClose} disabled={submitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, !canSubmit && styles.disabledButton]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { padding: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary, marginBottom: 6 },
  required: { color: adTokens.danger },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13.5, color: adTokens.textPrimary },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  loader: { marginVertical: 10 },
  resultRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  resultText: { fontSize: 13, color: adTokens.textPrimary },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 90, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
