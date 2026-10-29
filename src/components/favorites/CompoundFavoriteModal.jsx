import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { searchMedications } from '../../services/doseSpotClinicalService';
import { createCompoundFavorite, updateCompoundFavorite } from '../../services/prescriptionService';
import OptionPicker from '../prescriptions/OptionPicker';
import SubstitutionConfirmationModal from '../prescriptions/SubstitutionConfirmationModal';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

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

function emptyIngredient() {
  return {
    key: Math.random().toString(36).slice(2),
    query: '',
    results: [],
    searching: false,
    dispensableDrugId: null,
    freeText: '',
    isCustom: false,
    isFreeTextEPCS: false,
    name: '',
    quantity: '',
    dispenseUnit: 'Each',
  };
}

/**
 * Port of AllyDocReactApp's Favorites "Add/Edit Compound" form (AddItemModal.jsx +
 * CompoundFormSection.jsx) - NOT the same as the deferred live-prescribing CompoundModal
 * (1,164 lines, EPCS-aware per-ingredient dosage forms); this is the smaller favorites-only
 * version: each ingredient has its own inline medication search (min 3 chars) with a custom
 * freetext fallback, no shared EPCS workflow.
 */
export default function CompoundFavoriteModal({ visible, scope, scopeId, favorite, onClose, onSaved }) {
  const isEdit = Boolean(favorite);

  const [displayName, setDisplayName] = useState('');
  const [compoundName, setCompoundName] = useState('');
  const [noSubstitutions, setNoSubstitutions] = useState(false);
  const [ingredients, setIngredients] = useState([emptyIngredient()]);
  const [patientDirections, setPatientDirections] = useState('');
  const [totalDispense, setTotalDispense] = useState('');
  const [totalDispenseForm, setTotalDispenseForm] = useState('Each');
  const [refills, setRefills] = useState('0');
  const [daySupply, setDaySupply] = useState('');
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [substitutionConfirmOpen, setSubstitutionConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isEdit) {
      setDisplayName(favorite.Title || '');
      setCompoundName(favorite.CompoundDescription || favorite.compoundDescription || '');
      setNoSubstitutions(Boolean(favorite.NoSubstitutions));
      const existingIngredients = Array.isArray(favorite.CompoundIngredients)
        ? favorite.CompoundIngredients.map((ing) => ({
            ...emptyIngredient(),
            name: ing.FreeText || ing.DrugName || '',
            isCustom: Boolean(ing.FreeText),
            dispensableDrugId: ing.DispensableDrugId ?? null,
            freeText: ing.FreeText || '',
            quantity: String(ing.Quantity ?? ''),
            dispenseUnit: DISPENSE_UNIT_OPTIONS.find((o) => o.id === ing.DispenseUnitId)?.name || 'Each',
          }))
        : [emptyIngredient()];
      setIngredients(existingIngredients.length ? existingIngredients : [emptyIngredient()]);
      setPatientDirections(favorite.Directions || '');
      setTotalDispense(String(favorite.Quantity ?? ''));
      setTotalDispenseForm(DISPENSE_UNIT_OPTIONS.find((o) => o.id === favorite.DispenseUnitId)?.name || 'Each');
      setRefills(String(favorite.Refills ?? '0'));
      setDaySupply(String(favorite.DaysSupply ?? ''));
      setPharmacyNotes(favorite.Notes || '');
    } else {
      setDisplayName('');
      setCompoundName('');
      setNoSubstitutions(false);
      setIngredients([emptyIngredient()]);
      setPatientDirections('');
      setTotalDispense('');
      setTotalDispenseForm('Each');
      setRefills('0');
      setDaySupply('');
      setPharmacyNotes('');
    }
  }, [visible, isEdit, favorite]);

  const updateIngredient = (key, patch) => {
    setIngredients((prev) => prev.map((ing) => (ing.key === key ? { ...ing, ...patch } : ing)));
  };

  const searchIngredient = async (key, text) => {
    updateIngredient(key, { query: text, isCustom: false });
    if (text.trim().length < 3) {
      updateIngredient(key, { results: [] });
      return;
    }
    updateIngredient(key, { searching: true });
    const res = await searchMedications(text.trim(), 1);
    const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
    updateIngredient(key, { results: res.success ? list : [], searching: false });
  };

  const pickIngredientDrug = (key, item) => {
    updateIngredient(key, {
      name: item.DisplayName || item.Name,
      dispensableDrugId: item.DispensableDrugId ?? item.dispensableDrugId,
      isCustom: false,
      results: [],
      query: '',
    });
  };

  const useIngredientAsCustom = (key, text) => {
    updateIngredient(key, { name: text, isCustom: true, freeText: text, dispensableDrugId: null, results: [], query: '' });
  };

  const addIngredient = () => setIngredients((prev) => [...prev, emptyIngredient()]);
  const removeIngredient = (key) => setIngredients((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));

  const ingredientsValid = ingredients.every((ing) => ing.name.trim() && ing.quantity.trim());
  const canSubmit =
    displayName.trim() &&
    compoundName.trim() &&
    patientDirections.trim() &&
    totalDispense.trim() &&
    daySupply.trim() &&
    ingredientsValid &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      compoundDescription: compoundName.trim(),
      title: displayName.trim(),
      compoundIngredients: ingredients.map((ing) =>
        ing.isCustom
          ? { quantity: Number(ing.quantity) || 0, dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[ing.dispenseUnit] || 32, freeText: ing.name.trim(), isFreeTextEPCS: false }
          : { quantity: Number(ing.quantity) || 0, dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[ing.dispenseUnit] || 32, dispensableDrugId: ing.dispensableDrugId },
      ),
      notes: pharmacyNotes,
      directions: patientDirections.trim(),
      refills: Number(refills) || 0,
      daysSupply: Number(daySupply) || 0,
      quantity: Number(totalDispense) || 0,
      dispenseUnitTypeId: DISPENSE_UNIT_ID_BY_NAME[totalDispenseForm] || 32,
      noSubstitutions,
      firstPrescriptionDiagnosis1: 0,
      firstPrescriptionDiagnosis2: 0,
      firstPrescriptionDiagnosis3: 0,
      firstPrescriptionDiagnosis4: 0,
    };
    const res = isEdit
      ? await updateCompoundFavorite(scope, scopeId, favorite.Id ?? favorite.id, payload)
      : await createCompoundFavorite(scope, scopeId, payload);
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
      <View style={styles.header}>
        <Text style={styles.title}>{isEdit ? 'Edit' : 'Add'} Compound Favorite</Text>
        <Pressable onPress={onClose} disabled={submitting} hitSlop={8}>
          <Feather name="x" size={20} color={adTokens.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Field label="Display Name" required>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
        </Field>
        <Field label="Compound Name" required>
          <TextInput style={styles.input} value={compoundName} onChangeText={setCompoundName} />
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

        <Text style={styles.sectionLabel}>Ingredients</Text>
        {ingredients.map((ing, index) => (
          <View key={ing.key} style={styles.ingredientCard}>
            <View style={styles.ingredientHeaderRow}>
              <Text style={styles.ingredientIndex}>Ingredient {index + 1}</Text>
              {ingredients.length > 1 ? (
                <Pressable onPress={() => removeIngredient(ing.key)} hitSlop={6}>
                  <Feather name="trash-2" size={15} color={adTokens.danger} />
                </Pressable>
              ) : null}
            </View>

            {!ing.name ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search ingredient (min 3 chars)..."
                  value={ing.query}
                  onChangeText={(text) => searchIngredient(ing.key, text)}
                />
                {ing.searching ? <ActivityIndicator style={styles.loader} /> : null}
                {ing.results.map((item, i) => (
                  <Pressable key={item.DispensableDrugId ?? i} style={styles.resultRow} onPress={() => pickIngredientDrug(ing.key, item)}>
                    <Text style={styles.resultText}>{item.DisplayName || item.Name}</Text>
                  </Pressable>
                ))}
                {ing.query.trim().length >= 3 && !ing.searching && ing.results.length === 0 ? (
                  <Pressable style={styles.customButton} onPress={() => useIngredientAsCustom(ing.key, ing.query.trim())}>
                    <Text style={styles.customButtonText}>Add &quot;{ing.query.trim()}&quot; as custom ingredient</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <View style={styles.selectedIngredientRow}>
                <Text style={styles.selectedIngredientName} numberOfLines={1}>{ing.name}</Text>
                <Pressable onPress={() => updateIngredient(ing.key, { name: '', query: '' })} hitSlop={6}>
                  <Feather name="x-circle" size={16} color={adTokens.textMuted} />
                </Pressable>
              </View>
            )}

            <View style={styles.ingredientFieldsRow}>
              <View style={styles.flex1}>
                <Text style={styles.smallLabel}>Quantity *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={ing.quantity} onChangeText={(v) => updateIngredient(ing.key, { quantity: v })} />
              </View>
              <View style={styles.flex1}>
                <OptionPicker label="Dispense Form *" value={ing.dispenseUnit} options={DISPENSE_UNIT_NAME_LIST} onChange={(v) => updateIngredient(ing.key, { dispenseUnit: v })} />
              </View>
            </View>
          </View>
        ))}
        <Pressable style={styles.addIngredientButton} onPress={addIngredient}>
          <Feather name="plus" size={14} color={adTokens.primaryDark} />
          <Text style={styles.addIngredientText}>Add Ingredient</Text>
        </Pressable>

        <Field label="Patient Directions" required>
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={3} value={patientDirections} onChangeText={setPatientDirections} />
        </Field>
        <Field label="Total Dispense" required>
          <TextInput style={styles.input} keyboardType="numeric" value={totalDispense} onChangeText={setTotalDispense} />
        </Field>
        <OptionPicker label="Dispense Form" value={totalDispenseForm} options={DISPENSE_UNIT_NAME_LIST} onChange={setTotalDispenseForm} required />
        <OptionPicker label="Refills" value={refills} options={REFILL_OPTIONS} onChange={setRefills} required />
        <Field label="Day Supply" required>
          <TextInput style={styles.input} keyboardType="numeric" value={daySupply} onChangeText={setDaySupply} />
        </Field>
        <Field label="Pharmacy Notes">
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={2} value={pharmacyNotes} onChangeText={setPharmacyNotes} />
        </Field>
      </ScrollView>
      <View style={styles.footer}>
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
  flex1: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { padding: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary, marginBottom: 6 },
  smallLabel: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 4 },
  required: { color: adTokens.danger },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontSize: 13.5, color: adTokens.textPrimary },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  loader: { marginVertical: 10 },
  resultRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  resultText: { fontSize: 13, color: adTokens.textPrimary },
  customButton: { paddingVertical: 9, paddingHorizontal: 12, backgroundColor: adTokens.primaryTint, borderRadius: 8, marginTop: 6 },
  customButtonText: { fontSize: 12, fontWeight: '600', color: adTokens.primaryDark },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },
  sectionLabel: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  ingredientCard: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 10, gap: 8 },
  ingredientHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredientIndex: { fontSize: 12, fontWeight: '700', color: adTokens.textSecondary },
  selectedIngredientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: adTokens.gray50, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  selectedIngredientName: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  ingredientFieldsRow: { flexDirection: 'row', gap: 10 },
  addIngredientButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 16 },
  addIngredientText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 90, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
