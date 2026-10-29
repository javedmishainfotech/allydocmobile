import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { searchMedications } from '../../services/doseSpotClinicalService';
import { SheetShell, SheetFooter, FormInput, NotesField, formatDateOnly } from './MedicationFormModal';
import OptionPicker from './OptionPicker';
import DatePickerSheet from '../DatePickerSheet';
import SubstitutionConfirmationModal from './SubstitutionConfirmationModal';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import { FIELD_LIMITS } from '../../utils/prescriptionOptions';
import { localDateOnlyToApiString } from '../../utils/dateOnly';
import { adTokens } from '../../theme/colors';

const DISPENSE_UNIT_NAME_LIST = DISPENSE_UNIT_OPTIONS.map((o) => o.name);

function emptyIngredient(overrides = {}) {
  return {
    key: Math.random().toString(36).slice(2),
    query: '',
    results: [],
    searching: false,
    name: '',
    dispensableDrugId: null,
    isCustom: false,
    notControlledSubstance: true,
    totalDispense: '',
    dispenseForm: 'Each',
    ...overrides,
  };
}

export const emptyCompoundForm = (overrides = {}) => ({
  compoundName: '',
  ingredients: [emptyIngredient()],
  noSubstitutions: false,
  urgent: false,
  patientDirections: '',
  totalDispense: '',
  totalDispenseForm: 'Each',
  refills: '0',
  effectiveDate: localDateOnlyToApiString(new Date()),
  daySupply: '',
  pharmacyNotesText: '',
  createAsFavorite: false,
  favoriteName: '',
  ...overrides,
});

export function validateCompoundForm(form) {
  const errors = {};
  if (!form.compoundName.trim()) errors.compoundName = 'Compound name is required';
  if (!form.patientDirections.trim()) errors.patientDirections = 'Please enter directions';
  if (!String(form.totalDispense).trim()) errors.totalDispense = 'Please enter total dispense';
  if (!String(form.refills).trim()) errors.refills = 'Please enter refills';
  if (form.ingredients.some((ing) => !ing.name.trim() || !String(ing.totalDispense).trim())) {
    errors.ingredients = 'Every ingredient needs a name and quantity';
  }
  if (form.createAsFavorite && !form.favoriteName.trim()) errors.favoriteName = 'Favorite name is required';
  return errors;
}

/**
 * Port of AllyDocReactApp's live-prescribing CompoundModal.jsx (distinct from the smaller
 * Compound FAVORITE form already built this session - this one sends an actual prescription
 * to the patient via DoseSpot). Per-ingredient search reuses `searchMedications`; a custom/
 * freetext ingredient shows a "Not a Controlled Substance" checkbox (web default: checked) -
 * web never blocks submission either way, it only flags `isFreeTextEPCS` in the payload, so
 * this is ported the same way (no client-side EPCS gate here, unlike the coded-medication path).
 */
