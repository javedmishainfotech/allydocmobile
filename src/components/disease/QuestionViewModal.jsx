import React, { useMemo } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { QUESTION_TYPES, NUMERIC_TYPES, isOptionType } from '../../constants/assessmentConstants';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

/** Port of AllyDocReactApp/src/components/Disease/QuestionViewModal.jsx - read-only preview of
 * one question's full configuration. */
export default function QuestionViewModal({ visible, question, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const typeMeta = useMemo(
    () => QUESTION_TYPES.find((t) => t.key === question?.type),
    [question?.type],
  );
  if (!question) return null;

  const isPublished = question.status === 'published';
  const showOptions = isOptionType(question.type) && question.options?.length > 0;
  const showNumeric = NUMERIC_TYPES.includes(question.type);
  const showScale = question.type === 'Scale';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.title}>View Question</Text>
            <Text style={styles.subtitle}>Read-only preview of this assessment question</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={20} color={adTokens.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, styles.chipPrimary]}>
              <Text style={[styles.chipText, styles.chipPrimaryText]}>{typeMeta?.label ?? question.type}</Text>
            </View>
            {question.required ? (
              <View style={[styles.chip, styles.chipDanger]}>
                <Text style={[styles.chipText, styles.chipDangerText]}>Required</Text>
              </View>
            ) : null}
            <View style={[styles.chip, isPublished ? styles.chipSuccess : styles.chipWarning]}>
              <Text style={[styles.chipText, isPublished ? styles.chipSuccessText : styles.chipWarningText]}>
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>
            {question.section ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{question.section}</Text>
              </View>
            ) : null}
          </View>

          <Field label="Question Text" value={question.text} multiline />
          {question.helpText ? <Field label="Help Text" value={question.helpText} /> : null}

          {showOptions && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Answer Options</Text>
              {question.options.map((opt, i) => (
                <View style={styles.optionRow} key={opt.answerId ?? i}>
                  <Text style={styles.optionNum}>{i + 1}</Text>
                  <Text style={styles.optionText}>{opt.text}</Text>
                </View>
              ))}
            </View>
          )}

          {showNumeric && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Number Settings</Text>
              <Text style={styles.readLine}>Min: {question.min ?? '-'}  Max: {question.max ?? '-'}  Unit: {question.unit || '-'}</Text>
            </View>
          )}

          {showScale && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Scale Settings</Text>
              <Text style={styles.readLine}>From {question.scaleMin ?? 1} to {question.scaleMax ?? 10}</Text>
              {(question.minLabel || question.maxLabel) ? (
                <Text style={styles.readLine}>{question.minLabel || '-'} &rarr; {question.maxLabel || '-'}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.requiredPanel}>
            <Text style={styles.requiredLabel}>Required</Text>
            <Switch value={Boolean(question.required)} disabled />
          </View>
          <Text style={styles.requiredHint}>Patient must answer before booking.</Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + bottomSafe }]}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, multiline && styles.fieldBoxMultiline]}>
        <Text style={styles.fieldText}>{value || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 15.5, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: adTokens.gray100 },
  chipText: { fontSize: 11, fontWeight: '700', color: adTokens.textSecondary },
  chipPrimary: { backgroundColor: adTokens.primaryTint },
  chipPrimaryText: { color: adTokens.primaryDark },
  chipDanger: { backgroundColor: adTokens.dangerTint },
  chipDangerText: { color: adTokens.dangerDark },
  chipSuccess: { backgroundColor: adTokens.successTint },
  chipSuccessText: { color: adTokens.successDark },
  chipWarning: { backgroundColor: adTokens.warningTint },
  chipWarningText: { color: adTokens.warningDark },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary },
  fieldBox: { backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10 },
  fieldBoxMultiline: { minHeight: 60 },
  fieldText: { fontSize: 13.5, color: adTokens.textPrimary },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10 },
  optionNum: { fontSize: 11, fontWeight: '700', color: adTokens.textMuted, width: 16 },
  optionText: { fontSize: 13, color: adTokens.textPrimary, flex: 1 },
  readLine: { fontSize: 13, color: adTokens.textSecondary },
  requiredPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: adTokens.gray50,
    borderRadius: 10,
    padding: 12,
  },
  requiredLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  requiredHint: { fontSize: 11.5, color: adTokens.textSecondary },
  footer: { padding: 14, borderTopWidth: 1, borderTopColor: adTokens.border, backgroundColor: adTokens.white },
  closeButton: { backgroundColor: adTokens.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  closeButtonText: { color: adTokens.white, fontWeight: '700', fontSize: 14 },
});
