import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import OptionPicker from '../prescriptions/OptionPicker';
import SubstitutionConfirmationModal from '../prescriptions/SubstitutionConfirmationModal';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Port of AllyDocReactApp's Favorites "Add/Edit Supply" form: search supplies, or fall back
 * to a custom freetext entry when nothing matches.
 *
 * Wrapped in its own `SafeAreaProvider` - see MedicationFavoriteModal.jsx for why: RN's `Modal`
 * on iOS needs a nested provider for `useSafeAreaInsets()` to read real (non-zero) insets. */
export default function SupplyFavoriteModal(props) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <SupplyFavoriteForm {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function SupplyFavoriteForm({ visible, scope, scopeId, favorite, onClose, onSaved }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const { searchSupplies, createSupplyFavorite, updateSupplyFavorite } = usePrescriptions();
  const isEdit = Boolean(favorite);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [displayName, setDisplayName] = useState('');
  const [noSubstitutions, setNoSubstitutions] = useState(false);
  const [patientDirections, setPatientDirections] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispenseUnit, setDispenseUnit] = useState('Each');
  const [daySupply, setDaySupply] = useState('');
  const [refills, setRefills] = useState('0');
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [substitutionConfirmOpen, setSubstitutionConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSupply(null);
    setIsCustom(false);
    setPage(1);
    setTotalPages(1);
    if (isEdit) {
      setDisplayName(favorite.Title || favorite.Name || '');
      setNoSubstitutions(Boolean(favorite.NoSubstitutions));
      setPatientDirections(favorite.Directions || favorite.directions || '');
      setQuantity(String(favorite.Quantity ?? ''));
      setDispenseUnit(DISPENSE_UNIT_OPTIONS.find((o) => o.id === favorite.DispenseUnitId)?.name || 'Each');
      setDaySupply(String(favorite.DaysSupply ?? ''));
      setRefills(String(favorite.Refills ?? '0'));
      setPharmacyNotes(favorite.Notes || favorite.notes || '');
    } else {
      setDisplayName('');
      setNoSubstitutions(false);
      setPatientDirections('');
      setQuantity('');
      setDispenseUnit('Each');
      setDaySupply('');
      setRefills('0');
      setPharmacyNotes('');
    }
  }, [visible, isEdit, favorite]);

  const runSearch = async (text, targetPage = 1) => {
    setSearchQuery(text);
    if (text.trim().length < 3) {
      setSearchResults([]);
      setTotalPages(1);
      return;
    }
    setSearching(true);
    const res = await searchSupplies(text.trim(), targetPage);
    const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
    setSearchResults(res.success ? list : []);
    setPage(targetPage);
    setTotalPages(res.data?.PageResult?.TotalPages || 1);
    setSearching(false);
  };

  const goToPage = (targetPage) => runSearch(searchQuery, targetPage);

  const pickSupply = (item) => {
    setSelectedSupply(item);
    setIsCustom(false);
    setDisplayName(item.Name || item.DisplayName || searchQuery);
    setSearchResults([]);
    setPage(1);
    setTotalPages(1);
  };

  const useAsCustom = () => {
    setSelectedSupply(null);
    setIsCustom(true);
    setDisplayName(searchQuery);
    setSearchResults([]);
    setPage(1);
    setTotalPages(1);
  };

  const canSubmit = displayName.trim() && patientDirections.trim() && quantity.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      refills: Number(refills) || 0,
      daysSupply: Number(daySupply) || 0,
      quantity: Number(quantity) || 0,
      dispenseUnitTypeId: DISPENSE_UNIT_ID_BY_NAME[dispenseUnit] || 32,
      noSubstitutions,
      notes: pharmacyNotes,
      directions: patientDirections.trim(),
      title: displayName.trim(),
      firstPrescriptionDiagnosisPrimaryDiagnosisId: 0,
      firstPrescriptionDiagnosisSecondaryDiagnosisId: 0,
      secondPrescriptionDiagnosisPrimaryDiagnosisId: 0,
      secondPrescriptionDiagnosisSecondaryDiagnosisId: 0,
      ...(isCustom
        ? { freetext: displayName.trim() }
        : { supplyId: selectedSupply?.SupplyId ?? selectedSupply?.Id ?? favorite?.SupplyId }),
    };
    const res = isEdit
      ? await updateSupplyFavorite(scope, scopeId, favorite.Id ?? favorite.id, payload)
      : await createSupplyFavorite(scope, scopeId, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message || 'Favorite saved.');
      onSaved();
    } else {
      toast.error(res.message || 'Unable to save favorite.');
    }
  };

  return (
    <>
      <Toast />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{isEdit ? 'Edit' : 'Add'} Supply Favorite</Text>
        <Pressable onPress={onClose} disabled={submitting} hitSlop={8}>
          <Feather name="x" size={20} color={adTokens.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {!isEdit ? (
          <Field label="Search supply">
            <TextInput
              style={styles.input}
              placeholder="Type at least 3 characters..."
              value={searchQuery}
              onChangeText={runSearch}
            />
            {searching ? <ActivityIndicator style={styles.loader} /> : null}
            {searchResults.map((item, index) => (
              <Pressable key={item.SupplyId ?? item.Id ?? index} style={styles.resultRow} onPress={() => pickSupply(item)}>
                <Text style={styles.resultText}>{item.Name || item.DisplayName}</Text>
              </Pressable>
            ))}
            {totalPages > 1 && searchResults.length > 0 ? (
              <View style={styles.pager}>
                <Pressable
                  style={[styles.pagerButton, page <= 1 && styles.pagerButtonDisabled]}
                  disabled={page <= 1 || searching}
                  onPress={() => goToPage(page - 1)}
                >
                  <Feather name="chevron-left" size={14} color={page <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
                  <Text style={[styles.pagerText, page <= 1 && styles.pagerTextDisabled]}>Prev</Text>
                </Pressable>
                <Text style={styles.pagerInfo}>
                  Page {page} of {totalPages}
                </Text>
                <Pressable
                  style={[styles.pagerButton, page >= totalPages && styles.pagerButtonDisabled]}
                  disabled={page >= totalPages || searching}
                  onPress={() => goToPage(page + 1)}
                >
                  <Text style={[styles.pagerText, page >= totalPages && styles.pagerTextDisabled]}>Next</Text>
                  <Feather name="chevron-right" size={14} color={page >= totalPages ? adTokens.textMuted : adTokens.primaryDark} />
                </Pressable>
              </View>
            ) : null}
            {searchQuery.trim().length >= 3 && !searching && searchResults.length === 0 ? (
              <Pressable style={styles.customButton} onPress={useAsCustom}>
                <Text style={styles.customButtonText}>Add &quot;{searchQuery.trim()}&quot; as custom supply</Text>
              </Pressable>
            ) : null}
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
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={3} value={patientDirections} onChangeText={setPatientDirections} />
        </Field>

        <Field label="Quantity" required>
          <TextInput style={styles.input} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        </Field>

        <OptionPicker label="Dispense Unit" value={dispenseUnit} options={DISPENSE_UNIT_NAME_LIST} onChange={setDispenseUnit} required />

        <Field label="Day Supply" required>
          <TextInput style={styles.input} keyboardType="numeric" value={daySupply} onChangeText={setDaySupply} />
        </Field>

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
    </>
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
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  pagerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: adTokens.primaryTint },
  pagerButtonDisabled: { backgroundColor: adTokens.gray100 },
  pagerText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  pagerTextDisabled: { color: adTokens.textMuted },
  pagerInfo: { fontSize: 12, color: adTokens.textSecondary, fontWeight: '600' },
  customButton: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: adTokens.primaryTint, borderRadius: 8, marginTop: 6 },
  customButtonText: { fontSize: 12.5, fontWeight: '600', color: adTokens.primaryDark },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 90, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
