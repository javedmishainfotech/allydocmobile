import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  searchMedications,
  selectMedication,
  addCodedSelfReportedMedication,
  addFreetextSelfReportedMedication,
  addSimpleSelfReportedMedication,
  editCodedSelfReportedMedication,
  editFreetextSelfReportedMedication,
  editSimpleSelfReportedMedication,
} from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const EMPTY_FORM = {
  directions: '',
  quantity: '',
  dispenseUnitId: '1',
  refills: '0',
  daysSupply: '',
  writtenDate: '',
  comment: '',
};

/**
 * Port of AllyDocReactApp's SelfReportedMedicationModal.jsx. Add flow:
 * search a medication name -> SelectMedicationAction resolves its
 * dispensableDrugId/Strength -> if Strength is present it's a "coded" entry
 * (DispensableDrugId), else "simple" (RoutedDoseFormDrugId); if the search
 * returns nothing, "Add as custom medication" takes the freetext path
 * instead. Edit reuses whichever variant the record already is.
 *
 * Note: DoseSpot's real dispense-unit picker (a dropdown of unit types) is
 * simplified here to a plain numeric id field - the exact unit list wasn't
 * in scope for this pass; the API call shape is otherwise an exact port.
 */
export default function SelfReportedMedicationModal({ visible, doseSpotPatientId, editing, onClose, onSaved }) {
  const bottomSafe = useBottomSafeSpacing();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null); // { displayName, dispensableDrugId?, routedDoseFormDrugId?, isCustom }
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearchText('');
    setSearchResults([]);
    setHasSearched(false);
    if (editing) {
      setSelectedDrug({
        displayName: editing.DisplayName,
        dispensableDrugId: editing.DispensableDrugID,
        routedDoseFormDrugId: editing.RoutedDoseFormDrugID,
        isCustom: editing.DispensableDrugID == null && editing.RoutedDoseFormDrugID == null,
      });
      setForm({
        directions: editing.Directions || '',
        quantity: String(editing.Quantity ?? ''),
        dispenseUnitId: String(editing.DispenseUnitTypeId ?? '1'),
        refills: String(editing.Refills ?? '0'),
        daysSupply: String(editing.DaysSupply ?? ''),
        writtenDate: editing.DatePrescribed?.slice?.(0, 10) || '',
        comment: editing.Comment || '',
      });
    } else {
      setSelectedDrug(null);
      setForm(EMPTY_FORM);
    }
  }, [visible, editing]);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    const response = await searchMedications(searchText.trim());
    setIsSearching(false);
    setHasSearched(true);
    const items = response.data?.Items;
    setSearchResults(response.success && Array.isArray(items) ? items : []);
  };

  const handlePickResult = async (item) => {
    const dispensableDrugId = item.DispensableDrugId ?? item.dispensableDrugId;
    const response = await selectMedication(dispensableDrugId);
    const details = response.success ? response.data : null;
    const hasStrength = Boolean(details?.Strength);
    setSelectedDrug({
      displayName: item.DisplayName || item.Name,
      dispensableDrugId: hasStrength ? dispensableDrugId : undefined,
      routedDoseFormDrugId: hasStrength ? undefined : (item.RoutedDoseFormDrugId ?? dispensableDrugId),
      isCustom: false,
    });
  };

  const handleUseCustom = () => {
    setSelectedDrug({ displayName: searchText.trim(), isCustom: true });
  };

  const handleSave = async () => {
    if (!selectedDrug) {
      toast.error('Select a medication first.');
      return;
    }
    if (!form.directions.trim() || !form.quantity || !form.daysSupply) {
      toast.error('Directions, quantity, and days supply are required.');
      return;
    }
    setIsSaving(true);
    let response;
    const baseFields = {
      Refills: form.refills,
      DaysSupply: form.daysSupply,
      DispenseUnitId: form.dispenseUnitId,
      Quantity: form.quantity,
      Directions: form.directions,
      WrittenDate: form.writtenDate,
      Status: '1',
    };

    if (selectedDrug.isCustom) {
      const freetextFields = {
        displayName: selectedDrug.displayName,
        refills: form.refills,
        daysSupply: form.daysSupply,
        dispenseUnitId: form.dispenseUnitId,
        quantity: form.quantity,
        directions: form.directions,
        writtenDate: form.writtenDate,
        status: '1',
        comment: form.comment,
      };
      response = editing
        ? await editFreetextSelfReportedMedication(doseSpotPatientId, editing.SelfReportedMedicationId, freetextFields)
        : await addFreetextSelfReportedMedication(doseSpotPatientId, freetextFields);
    } else if (selectedDrug.dispensableDrugId) {
      const codedFields = { DispensableDrugId: selectedDrug.dispensableDrugId, ...baseFields };
      response = editing
        ? await editCodedSelfReportedMedication(doseSpotPatientId, editing.SelfReportedMedicationId, codedFields)
        : await addCodedSelfReportedMedication(doseSpotPatientId, codedFields);
    } else {
      const simpleFields = {
        RoutedDoseFormDrugId: selectedDrug.routedDoseFormDrugId,
        ...baseFields,
        Comment: form.comment,
        Encounter: '',
        InactiveDate: '',
      };
      response = editing
        ? await editSimpleSelfReportedMedication(doseSpotPatientId, editing.SelfReportedMedicationId, simpleFields)
        : await addSimpleSelfReportedMedication(doseSpotPatientId, simpleFields);
    }

    setIsSaving(false);
    if (response.success) {
      toast.success(response.message || 'Medication saved.');
      onSaved?.();
    } else {
      toast.error(response.message || 'Unable to save medication.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Toast />
          <Text style={styles.title}>{editing ? 'Edit' : 'Add'} Self Reported Medication</Text>
          <ScrollView contentContainerStyle={styles.body}>
            {!selectedDrug ? (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search medication name"
                    placeholderTextColor={adTokens.textMuted}
                    onSubmitEditing={handleSearch}
                  />
                  <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
                    {isSearching ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.searchButtonText}>Search</Text>}
                  </Pressable>
                </View>
                {hasSearched && searchResults.length === 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.mutedText}>No matches found.</Text>
                    <Pressable style={styles.customButton} onPress={handleUseCustom}>
                      <Text style={styles.customButtonText}>Add as custom medication</Text>
                    </Pressable>
                  </View>
                ) : null}
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, index) => String(item.DispensableDrugId ?? index)}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable style={styles.resultRow} onPress={() => handlePickResult(item)}>
                      <Text style={styles.resultText}>{item.DisplayName || item.Name}</Text>
                    </Pressable>
                  )}
                />
              </>
            ) : (
              <>
                <View style={styles.selectedDrugRow}>
                  <Text style={styles.selectedDrugText}>{selectedDrug.displayName}</Text>
                  <Pressable onPress={() => setSelectedDrug(null)}>
                    <Text style={styles.changeLink}>Change</Text>
                  </Pressable>
                </View>

                <FormField label="Directions" value={form.directions} onChangeText={(v) => setForm((f) => ({ ...f, directions: v }))} />
                <FormField label="Quantity" value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} keyboardType="numeric" />
                <FormField label="Refills" value={form.refills} onChangeText={(v) => setForm((f) => ({ ...f, refills: v }))} keyboardType="numeric" />
                <FormField label="Days Supply" value={form.daysSupply} onChangeText={(v) => setForm((f) => ({ ...f, daysSupply: v }))} keyboardType="numeric" />
                <FormField label="Written Date (YYYY-MM-DD)" value={form.writtenDate} onChangeText={(v) => setForm((f) => ({ ...f, writtenDate: v }))} />
                <FormField label="Comment (optional)" value={form.comment} onChangeText={(v) => setForm((f) => ({ ...f, comment: v }))} />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSaving}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            {selectedDrug ? (
              <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FormField({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={adTokens.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  body: { paddingBottom: 10 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },
  searchButton: { backgroundColor: adTokens.primary, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 12.5 },
  noResults: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  mutedText: { fontSize: 12.5, color: adTokens.textSecondary },
  customButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: adTokens.primaryTint },
  customButtonText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },
  resultRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: adTokens.gray100 },
  resultText: { fontSize: 13, color: adTokens.textPrimary },

  selectedDrugRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: adTokens.primaryTint, borderRadius: 10, padding: 10, marginBottom: 14 },
  selectedDrugText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: adTokens.primaryDark },
  changeLink: { fontSize: 12, fontWeight: '600', color: adTokens.primaryDark },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },

  footer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  closeButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeButtonText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});
