import React from 'react';
import { View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import OptionPicker from './OptionPicker';
import { SheetShell, SheetFooter, FormInput, NotesField } from './MedicationFormModal';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import { FIELD_LIMITS } from '../../utils/prescriptionOptions';
import { adTokens } from '../../theme/colors';

const DISPENSE_UNIT_NAME_LIST = DISPENSE_UNIT_OPTIONS.map((option) => option.name);

export const emptySupplyForm = (overrides = {}) => ({
  customSupplyName: '',
  notControlledSubstance: false,
  quantity: '',
  refills: '0',
  daysSupply: '',
  dispenseUnit: 'Each',
  patientDirections: '',
  urgent: false,
  pharmacyNotesText: '',
  ...overrides,
});

/** Errors keyed by field, using web's messages ("Please enter quantity" / "Please enter directions" / custom name + not-controlled). */
export function validateSupplyForm(form, isCustom) {
  const errors = {};
  if (isCustom && !form.customSupplyName.trim()) errors.customSupplyName = 'Supply name is required';
  if (isCustom && !form.notControlledSubstance) errors.notControlledSubstance = 'Please confirm this is not a controlled substance';
  if (!String(form.quantity).trim()) errors.quantity = 'Please enter quantity';
  if (!form.patientDirections.trim()) errors.patientDirections = 'Please enter directions';
  return errors;
}

/** Port of web's supply prescription modal (catalogue supply) and CustomSupplyModal ("Add Custom Supply"). */
export default function SupplyFormModal({ visible, isCustom, supplyName, pharmacyName, form, triedSubmit, isEdit, saving, onChange, onSubmit, onClose }) {
  if (!form) return null;
  const errors = triedSubmit ? validateSupplyForm(form, isCustom) : {};
  return (
    <SheetShell
      visible={visible}
      icon="package-variant"
      title={isCustom ? (isEdit ? 'Edit Custom Supply' : 'Add Custom Supply') : supplyName || 'Supply'}
      subtitle={pharmacyName ? `Pharmacy: ${pharmacyName}` : undefined}
      onClose={onClose}
      footer={<SheetFooter saving={saving} submitLabel={isEdit ? 'Update Prescription' : 'Create Prescription'} onCancel={onClose} onSubmit={onSubmit} />}
    >
      {isCustom ? (
        <>
          <FormInput label="Supply name" required value={form.customSupplyName} onChangeText={(t) => onChange('customSupplyName', t)} placeholder="Enter supply name" error={errors.customSupplyName} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>This is not a controlled substance</Text>
            <Switch value={form.notControlledSubstance} onValueChange={(v) => onChange('notControlledSubstance', v)} />
          </View>
          {errors.notControlledSubstance ? <Text style={styles.error}>{errors.notControlledSubstance}</Text> : null}
        </>
      ) : null}

      <View style={styles.row2}>
        <FormInput label="Quantity" required value={String(form.quantity)} onChangeText={(t) => onChange('quantity', t)} keyboardType="decimal-pad" error={errors.quantity} />
        <View style={styles.flex1}>
          <OptionPicker label="Dispense unit" value={form.dispenseUnit} options={DISPENSE_UNIT_NAME_LIST} onChange={(v) => onChange('dispenseUnit', v)} />
        </View>
      </View>
      <View style={styles.row2}>
        <FormInput label="Refills" value={String(form.refills)} onChangeText={(t) => onChange('refills', t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <FormInput label="Days supply" value={String(form.daysSupply)} onChangeText={(t) => onChange('daysSupply', t.replace(/\D/g, ''))} keyboardType="number-pad" />
      </View>

      <View>
        <Text style={styles.label}>
          Directions<Text style={styles.required}> *</Text>
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

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Urgent</Text>
        <Switch value={form.urgent} onValueChange={(v) => onChange('urgent', v)} />
      </View>

      {isCustom ? <NotesField value={form.pharmacyNotesText} onChange={(v) => onChange('pharmacyNotesText', v)} /> : null}
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
  error: { fontSize: 12, color: adTokens.danger, marginTop: 3 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
});