export default function CompoundFormModal({ visible, pharmacyName, form, triedSubmit, isEdit, saving, onChange, onSubmit, onClose }) {
  const [showDate, setShowDate] = useState(false);
  const [substitutionConfirmOpen, setSubstitutionConfirmOpen] = useState(false);
  if (!form) return null;
  const errors = triedSubmit ? validateCompoundForm(form) : {};

  const setIngredients = (next) => onChange('ingredients', next);
  const updateIngredient = (key, patch) =>
    setIngredients(form.ingredients.map((ing) => (ing.key === key ? { ...ing, ...patch } : ing)));

  const searchIngredient = async (key, text) => {
    updateIngredient(key, { query: text });
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
      name: item.NameWithRouteDoseForm || item.DisplayName || item.Name,
      dispensableDrugId: item.DispensableDrugId ?? item.dispensableDrugId,
      isCustom: false,
      results: [],
      query: '',
    });
  };

  const useIngredientAsCustom = (key, text) => {
    updateIngredient(key, { name: text, isCustom: true, notControlledSubstance: true, dispensableDrugId: null, results: [], query: '' });
  };

  const addIngredient = () => setIngredients([...form.ingredients, emptyIngredient()]);
  const removeIngredient = (key) =>
    form.ingredients.length > 1 && setIngredients(form.ingredients.filter((i) => i.key !== key));

  return (
    <SheetShell
      visible={visible}
      icon="flask-outline"
      title={isEdit ? 'Edit Custom Compound' : 'Add Custom Compound'}
      subtitle={pharmacyName ? `Pharmacy: ${pharmacyName}` : undefined}
      onClose={onClose}
      footer={<SheetFooter saving={saving} submitLabel={isEdit ? 'Update Prescription' : 'Create Prescription'} onCancel={onClose} onSubmit={onSubmit} />}
    >
      <FormInput
        label="Compound name"
        required
        value={form.compoundName}
        onChangeText={(t) => onChange('compoundName', t)}
        placeholder="Enter compound name"
        error={errors.compoundName}
      />

      <Text style={styles.sectionLabel}>Ingredients</Text>
      {form.ingredients.map((ing, index) => (
        <View key={ing.key} style={styles.ingredientCard}>
          <View style={styles.ingredientHeaderRow}>
            <Text style={styles.ingredientIndex}>Ingredient {index + 1}</Text>
            {form.ingredients.length > 1 ? (
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
                  <Text style={styles.resultText}>{item.NameWithRouteDoseForm || item.DisplayName || item.Name}</Text>
                  {item.Strength ? <Text style={styles.resultMeta}>{item.Strength}</Text> : null}
                </Pressable>
              ))}
              {ing.query.trim().length >= 3 && !ing.searching && ing.results.length === 0 ? (
                <View>
                  <Text style={styles.noResultsText}>No matching results found</Text>
                  <Pressable style={styles.customButton} onPress={() => useIngredientAsCustom(ing.key, ing.query.trim())}>
                    <Text style={styles.customButtonText}>Add &quot;{ing.query.trim()}&quot; as custom ingredient</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.selectedIngredientRow}>
              <Text style={styles.selectedIngredientName} numberOfLines={1}>{ing.name}</Text>
              <Pressable onPress={() => updateIngredient(ing.key, { name: '', query: '', isCustom: false, dispensableDrugId: null })} hitSlop={6}>
                <Feather name="x-circle" size={16} color={adTokens.textMuted} />
              </Pressable>
            </View>
          )}

          {ing.isCustom ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Not a Controlled Substance</Text>
              <Switch
                value={ing.notControlledSubstance}
                onValueChange={(v) => updateIngredient(ing.key, { notControlledSubstance: v })}
              />
            </View>
          ) : null}

          <View style={styles.row2}>
            <FormInput label="Quantity" required value={String(ing.totalDispense)} onChangeText={(v) => updateIngredient(ing.key, { totalDispense: v })} keyboardType="decimal-pad" />
            <View style={styles.flex1}>
              <OptionPicker label="Dispense form" required value={ing.dispenseForm} options={DISPENSE_UNIT_NAME_LIST} onChange={(v) => updateIngredient(ing.key, { dispenseForm: v })} />
            </View>
          </View>
        </View>
      ))}
      {errors.ingredients ? <Text style={styles.error}>{errors.ingredients}</Text> : null}
      <Pressable style={styles.addIngredientButton} onPress={addIngredient}>
        <Feather name="plus" size={14} color={adTokens.primaryDark} />
        <Text style={styles.addIngredientText}>Add Another Compound Ingredient</Text>
      </Pressable>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>No substitutions (dispense as written)</Text>
        <Switch
          value={form.noSubstitutions}
          onValueChange={(v) => (v ? setSubstitutionConfirmOpen(true) : onChange('noSubstitutions', false))}
        />
      </View>
      <SubstitutionConfirmationModal
        visible={substitutionConfirmOpen}
        itemName={form.compoundName}
        onCancel={() => setSubstitutionConfirmOpen(false)}
        onConfirm={() => {
          onChange('noSubstitutions', true);
          setSubstitutionConfirmOpen(false);
        }}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Urgent</Text>
        <Switch value={form.urgent} onValueChange={(v) => onChange('urgent', v)} />
      </View>

      <View>
        <Text style={styles.label}>
          Patient directions<Text style={styles.required}> *</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.patientDirections}
          onChangeText={(t) => onChange('patientDirections', t.slice(0, FIELD_LIMITS.directions))}
          multiline
          textAlignVertical="top"
          placeholder="Directions for use"
          placeholderTextColor={adTokens.textMuted}
        />
        {errors.patientDirections ? <Text style={styles.error}>{errors.patientDirections}</Text> : null}
      </View>

      <View style={styles.row2}>
        <FormInput label="Total dispense" required value={String(form.totalDispense)} onChangeText={(t) => onChange('totalDispense', t)} keyboardType="decimal-pad" error={errors.totalDispense} />
        <View style={styles.flex1}>
          <OptionPicker label="Dispense form" required value={form.totalDispenseForm} options={DISPENSE_UNIT_NAME_LIST} onChange={(v) => onChange('totalDispenseForm', v)} />
        </View>
      </View>

      <View style={styles.row2}>
        <FormInput label="Refills" required value={String(form.refills)} onChangeText={(t) => onChange('refills', t.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.refills} />
        <FormInput label="Day supply" value={String(form.daySupply)} onChangeText={(t) => onChange('daySupply', t.replace(/\D/g, ''))} keyboardType="number-pad" />
      </View>

      <View>
        <Text style={styles.label}>Effective date</Text>
        <Pressable style={styles.dateField} onPress={() => setShowDate(true)}>
          <Text style={styles.dateText}>{formatDateOnly(form.effectiveDate)}</Text>
          <Feather name="calendar" size={16} color={adTokens.textSecondary} />
        </Pressable>
      </View>

      <NotesField value={form.pharmacyNotesText} onChange={(v) => onChange('pharmacyNotesText', v)} />

      {!isEdit ? (
        <View style={styles.group}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Save as favorite</Text>
            <Switch value={form.createAsFavorite} onValueChange={(v) => onChange('createAsFavorite', v)} />
          </View>
          {form.createAsFavorite ? (
            <FormInput label="Favorite name" required value={form.favoriteName} onChangeText={(t) => onChange('favoriteName', t)} placeholder="Name for this favorite" error={errors.favoriteName} />
          ) : null}
        </View>
      ) : null}

      <DatePickerSheet
        visible={showDate}
        title="Effective date"
        value={form.effectiveDate ? new Date(`${form.effectiveDate}T00:00:00`) : new Date()}
        onSelect={(date) => onChange('effectiveDate', localDateOnlyToApiString(date))}
        onClose={() => setShowDate(false)}
      />
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 4 },
  required: { color: adTokens.danger },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary, backgroundColor: adTokens.white },
  textArea: { minHeight: 76 },
  error: { fontSize: 12, color: adTokens.danger, marginTop: 3, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  switchLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  group: { marginTop: 4 },

  sectionLabel: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8, marginTop: 4 },
  ingredientCard: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 10, gap: 8 },
  ingredientHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ingredientIndex: { fontSize: 12, fontWeight: '700', color: adTokens.textSecondary },
  loader: { marginVertical: 8 },
  resultRow: { paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  resultText: { fontSize: 13, color: adTokens.textPrimary },
  resultMeta: { fontSize: 11, color: adTokens.textSecondary, marginTop: 1 },
  noResultsText: { fontSize: 12, color: adTokens.textSecondary, marginTop: 6 },
  customButton: { paddingVertical: 9, paddingHorizontal: 12, backgroundColor: adTokens.primaryTint, borderRadius: 8, marginTop: 6 },
  customButtonText: { fontSize: 12, fontWeight: '600', color: adTokens.primaryDark },
  selectedIngredientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: adTokens.gray50, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  selectedIngredientName: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  addIngredientButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 14 },
  addIngredientText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 },
  dateText: { fontSize: 13.5, color: adTokens.textPrimary },
});
