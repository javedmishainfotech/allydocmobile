import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTreatmentPlan } from '../../hooks/useTreatmentPlan';
import OptionPicker from '../prescriptions/OptionPicker';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const FREQUENCY_OPTIONS = ['once', 'twice', 'thrice', 'weekly', 'monthly', 'SOS'];
const FOOD_OPTIONS = [
  { value: 'before', label: 'Before food' },
  { value: 'after', label: 'After food' },
];
const MAX_SUGGESTIONS = 6;

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
 * Port of web's AddMedicineModal (module/Doctor/Pages/DoctorTreatmentPlan/AddMedicineModal.jsx) -
 * adds a plain, in-office dispensed medicine straight onto this visit's treatment plan
 * (`POST /AddMedicine`), distinct from the DoseSpot e-prescribing flow (prescriptionService.js).
 * This feature is dead/commented-out code in the "latest" web repo (dropped during its tabs
 * refactor) but still live in the sibling AllyDocReactApp repo, which is what this was ported
 * from.
 *
 * The medicine name field mirrors web's CreatableSelect: pick one of the doctor's existing
 * stocked names (autocomplete list below the field, from `GetAllActiveMedicineStock`) or just
 * type a brand-new one. `medicineId` stays 0 for a typed/unmatched name, same as web's
 * `handleCreate` - the backend creates the new stock entry itself.
 *
 * Wrapped in its own `SafeAreaProvider`, same reason as MedicationFavoriteModal: RN's `Modal`
 * renders in a separate native window on iOS, so `useSafeAreaInsets`/`useBottomSafeSpacing` only
 * see real insets when the provider is nested inside the Modal itself.
 */
export default function AddMedicineModal({ visible, appointmentId, medicineStock, onClose, onSaved }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <AddMedicineForm appointmentId={appointmentId} medicineStock={medicineStock} onClose={onClose} onSaved={onSaved} />
      </SafeAreaProvider>
    </Modal>
  );
}

function AddMedicineForm({ appointmentId, medicineStock, onClose, onSaved }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const { addMedicine } = useTreatmentPlan();

  const [medicineId, setMedicineId] = useState(0);
  const [medicineName, setMedicineName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [doseQuantity, setDoseQuantity] = useState('');
  const [doseUnit, setDoseUnit] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [beforeAfterFood, setBeforeAfterFood] = useState('after');
  const [instruction, setInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const suggestions = useMemo(() => {
    const term = medicineName.trim().toLowerCase();
    const stock = Array.isArray(medicineStock) ? medicineStock : [];
    const matches = term ? stock.filter((m) => String(m.medicineName || '').toLowerCase().includes(term)) : stock;
    return matches.slice(0, MAX_SUGGESTIONS);
  }, [medicineName, medicineStock]);

  const pickSuggestion = (item) => {
    setMedicineId(item.medicineId ?? 0);
    setMedicineName(item.medicineName || '');
    setShowSuggestions(false);
  };

  const onChangeMedicineName = (text) => {
    // Typing anything (rather than picking a suggestion) is a "create new" - same as web's
    // CreatableSelect handleCreate, which only ever touches medicineName and leaves medicineId
    // as-is (0, since nothing was picked from the list).
    setMedicineId(0);
    setMedicineName(text);
    setShowSuggestions(true);
  };

  const canSubmit =
    medicineName.trim() &&
    doseQuantity.trim() &&
    Number(doseQuantity) > 0 &&
    doseUnit.trim() &&
    frequency.trim() &&
    durationDays.trim() &&
    Number(durationDays) > 0 &&
    beforeAfterFood &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await addMedicine({
        appointmentId,
        medicineId,
        medicineName: medicineName.trim(),
        doseQuantity: Number(doseQuantity),
        doseUnit: doseUnit.trim(),
        frequency,
        instruction: instruction.trim(),
        durationDays: Number(durationDays),
        beforeAfterFood,
      });
      if (result.success) {
        toast.success(result.message || 'Medicine added.');
        onSaved();
      } else {
        toast.error(result.message || 'Unable to add medicine.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toast />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Add Medicine</Text>
        <Pressable onPress={onClose} disabled={submitting} hitSlop={8}>
          <Feather name="x" size={20} color={adTokens.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field label="Medicine" required>
          <TextInput
            style={styles.input}
            value={medicineName}
            onChangeText={onChangeMedicineName}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search or type a new medicine name"
            placeholderTextColor={adTokens.textMuted}
          />
          {showSuggestions && suggestions.length > 0 ? (
            <View style={styles.suggestionBox}>
              {suggestions.map((item, index) => (
                <Pressable
                  key={String(item.medicineId ?? index)}
                  style={styles.suggestionRow}
                  onPress={() => pickSuggestion(item)}
                >
                  <Text style={styles.suggestionText}>{item.medicineName}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Dose Quantity" required>
          <TextInput style={styles.input} keyboardType="numeric" value={doseQuantity} onChangeText={setDoseQuantity} />
        </Field>

        <Field label="Dose Unit" required>
          <TextInput style={styles.input} value={doseUnit} onChangeText={setDoseUnit} placeholder="e.g. mg, ml, tablet" placeholderTextColor={adTokens.textMuted} />
        </Field>

        <OptionPicker label="Frequency" value={frequency} options={FREQUENCY_OPTIONS} onChange={setFrequency} required />

        <Field label="Duration Days" required>
          <TextInput style={styles.input} keyboardType="numeric" value={durationDays} onChangeText={setDurationDays} />
        </Field>

        <Field label="Medicine to take" required>
          <View style={styles.foodRow}>
            {FOOD_OPTIONS.map((option) => {
              const active = beforeAfterFood === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.foodOption, active && styles.foodOptionActive]}
                  onPress={() => setBeforeAfterFood(option.value)}
                >
                  <Feather name={active ? 'check-circle' : 'circle'} size={14} color={active ? adTokens.primaryDark : adTokens.textMuted} />
                  <Text style={[styles.foodOptionText, active && styles.foodOptionTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Instruction">
          <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={2} value={instruction} onChangeText={setInstruction} />
        </Field>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
        <Pressable style={styles.cancelButton} onPress={onClose} disabled={submitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, !canSubmit && styles.disabledButton]} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveButtonText}>Add medicine</Text>}
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
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  suggestionBox: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: adTokens.gray100 },
  suggestionText: { fontSize: 13, color: adTokens.textPrimary },
  foodRow: { flexDirection: 'row', gap: 10 },
  foodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  foodOptionActive: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  foodOptionText: { fontSize: 13, color: adTokens.textSecondary },
  foodOptionTextActive: { color: adTokens.primaryDark, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, minWidth: 120, alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
