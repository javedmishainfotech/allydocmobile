import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Switch, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

/** Port of AllyDocReactApp/src/components/Disease/AssessmentSettingsDrawer.jsx - assessment-level
 * settings (title, instructions, and patient-flow toggles), as a full-screen modal here instead
 * of web's side drawer. */
export default function AssessmentSettingsDrawer({ visible, disease, saving, onSave, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const [assessmentTitle, setAssessmentTitle] = useState(disease?.assessmentTitle ?? '');
  const [patientInstructions, setPatientInstructions] = useState(disease?.patientInstructions ?? '');
  const [estimatedTime, setEstimatedTime] = useState(disease?.estimatedTime ?? '');
  const [assessmentEnabled, setAssessmentEnabled] = useState(disease?.assessmentEnabled ?? true);
  const [requireCompletion, setRequireCompletion] = useState(disease?.assessmentRequired ?? false);
  const [allowGoBack, setAllowGoBack] = useState(disease?.allowGoBack ?? true);
  const [showProgress, setShowProgress] = useState(disease?.showProgress ?? true);
  const [autosave, setAutosave] = useState(disease?.autosave ?? false);

  if (!disease) return null;

  const handleSave = () => {
    onSave({
      diseaseId: disease.id,
      assessmentTitle: assessmentTitle.trim(),
      patientInstructions: patientInstructions.trim(),
      estimatedTime: estimatedTime.trim(),
      assessmentEnabled,
      requireCompletion,
      allowGoBack,
      showProgress,
      autosave,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={saving ? undefined : onClose} transparent>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Assessment Settings</Text>
              <Text style={styles.subtitle}>{disease?.name}</Text>
            </View>
            <Pressable style={styles.closeIcon} onPress={onClose} disabled={saving} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Field label="Assessment Title">
              <TextInput
                style={styles.input}
                placeholder="e.g. Fever Health Questionnaire"
                value={assessmentTitle}
                onChangeText={setAssessmentTitle}
              />
            </Field>

            <Field label="Patient Instructions">
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="e.g. Please answer the following questions to help us provide you with the best possible care."
                value={patientInstructions}
                onChangeText={setPatientInstructions}
                multiline
                numberOfLines={3}
              />
            </Field>

            <Field label="Estimated Completion Time">
              <TextInput
                style={styles.input}
                placeholder="e.g. 5 minutes"
                value={estimatedTime}
                onChangeText={setEstimatedTime}
              />
            </Field>

            <View style={styles.toggles}>
              <Toggle
                label="Assessment Enabled"
                helper="Off means patients skip straight to booking."
                value={assessmentEnabled}
                onChange={setAssessmentEnabled}
              />
              <Toggle label="Require Completion Before Booking" value={requireCompletion} onChange={setRequireCompletion} />
              <Toggle label="Allow Patient to Go Back" value={allowGoBack} onChange={setAllowGoBack} />
              <Toggle label="Show Question Progress" value={showProgress} onChange={setShowProgress} />
              <Toggle label="Autosave Progress" value={autosave} onChange={setAutosave} />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, helper, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex1}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {helper ? <Text style={styles.toggleHelper}>{helper}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  closeIcon: { padding: 4 },
  body: { paddingHorizontal: 16 },
  bodyContent: { paddingVertical: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
    backgroundColor: adTokens.gray50,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  toggles: { gap: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  toggleHelper: { fontSize: 11, color: adTokens.textSecondary, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },
  disabled: { opacity: 0.6 },
});
