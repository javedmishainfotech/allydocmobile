import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, adTokens } from '../../theme/colors';

const GENDER_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const EMPTY_FREELANCER_PATIENT_FILTER = {
  firstName: '',
  lastName: '',
  dob: '',
  email: '',
  gender: 'both',
  doseSpotId: '',
  phoneNumber: '',
};

function FilterField({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={adTokens.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

/** Port of AllyDocReactApp's FreelancerPatientFilterModal - First name, Last
 * name, DOB, Email, Gender, DoseSpot ID, Phone number. No client-side search,
 * filtering only (server pagination handled by the caller). */
export default function PatientFilterModal({ visible, initialFilter, onApply, onClose }) {
  const [draft, setDraft] = useState(initialFilter);

  useEffect(() => {
    if (visible) setDraft(initialFilter);
  }, [visible, initialFilter]);

  const update = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleClear = () => {
    setDraft(EMPTY_FREELANCER_PATIENT_FILTER);
    onApply(EMPTY_FREELANCER_PATIENT_FILTER);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Filter Patients</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <FilterField label="First name" value={draft.firstName} onChangeText={update('firstName')} />
            <FilterField label="Last name" value={draft.lastName} onChangeText={update('lastName')} />
            <FilterField label="DOB (YYYY-MM-DD)" value={draft.dob} onChangeText={update('dob')} />
            <FilterField label="Email" value={draft.email} onChangeText={update('email')} keyboardType="email-address" />
            <FilterField label="DoseSpot ID" value={draft.doseSpotId} onChangeText={update('doseSpotId')} keyboardType="numeric" />
            <FilterField label="Phone number" value={draft.phoneNumber} onChangeText={update('phoneNumber')} keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => {
                const isActive = draft.gender === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.genderChip, isActive && styles.genderChipActive]}
                    onPress={() => update('gender')(opt.value)}
                  >
                    <Text style={[styles.genderChipText, isActive && styles.genderChipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={() => onApply(draft)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '85%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  body: { paddingBottom: 10 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
  },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  genderChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  genderChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  genderChipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  genderChipTextActive: { color: colors.white },

  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  clearButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  clearButtonText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  applyButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  applyButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});
