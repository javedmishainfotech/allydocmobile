import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

/**
 * Port of AllyDocReactApp/src/components/Disease/PatientPreview/PatientPreviewModal.jsx, scoped to
 * just the questionnaire-logic simulation (question-by-question, with conditional visibility,
 * answer actions and safety-rule outcomes). Deliberately drops web's surrounding fake booking
 * funnel (consent -> appointment details -> schedule -> payment -> success) - that's a duplicate of
 * the real booking flow and isn't what an admin testing their question tree needs; the published
 * questions and their branching are the part worth previewing here.
 */

const answerValues = (answer) => {
  if (answer === null || answer === undefined || answer === '') return [];
  if (Array.isArray(answer?.values)) return answer.values;
  if (answer?.value !== undefined) return [String(answer.value)];
  return [String(answer)];
};

const answerScalar = (answer) => {
  if (answer?.value !== undefined) return answer.value;
  if (Array.isArray(answer?.values)) return answer.values[0];
  return answer;
};

const isAnswered = (answer) => {
  if (answer === null || answer === undefined || answer === '') return false;
  if (Array.isArray(answer?.values)) return answer.values.length > 0;
  if (answer?.value !== undefined) return answer.value !== '';
  return String(answer).trim() !== '';
};

const isVisible = (question, answers) => {
  const rules = question.conditionalLogic ?? [];
  if (rules.length === 0) return true;
  return rules.every((rule) => {
    const source = answers[rule.sourceQuestionId];
    if (!isAnswered(source)) return false;
    const values = answerValues(source).map((v) => String(v).toLowerCase());
    const target = String(rule.value ?? '').toLowerCase();
    const scalar = Number(answerScalar(source));
    switch (rule.operator) {
      case 'equals':
        return values.includes(target);
      case 'not-equals':
        return !values.includes(target);
      case 'contains':
        return values.some((v) => v.includes(target));
      case 'gt':
        return !Number.isNaN(scalar) && scalar > Number(rule.value);
      case 'lt':
        return !Number.isNaN(scalar) && scalar < Number(rule.value);
      default:
        return true;
    }
  });
};

const safetyFires = (question, answer) => {
  const rule = question.safetyRule;
  if (!rule?.enabled || !rule.triggerValue) return false;
  const triggers = rule.triggerValue.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const given = answerValues(answer).map((v) => String(v).toLowerCase());
  return given.some((v) => triggers.includes(v));
};

function DateInput({ answer, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View>
      <Pressable style={styles.dateField} onPress={() => setShowPicker(true)}>
        <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
        <Text style={[styles.dateText, !answer && styles.placeholder]}>{answer || 'Select date'}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) onChange(date.toISOString().slice(0, 10));
          }}
        />
      )}
    </View>
  );
}

