import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import OptionPicker from './OptionPicker';
import DatePickerSheet from '../DatePickerSheet';
import { DISPENSE_UNIT_OPTIONS } from '../../utils/dispenseUnits';
import {
  DOSE_DELIVERY_METHODS,
  DOSE_FORMS,
  ROUTES_OF_ADMINISTRATION,
  FREQUENCIES,
  PHARMACY_NOTE_OPTIONS,
  FIELD_LIMITS,
} from '../../utils/prescriptionOptions';
import { localDateOnlyToApiString } from '../../utils/dateOnly';
import { adTokens, colors } from '../../theme/colors';

const DISPENSE_UNIT_NAME_LIST = DISPENSE_UNIT_OPTIONS.map((option) => option.name);

export const formatDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'N/A';
};

export const isPastDate = (value) => {
  if (!value) return false;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
};

export function FormInput({ label, required, error, style, ...inputProps }) {
  return (
    <View style={[styles.flex1, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput style={styles.input} placeholderTextColor={adTokens.textMuted} {...inputProps} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function NotesField({ value, onChange }) {
  return (
    <View>
      <Text style={styles.label}>Pharmacy notes (optional)</Text>
      <View style={styles.chipRow}>
        {PHARMACY_NOTE_OPTIONS.map((option) => (
          <Pressable key={option} style={styles.chip} onPress={() => onChange(`${value ? `${value}, ` : ''}${option}`.slice(0, FIELD_LIMITS.pharmacyNotes))}>
            <Text style={styles.chipText}>+ {option}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={value}
        onChangeText={(t) => onChange(t.slice(0, FIELD_LIMITS.pharmacyNotes))}
        multiline
        textAlignVertical="top"
        placeholder="Notes for the pharmacist"
        placeholderTextColor={adTokens.textMuted}
      />
      <Text style={styles.counter}>
        {value.length}/{FIELD_LIMITS.pharmacyNotes}
      </Text>
    </View>
  );
}

export function SheetShell({ visible, icon = 'pill', title, subtitle, onClose, children, footer }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name={icon} size={22} color={adTokens.primaryDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={adTokens.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function SheetFooter({ saving, submitLabel, onCancel, onSubmit }) {
  return (
    <>
      <Pressable style={styles.secondary} onPress={onCancel} disabled={saving}>
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>
      <Pressable style={[styles.primary, saving && styles.disabled]} onPress={onSubmit} disabled={saving}>
        <Text style={styles.primaryText}>{submitLabel}</Text>
        {saving ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
      </Pressable>
    </>
  );
}

/**
 * Port of web's MedicationDetailsModal (coded medication, add / edit): SIG builder or custom directions, day supply,
 * total dispense + dispense unit, refills, effective date, no-substitutions / urgent, pharmacy notes and "Save as favorite".
 */
export default function MedicationFormModal({ visible, drugName, pharmacyName, form, errors, triedSubmit, isEdit, saving, onChange, onSubmit, onClose }) {
  const [showDate, setShowDate] = useState(false);
  if (!form) return null;
  const err = (key) => (triedSubmit ? errors[key] : undefined);

  return (
    <SheetShell
      visible={visible}
      title={drugName || 'Medication'}
      subtitle={pharmacyName ? `Pharmacy: ${pharmacyName}` : undefined}
      onClose={onClose}
      footer={<SheetFooter saving={saving} submitLabel={isEdit ? 'Update Prescription' : 'Create Prescription'} onCancel={onClose} onSubmit={onSubmit} />}
    >
      <OptionPicker
        label="Build directions using"
        value={form.buildUsing === 'custom-format' ? 'Custom Format' : 'SIG Builder'}
        options={['SIG Builder', 'Custom Format']}
        onChange={(value) => value && onChange('buildUsing', value === 'Custom Format' ? 'custom-format' : 'sig-builder')}
      />

      {form.buildUsing !== 'custom-format' ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>SIG Builder</Text>
          <OptionPicker label="Dose delivery method" value={form.doseDeliveryMethod} options={DOSE_DELIVERY_METHODS} placeholder="Select delivery method" onChange={(v) => onChange('doseDeliveryMethod', v)} />
          <View style={styles.row2}>
            <FormInput label="Dose quantity" value={form.doseQuantity} onChangeText={(t) => onChange('doseQuantity', t)} keyboardType="decimal-pad" placeholder="Enter quantity" />
            <View style={styles.flex1}>
              <OptionPicker label="Dose form" value={form.doseForm} options={DOSE_FORMS} placeholder="Select dose form" onChange={(v) => onChange('doseForm', v)} />
            </View>
          </View>
          <OptionPicker label="Route of administration" value={form.routeOfAdministration} options={ROUTES_OF_ADMINISTRATION} placeholder="Select route" onChange={(v) => onChange('routeOfAdministration', v)} />
          <OptionPicker label="Frequency" value={form.frequency} options={FREQUENCIES} placeholder="Select frequency" onChange={(v) => onChange('frequency', v)} />
        </View>
      ) : null}

      <FormInput label="Day supply" required value={form.daySupply} onChangeText={(t) => onChange('daySupply', t)} keyboardType="number-pad" placeholder="Enter days" error={err('daySupply')} />

      <View>
        <Text style={styles.label}>
          Patient directions (SIG)<Text style={styles.required}> *</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.patientDirections}
          onChangeText={(t) => onChange('patientDirections', t.slice(0, FIELD_LIMITS.directions))}
          multiline
          textAlignVertical="top"
          placeholder="Instructions will be auto-generated..."
          placeholderTextColor={adTokens.textMuted}
        />
        <Text style={styles.counter}>
          {form.patientDirections.length}/{FIELD_LIMITS.directions}
        </Text>
        {err('patientDirections') ? <Text style={styles.error}>{err('patientDirections')}</Text> : null}
      </View>

      <View style={styles.row2}>
        <FormInput label="Total dispense" required value={String(form.totalDispense)} onChangeText={(t) => onChange('totalDispense', t)} keyboardType="decimal-pad" error={err('totalDispense')} />
        <View style={styles.flex1}>
          <OptionPicker label="Dispense unit" required value={form.totalDispenseForm} options={DISPENSE_UNIT_NAME_LIST} onChange={(v) => onChange('totalDispenseForm', v)} />
          {err('totalDispenseForm') ? <Text style={styles.error}>{err('totalDispenseForm')}</Text> : null}
        </View>
      </View>
      <View style={styles.row2}>
        <FormInput label="Refills" required value={String(form.refills)} onChangeText={(t) => onChange('refills', t.replace(/\D/g, ''))} keyboardType="number-pad" error={err('refills')} />
        <View style={styles.flex1}>
          <Text style={styles.label}>Effective date</Text>
          <Pressable style={styles.dateField} onPress={() => setShowDate(true)}>
            <Text style={styles.dateText}>{formatDateOnly(form.effectiveDate)}</Text>
            <Feather name="calendar" size={16} color={adTokens.textSecondary} />
          </Pressable>
        </View>
      </View>
      {isPastDate(form.effectiveDate) ? <Text style={styles.warn}>This effective date is in the past.</Text> : null}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>No substitutions (dispense as written)</Text>
        <Switch value={form.noSubstitutions} onValueChange={(v) => onChange('noSubstitutions', v)} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Urgent</Text>
        <Switch value={form.urgent} onValueChange={(v) => onChange('urgent', v)} />
      </View>

      <NotesField value={form.pharmacyNotesText} onChange={(v) => onChange('pharmacyNotesText', v)} />

      {!isEdit ? (
        <View style={styles.group}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Save as favorite</Text>
            <Switch value={form.createAsFavorite} onValueChange={(v) => onChange('createAsFavorite', v)} />
          </View>
          {form.createAsFavorite ? (
            <FormInput label="Favorite name" required value={form.favoriteName} onChangeText={(t) => onChange('favoriteName', t)} placeholder="Name for this favorite" error={err('favoriteName')} />
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
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', backgroundColor: adTokens.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  body: { padding: 16, gap: 14, paddingBottom: 24 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  group: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: adTokens.gray50, borderWidth: 1, borderColor: adTokens.border },
  groupTitle: { fontSize: 13, fontWeight: '800', color: adTokens.primaryDark },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 4 },
  required: { color: adTokens.danger },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary, backgroundColor: adTokens.white },
  textArea: { minHeight: 76 },
  counter: { fontSize: 11.5, color: adTokens.textSecondary, textAlign: 'right', marginTop: 2 },
  error: { fontSize: 12, color: adTokens.danger, marginTop: 3 },
  warn: { fontSize: 12.5, color: adTokens.warningDark },
  row2: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  dateText: { fontSize: 14, color: adTokens.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  chipText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryText: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  primary: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: adTokens.primary },
  buttonSpinner: { marginLeft: 8 },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  disabled: { opacity: 0.55 },
});
