import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpAlert, IdpCard } from './IdpUi';
import AttemptModal from './AttemptModal';
import { submitIdpAnswers } from '../../services/identityProofingService';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const MAX_ATTEMPT = 3;

const ATTEMPT_MODALS = {
  1: {
    attempt: 1,
    type: 'Warning',
    header: 'Attempt 1 – Failed',
    content: 'Identity verification failed. Please review your information and try again. You have 2 attempts remaining.',
  },
  2: {
    attempt: 2,
    type: 'Warning',
    header: 'Attempt 2 – Failed',
    content:
      'Identity verification unsuccessful. Please ensure your details match your official records. You have 1 attempt remaining.',
  },
  3: {
    attempt: 3,
    type: 'Warning',
    header: 'Attempt 3 – Maximum Attempts Reached',
    content: 'You have reached the maximum number of attempts. Please contact your administrator to continue.',
  },
};

/** Port of components/IdentityProofing/Step5Questionnaire.jsx (Experian knowledge-based questions). */
export default function QuestionnaireScreen({ params }) {
  const {
    idpAttemptCount,
    updateIdpStatus,
    updateIdpAttemptCount,
    goBack,
    goToOverview,
    replace,
    goToFacialSteps,
  } = useIdentityProofing();

  const questions = params?.questions || [];
  const answerSets = params?.answers || [];
  const sessionID = params?.sessionID || '';

  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [attemptModal, setAttemptModal] = useState(null);

  useEffect(() => {
    // No questions supplied (e.g. opened out of order): return to the previous step like the web page does.
    if (!questions.length) goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswerChange = (questionIndex, option) => {
    // Tapping the selected option again clears it (same toggle as the web radios).
    setAnswers((prev) => ({ ...prev, [questionIndex]: prev[questionIndex] === option ? null : option }));
    setErrors((prev) => ({ ...prev, [questionIndex]: undefined }));
  };

  const validateAnswers = () => {
    const nextErrors = {};
    questions.forEach((_, index) => {
      if (!answers[index]) nextErrors[index] = 'This question is required';
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeAttemptModal = () => {
    if (!attemptModal) return;
    if (attemptModal.attempt < MAX_ATTEMPT) {
      replace('step', { step: 4 });
    } else {
      goToOverview();
    }
    setAttemptModal(null);
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;
    setSubmitting(true);

    // The API expects each selected option's 1-based position within that question's choices.
    const answersArray = questions.map((_, questionIndex) => {
      const selected = answers[questionIndex];
      if (!selected) return null;
      const optionIndex = (answerSets[questionIndex] || []).indexOf(selected);
      return optionIndex >= 0 ? String(optionIndex + 1) : null;
    });

    const result = await submitIdpAnswers({ sessionId: sessionID, answers: answersArray });
    const body = result.raw;

    if (!body) {
      toast.error(result.message || 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
      return;
    }

    const idCapture = body.idCapture ?? body.IDCapture;
    const resultCode = body.result?.resultCode ?? body.Result?.ResultCode;
    const errorMessage = body.result?.resultDescription || body.message || '';

    if (idCapture === true && resultCode === 'OK') {
      await updateIdpStatus('Pending', true);
      goToFacialSteps();
    } else if (idCapture === false && resultCode === 'ERROR') {
      const currentAttempt = Math.min(idpAttemptCount + 1, MAX_ATTEMPT);
      setAttemptModal(ATTEMPT_MODALS[currentAttempt]);
      await updateIdpAttemptCount(currentAttempt, true);
    } else if (resultCode === 'ERROR') {
      toast.error(errorMessage || 'An unexpected error occurred. Please try again.');
    } else if (!result.success) {
      toast.error(result.message || errorMessage || 'Failed to submit answers');
    }

    setSubmitting(false);
  };

  return (
    <>
      <IdpScreen footer={<IdpButton label="Submit" variant="primary" onPress={handleSubmit} loading={submitting} flex />}>
        <Text style={styles.subtitle}>
          Please answer the following questions based on your credit profile. These questions help verify your identity
          through knowledge-based authentication.
        </Text>

        <IdpAlert variant="info" style={styles.alert}>
          <Text style={styles.alertText}>
            These questions are provided by <Text style={styles.bold}>Experian</Text>, one of the three major credit
            bureaus in the United States. The questions are based on information from your credit report and financial
            history.
          </Text>
        </IdpAlert>

        <Text style={styles.sectionTitle}>Security Questions</Text>
        <Text style={styles.sectionSubtitle}>Please answer the following questions to verify your identity.</Text>

        {questions.length ? (
          <View style={styles.list}>
            {questions.map((question, questionIndex) => (
              <IdpCard key={questionIndex} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{questionIndex + 1}</Text>
                  </View>
                  <Text style={styles.questionText}>{question}</Text>
                </View>

                {(answerSets[questionIndex] || []).length ? (
                  (answerSets[questionIndex] || []).map((option, optionIndex) => {
                    const selected = answers[questionIndex] === option;
                    return (
                      <Pressable
                        key={optionIndex}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => handleAnswerChange(questionIndex, option)}
                      >
                        <MaterialCommunityIcons
                          name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                          size={22}
                          color={selected ? adTokens.primary : adTokens.textMuted}
                        />
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={styles.noOptions}>No options available</Text>
                )}

                {errors[questionIndex] ? <Text style={styles.error}>{errors[questionIndex]}</Text> : null}
              </IdpCard>
            ))}
          </View>
        ) : (
          <Text style={styles.noOptions}>No questions available</Text>
        )}
      </IdpScreen>
      <AttemptModal options={attemptModal} onClose={closeAttemptModal} />
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, lineHeight: 21, color: adTokens.textSecondary, marginBottom: 12 },
  alert: { marginBottom: 18 },
  alertText: { fontSize: 13, lineHeight: 19, color: '#055160' },
  bold: { fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
  sectionSubtitle: { fontSize: 13, color: adTokens.textSecondary, marginTop: 4, marginBottom: 14 },
  list: { gap: 14 },
  questionCard: { padding: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: adTokens.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  questionText: { flex: 1, fontSize: 14.5, fontWeight: '600', lineHeight: 21, color: adTokens.textPrimary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.gray200,
    backgroundColor: adTokens.gray50,
  },
  optionSelected: { backgroundColor: adTokens.primaryLight, borderColor: '#93C5FD' },
  optionText: { flex: 1, fontSize: 14, color: '#334155' },
  optionTextSelected: { color: adTokens.primaryDark, fontWeight: '600' },
  noOptions: { fontSize: 13, color: adTokens.textMuted, textAlign: 'center', paddingVertical: 12 },
  error: { color: '#EF4444', fontSize: 12.5, marginTop: 8 },
});