function QuestionInput({ question, answer, onChange }) {
  const options = question.options ?? [];
  const detailFor = (val) => {
    const opt = options.find((o) => o.value === val);
    if (!opt?.hasTextInput) return null;
    return (
      <TextInput
        style={[styles.field, styles.detail]}
        placeholder={opt.textInputLabel || 'Please provide details...'}
        value={answer?.detail ?? ''}
        onChangeText={(detail) => onChange({ ...answer, detail })}
      />
    );
  };

  switch (question.type) {
    case 'Single Choice':
    case 'Yes / No':
      return (
        <View style={styles.optionList}>
          {options.map((opt) => {
            const active = answer?.value === opt.value;
            return (
              <View key={opt.value}>
                <Pressable
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => onChange(opt.hasTextInput ? { value: opt.value, detail: answer?.detail ?? '' } : { value: opt.value })}
                >
                  <MaterialCommunityIcons
                    name={active ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={active ? adTokens.primary : adTokens.textMuted}
                  />
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.text}</Text>
                </Pressable>
                {active && detailFor(opt.value)}
              </View>
            );
          })}
        </View>
      );

    case 'Multiple Choice':
      return (
        <View style={styles.optionList}>
          {options.map((opt) => {
            const checked = (answer?.values ?? []).includes(opt.value);
            const toggle = () => {
              const current = answer?.values ?? [];
              const values = checked ? current.filter((v) => v !== opt.value) : [...current, opt.value];
              onChange({ ...answer, values });
            };
            return (
              <View key={opt.value}>
                <Pressable style={[styles.option, checked && styles.optionActive]} onPress={toggle}>
                  <MaterialCommunityIcons
                    name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={checked ? adTokens.primary : adTokens.textMuted}
                  />
                  <Text style={[styles.optionLabel, checked && styles.optionLabelActive]}>{opt.text}</Text>
                </Pressable>
                {checked && detailFor(opt.value)}
              </View>
            );
          })}
        </View>
      );

    case 'Dropdown':
      return (
        <View style={styles.optionList}>
          {options.map((opt) => {
            const active = answer?.value === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => onChange({ value: opt.value })}
              >
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.text}</Text>
              </Pressable>
            );
          })}
        </View>
      );

    case 'Short Text':
      return <TextInput style={styles.field} maxLength={150} placeholder="Type your answer..." value={answer ?? ''} onChangeText={onChange} />;

    case 'Long Text':
      return (
        <TextInput
          style={[styles.field, styles.textarea]}
          multiline
          maxLength={500}
          placeholder="Type your answer..."
          value={answer ?? ''}
          onChangeText={onChange}
        />
      );

    case 'Number':
    case 'Temperature':
      return (
        <View style={styles.row}>
          <TextInput
            style={[styles.field, styles.flex1]}
            keyboardType={question.decimalsAllowed ? 'decimal-pad' : 'number-pad'}
            placeholder={question.min != null && question.max != null ? `${question.min} – ${question.max}` : 'Enter a number...'}
            value={answer ?? ''}
            onChangeText={onChange}
          />
          {question.unit ? <Text style={styles.unit}>{question.unit}</Text> : null}
        </View>
      );

    case 'Scale': {
      const from = question.scaleMin ?? 1;
      const to = question.scaleMax ?? 10;
      const steps = [];
      for (let i = from; i <= to; i += 1) steps.push(i);
      return (
        <View>
          <View style={styles.scaleRow}>
            {steps.map((v) => (
              <Pressable
                key={v}
                style={[styles.scaleDot, String(answer) === String(v) && styles.scaleDotActive]}
                onPress={() => onChange(v)}
              >
                <Text style={[styles.scaleDotText, String(answer) === String(v) && styles.scaleDotTextActive]}>{v}</Text>
              </Pressable>
            ))}
          </View>
          {(question.minLabel || question.maxLabel) && (
            <View style={styles.row}>
              <Text style={styles.hint}>{question.minLabel}</Text>
              <View style={styles.flex1} />
              <Text style={styles.hint}>{question.maxLabel}</Text>
            </View>
          )}
        </View>
      );
    }

    case 'Date':
      return <DateInput answer={answer} onChange={onChange} />;

    case 'File Upload':
      return (
        <View style={styles.uploadBox}>
          <Feather name="upload-cloud" size={22} color={adTokens.primaryDark} />
          <Text style={styles.uploadHint}>Preview only - file selection is not simulated here.</Text>
        </View>
      );

    default:
      return <TextInput style={styles.field} placeholder="Type your answer..." value={answer ?? ''} onChangeText={onChange} />;
  }
}

export default function PatientPreviewModal({ visible, disease, questions, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const published = useMemo(
    () =>
      (questions ?? [])
        .filter((q) => q.status === 'published')
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [questions],
  );

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [outcome, setOutcome] = useState(null);

  const visibleQ = useMemo(() => published.filter((q) => isVisible(q, answers)), [published, answers]);
  const current = visibleQ[index];
  const total = visibleQ.length;
  const answer = current ? answers[current.id] : undefined;

  const setAnswer = (value) => {
    setValidationError('');
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setOutcome(null);
    setValidationError('');
  };

  const handleClose = () => {
    restart();
    onClose();
  };

  const advance = () => {
    if (index < total - 1) setIndex(index + 1);
    else setOutcome({ kind: 'complete' });
  };

  const handleNext = () => {
    if (!current) return;
    if (current.required && !isAnswered(answer)) {
      setValidationError('Please answer this question to continue.');
      return;
    }
    setValidationError('');

    const given = answerValues(answer).map((v) => String(v).toLowerCase());
    for (const action of current.answerActions ?? []) {
      const trigger = String(action.triggerValue ?? '').toLowerCase();
      if (!trigger || !given.includes(trigger)) continue;
      if (action.actionType === 'prevent-booking' || action.actionType === 'stop-assessment') {
        setOutcome({ kind: 'hard-stop', message: action.message || current.safetyRule?.message });
        return;
      }
      if (action.actionType === 'warning' || action.actionType === 'info-message') {
        setOutcome({ kind: 'warning', message: action.message });
        return;
      }
      if (action.actionType === 'flag-review') {
        setOutcome({ kind: 'review' });
        return;
      }
    }

    if (safetyFires(current, answer)) {
      const rule = current.safetyRule;
      if (rule.bookingBehavior === 'prevent') {
        setOutcome({ kind: 'hard-stop', message: rule.message });
        return;
      }
      if (rule.bookingBehavior === 'review') {
        setOutcome({ kind: 'review', message: rule.message });
        return;
      }
      setOutcome({ kind: 'warning', message: rule.message });
      return;
    }

    advance();
  };

  if (!visible) return null;

  let body;
  if (total === 0) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="inbox-outline" size={32} color={adTokens.textMuted} />
        <Text style={styles.resultTitle}>No questions to display.</Text>
        <Text style={styles.resultBody}>Publish at least one question to see what patients get.</Text>
      </View>
    );
  } else if (outcome?.kind === 'hard-stop') {
    body = (
      <View style={styles.center}>
        <View style={[styles.resultIcon, styles.resultIconStop]}>
          <Feather name="alert-triangle" size={26} color={adTokens.dangerDark} />
        </View>
        <Text style={styles.resultTitle}>We're unable to continue this booking online</Text>
        <Text style={styles.resultBody}>
          {outcome.message || 'Based on the information you provided, your symptoms may require a different level of medical evaluation.'}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={restart}>
          <Text style={styles.primaryBtnText}>Run again</Text>
        </Pressable>
      </View>
    );
  } else if (outcome?.kind === 'warning') {
    body = (
      <View style={styles.center}>
        <View style={[styles.resultIcon, styles.resultIconWarn]}>
          <Feather name="alert-circle" size={26} color={adTokens.warningDark} />
        </View>
        <Text style={styles.resultTitle}>Additional medical attention may be required</Text>
        <Text style={styles.resultBody}>{outcome.message || 'Based on your response, your healthcare provider may need additional information.'}</Text>
        <View style={styles.row}>
          <Pressable style={styles.ghostBtn} onPress={() => setOutcome(null)}>
            <Text style={styles.ghostBtnText}>Go Back</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => { setOutcome(null); advance(); }}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  } else if (outcome?.kind === 'review') {
    body = (
      <View style={styles.center}>
        <View style={[styles.resultIcon, styles.resultIconWarn]}>
          <Feather name="shield" size={26} color={adTokens.warningDark} />
        </View>
        <Text style={styles.resultTitle}>Assessment Complete</Text>
        <Text style={styles.resultBody}>{outcome.message || 'Your responses require review before appointment booking can continue.'}</Text>
        <Pressable style={styles.primaryBtn} onPress={restart}>
          <Text style={styles.primaryBtnText}>Run again</Text>
        </Pressable>
      </View>
    );
  } else if (outcome?.kind === 'complete') {
    body = (
      <View style={styles.center}>
        <View style={[styles.resultIcon, styles.resultIconSuccess]}>
          <Feather name="check-circle" size={26} color={adTokens.successDark} />
        </View>
        <Text style={styles.resultTitle}>Assessment Complete</Text>
        <Text style={styles.resultBody}>A real patient would continue to scheduling next.</Text>
        <Pressable style={styles.primaryBtn} onPress={restart}>
          <Text style={styles.primaryBtnText}>Run again</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <>
        <Text style={styles.previewTitle}>{disease?.assessmentTitle || 'Health Questionnaire'}</Text>
        {disease?.patientInstructions ? <Text style={styles.previewInstructions}>{disease.patientInstructions}</Text> : null}
        <Text style={styles.qcount}>Question {index + 1} of {total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(5, (index / total) * 100)}%` }]} />
        </View>

        <View style={styles.card}>
          {current?.section ? <Text style={styles.cardSection}>{current.section}</Text> : null}
          <Text style={styles.cardQuestion}>
            {current?.text}
            {current?.required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {current?.helpText ? <Text style={styles.cardHelp}>{current.helpText}</Text> : null}
          {current ? <QuestionInput question={current} answer={answer} onChange={setAnswer} /> : null}
          {validationError ? <Text style={styles.validationError}>{validationError}</Text> : null}
        </View>
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <Toast />
      <View style={styles.screen}>
        <View style={styles.banner}>
          <Feather name="eye" size={13} color={adTokens.white} />
          <Text style={styles.bannerText}>PREVIEW MODE - answers here are not saved</Text>
        </View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Preview as Patient</Text>
          <Pressable style={styles.closeIcon} onPress={handleClose} hitSlop={8}>
            <Feather name="x" size={22} color={adTokens.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, (total === 0 || outcome) && { paddingBottom: 16 + bottomSafe }]}
        >
          {body}
        </ScrollView>

        {total > 0 && !outcome && (
          <View style={[styles.footer, { paddingBottom: 14 + bottomSafe }]}>
            {index > 0 ? (
              <Pressable style={styles.ghostBtn} onPress={() => setIndex(index - 1)}>
                <Text style={styles.ghostBtnText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.flex1} />
            )}
            <Pressable style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>{index < total - 1 ? 'Next' : 'Submit'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: adTokens.warningDark, paddingVertical: 6 },
  bannerText: { fontSize: 11, fontWeight: '700', color: adTokens.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  closeIcon: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 10 },
  previewTitle: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },
  previewInstructions: { fontSize: 13, color: adTokens.textSecondary },
  qcount: { fontSize: 12, color: adTokens.textSecondary, marginTop: 6 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: adTokens.primary },
  card: { backgroundColor: adTokens.white, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, padding: 16, gap: 10, marginTop: 10 },
  cardSection: { fontSize: 11, fontWeight: '700', color: adTokens.primaryDark, textTransform: 'uppercase' },
  cardQuestion: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  cardHelp: { fontSize: 12, color: adTokens.textSecondary },
  required: { color: adTokens.dangerDark },
  validationError: { fontSize: 12, color: adTokens.dangerDark, fontWeight: '600' },
  optionList: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  optionActive: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  optionLabel: { fontSize: 13.5, color: adTokens.textPrimary, flex: 1 },
  optionLabelActive: { fontWeight: '700', color: adTokens.primaryDark },
  field: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, backgroundColor: adTokens.gray50 },
  detail: { marginTop: 6, marginLeft: 30 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unit: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 6 },
  scaleDot: { minWidth: 38, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, alignItems: 'center' },
  scaleDotActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  scaleDotText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  scaleDotTextActive: { color: adTokens.white },
  hint: { fontSize: 11.5, color: adTokens.textSecondary },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.gray50 },
  dateText: { fontSize: 13.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },
  uploadBox: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  uploadHint: { fontSize: 11.5, color: adTokens.primaryDark, textAlign: 'center' },
  center: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 12 },
  resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resultIconStop: { backgroundColor: adTokens.dangerTint },
  resultIconWarn: { backgroundColor: adTokens.warningTint },
  resultIconSuccess: { backgroundColor: adTokens.successTint },
  resultTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary, textAlign: 'center' },
  resultBody: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: adTokens.border, backgroundColor: adTokens.white },
  ghostBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  ghostBtnText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  primaryBtnText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },
});
