import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getQuestionnaire, savePatientQuestionnaire, saveQuestionnaireAnswer } from '../../services/bookingService';
import {
  ACTION_TYPES,
  BOOKING_BEHAVIOR,
  OUTCOME_TYPES,
  getAnswerSupportedData,
  normalizeSettings,
  resolveAnswerAction,
  resolveEffectiveOutcome,
  resolveSafetyRule,
  visibleQuestions,
} from '../../utils/questionnaire/questionnaireTypes';
import { validateAnswer } from '../../utils/questionnaire/questionnaireValidation';
import { mapAnswersToLegacyPayload, formatLegacyAnswerString } from '../../utils/questionnaire/mapAnswersToLegacyPayload';
import QuestionRenderer from './QuestionInputs';
import { ButtonRow, Card, DangerButton, LoadingBlock, PrimaryButton, SecondaryButton, StepHeader, soloButtonStyle } from './BookingUi';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const getSymptomTypeId = (symptom) => (Array.isArray(symptom) ? symptom[0]?.symtomTypeId : symptom?.symtomTypeId);

/** A centred card over a dimmed backdrop - the web's block / warning / review dialogs. */
function OutcomeDialog({ icon, tone, title, message, children }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={[styles.dialogIcon, { backgroundColor: tone.bg }]}>
            <MaterialCommunityIcons name={icon} size={30} color={tone.color} />
          </View>
          <Text style={styles.dialogTitle}>{title}</Text>
          <View style={[styles.dialogMessage, { backgroundColor: tone.bg }]}>
            <Text style={[styles.dialogMessageText, { color: tone.color }]}>{message}</Text>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const TONES = {
  block: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  review: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
};

/**
 * The health questionnaire - port of the web's QuestionnaireWizard: one question at a time, over the
 * questions of the chosen condition (`GET /GetQuestionnaire`). Conditional questions appear and
 * disappear as answers change; every answer is validated and autosaved (`POST /SaveQuestionnaireAnswer`);
 * an answer can show a warning, block the booking or flag it for provider review (answer actions,
 * safety rules, per-option outcomes); the last answer submits the lot (`POST /SavePatientQuestionnaire`).
 * Resuming an abandoned booking rebuilds the answers from the autosave and jumps to the first
 * unanswered question.
 */
export default function QuestionnaireWizard({
  symptomList,
  patientId,
  questionnaireId,
  setQuestionnaireId,
  onNext,
  onPrev,
  onClose,
  resumeSavedAnswers,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loadedQuestionnaireId, setLoadedQuestionnaireId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fieldError, setFieldError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [settings, setSettings] = useState(() => normalizeSettings(null));
  const [warning, setWarning] = useState(null); // a warning the patient must acknowledge
  const [reviewMessage, setReviewMessage] = useState(null); // assessment done, provider reviews first

  useEffect(() => {
    const symptomTypeId = getSymptomTypeId(symptomList);
    if (!symptomTypeId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getQuestionnaire({ symptomTypeId, patientId, existingQuestionnaireId: questionnaireId }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        const nextQuestions = result.data.questions || [];
        const nextQuestionnaireId = result.data.questionnaireId;
        setSettings(normalizeSettings(result.data.settings));
        setQuestions(nextQuestions);
        setLoadedQuestionnaireId(nextQuestionnaireId);
        setQuestionnaireId(nextQuestionnaireId);

        // Resuming: rebuild `answers` from the autosave (matched to questions by sequence number) and
        // jump past every question that already has an answer.
        if (resumeSavedAnswers?.length) {
          const bySequence = new Map(nextQuestions.map((q) => [q.questionSequence, q.questionId]));
          const initialAnswers = {};
          resumeSavedAnswers.forEach((saved) => {
            const questionId = bySequence.get(saved.questionSequence);
            if (questionId == null || !saved.rawAnswerJson) return;
            try {
              initialAnswers[questionId] = JSON.parse(saved.rawAnswerJson);
            } catch {
              // An unparseable autosave row - the question is simply asked again.
            }
          });
          if (Object.keys(initialAnswers).length) {
            setAnswers(initialAnswers);
            const resumedVisible = visibleQuestions(nextQuestions, initialAnswers);
            const firstUnanswered = resumedVisible.findIndex((q) => initialAnswers[q.questionId] === undefined);
            setCurrentIndex(firstUnanswered === -1 ? Math.max(resumedVisible.length - 1, 0) : firstUnanswered);
          }
        }
      } else {
        toast.error(result.message || 'Failed to load questionnaire.');
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Runs once per (condition, patient): questionnaireId / resumeSavedAnswers only matter at first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptomList, patientId]);

  // Conditional questions come and go, so the wizard walks the visible list; currentIndex indexes it.
  const visible = visibleQuestions(questions, answers);
  const currentQuestion = visible[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionId] : undefined;
  const effectiveOutcome = currentQuestion
    ? resolveEffectiveOutcome(currentQuestion, currentAnswer)
    : { outcome: OUTCOME_TYPES.CONTINUE, outcomeMessage: null };

  const handleAnswerChange = (questionId, nextValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...nextValue } }));
    setFieldError('');
  };

  const submitQuestionnaire = async (endComments) => {
    const payload = mapAnswersToLegacyPayload({
      questionnaireId: loadedQuestionnaireId || questionnaireId,
      patientId,
      questions,
      answers,
      endComments,
    });
    setIsSubmitting(true);
    const result = await savePatientQuestionnaire(payload);
    setIsSubmitting(false);
    if (result.success) return true;
    toast.error(result.message || 'Failed to submit questionnaire.');
    return false;
  };

  const handleBlockedClose = async () => {
    if (await submitQuestionnaire(blockMessage || undefined)) onClose?.();
  };

  // Fire-and-forget autosave right after an answer validates; a failure only means a resumed session
  // re-asks that one question, it must never stall the booking.
  const autosaveCurrentAnswer = () => {
    if (!currentQuestion) return;
    const qid = loadedQuestionnaireId || questionnaireId;
    if (!qid) return;
    saveQuestionnaireAnswer({
      questionnaireId: qid,
      patientId,
      questionSequence: currentQuestion.questionSequence,
      question: currentQuestion.question,
      answer: formatLegacyAnswerString(currentQuestion, currentAnswer),
      supportedData: getAnswerSupportedData(currentAnswer),
      rawAnswerJson: JSON.stringify(currentAnswer),
    });
  };

  const handleNextClick = async () => {
    if (!currentQuestion) return;

    const validationError = validateAnswer(currentQuestion, currentAnswer);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    autosaveCurrentAnswer();

    const { outcome, outcomeMessage } = resolveEffectiveOutcome(currentQuestion, currentAnswer);
    if (outcome === OUTCOME_TYPES.BLOCK_BOOKING) {
      setBlockMessage(outcomeMessage || 'Booking cannot continue based on your responses.');
      return;
    }

    // Answer actions run before the safety rule: they are per-answer, so more specific.
    const action = resolveAnswerAction(currentQuestion, currentAnswer);
    if (action) {
      if (action.actionType === ACTION_TYPES.PREVENT_BOOKING || action.actionType === ACTION_TYPES.STOP_ASSESSMENT) {
        setBlockMessage(action.message || currentQuestion.safetyRule?.message || 'Booking cannot continue based on your responses.');
        return;
      }
      if (action.actionType === ACTION_TYPES.WARNING || action.actionType === ACTION_TYPES.INFO_MESSAGE) {
        setWarning({ message: action.message });
        return;
      }
      if (action.actionType === ACTION_TYPES.FLAG_REVIEW) {
        if (await submitQuestionnaire(action.message || undefined)) setReviewMessage(action.message || '');
        return;
      }
      // continue / allow-booking / follow-up fall through (follow-up is the next question's own rule).
    }

    const safety = resolveSafetyRule(currentQuestion, currentAnswer);
    if (safety) {
      if (safety.bookingBehavior === BOOKING_BEHAVIOR.PREVENT) {
        setBlockMessage(safety.message || 'Booking cannot continue based on your responses.');
        return;
      }
      if (safety.bookingBehavior === BOOKING_BEHAVIOR.REVIEW) {
        if (await submitQuestionnaire(safety.message || undefined)) setReviewMessage(safety.message || '');
        return;
      }
      // "continue" still carries a severity: the patient acknowledges it and moves on.
      setWarning({ message: safety.message });
      return;
    }

    const isLastQuestion = currentIndex >= visible.length - 1;
    // allow_booking ends the survey early and goes straight to booking.
    if (outcome === OUTCOME_TYPES.ALLOW_BOOKING || isLastQuestion) {
      if (await submitQuestionnaire()) onNext?.();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setFieldError('');
  };

  // Back: from the first question leaves the questionnaire, otherwise one question back.
  const handlePreviousClick = () => {
    setFieldError('');
    if (currentIndex === 0) {
      onPrev?.();
      return;
    }
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  // Continuing after a warning behaves exactly like a normal Next.
  const advancePastCurrent = async () => {
    setWarning(null);
    if (currentIndex >= visible.length - 1) {
      if (await submitQuestionnaire()) onNext?.();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setFieldError('');
  };

  // Answering can hide later questions and leave currentIndex past the end; clamp it.
  useEffect(() => {
    if (visible.length > 0 && currentIndex > visible.length - 1) setCurrentIndex(visible.length - 1);
  }, [visible.length, currentIndex]);

  if (isLoading || !questions.length || !currentQuestion) {
    return <LoadingBlock text="Loading questions..." />;
  }

  const progressPercent = visible.length > 0 ? Math.round(((currentIndex + 1) / visible.length) * 100) : 0;
  const showSubmitLabel =
    currentIndex >= visible.length - 1 ||
    effectiveOutcome.outcome === OUTCOME_TYPES.ALLOW_BOOKING ||
    effectiveOutcome.outcome === OUTCOME_TYPES.BLOCK_BOOKING;

  return (
    <View>
      <StepHeader
        title={settings.assessmentTitle || 'Health Questionnaire'}
        subtitle={
          settings.patientInstructions ||
          'Please answer the following questions to help us provide you with the best possible care.'
        }
      />

      {settings.showProgress ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressMeta}>
            <Text style={styles.counter}>
              Question {currentIndex + 1} of {visible.length}
            </Text>
            {settings.estimatedTime ? <Text style={styles.eta}>About {settings.estimatedTime}</Text> : null}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      ) : null}

      {blockMessage ? (
        <OutcomeDialog icon="close-octagon-outline" tone={TONES.block} title="Booking cannot continue" message={blockMessage}>
          <DangerButton label="Close" onPress={handleBlockedClose} loading={isSubmitting} style={soloButtonStyle} />
        </OutcomeDialog>
      ) : null}

      {!blockMessage && warning ? (
        <OutcomeDialog
          icon="alert-outline"
          tone={TONES.warning}
          title="Additional medical attention may be required"
          message={warning.message || 'Based on your response, your healthcare provider may need additional information.'}
        >
          <PrimaryButton label="Continue" onPress={advancePastCurrent} loading={isSubmitting} icon={null} style={soloButtonStyle} />
        </OutcomeDialog>
      ) : null}

      {!blockMessage && reviewMessage !== null ? (
        <OutcomeDialog
          icon="clipboard-check-outline"
          tone={TONES.review}
          title="Assessment complete"
          message={
            reviewMessage ||
            'Your responses require review before appointment booking can continue. Your healthcare provider will be in touch.'
          }
        >
          <PrimaryButton
            label="Close"
            onPress={() => {
              setReviewMessage(null);
              onClose?.();
            }}
            loading={isSubmitting}
            icon={null}
            style={soloButtonStyle}
          />
        </OutcomeDialog>
      ) : null}

      <Card>
        {currentQuestion.section ? <Text style={styles.section}>{currentQuestion.section}</Text> : null}
        <Text style={styles.question}>
          {currentQuestion.question}
          {currentQuestion.required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {currentQuestion.helpText ? (
          <View style={styles.help}>
            <MaterialCommunityIcons name="information-outline" size={16} color={adTokens.infoDark} />
            <Text style={styles.helpText}>{currentQuestion.helpText}</Text>
          </View>
        ) : null}
        <QuestionRenderer
          key={currentQuestion.questionId}
          question={currentQuestion}
          value={currentAnswer}
          onChange={(value) => handleAnswerChange(currentQuestion.questionId, value)}
          error={fieldError}
        />
      </Card>

      <ButtonRow>
        {settings.allowGoBack !== false ? (
          <SecondaryButton label="Back" onPress={handlePreviousClick} disabled={isSubmitting} />
        ) : null}
        <PrimaryButton
          label={showSubmitLabel ? 'Submit' : 'Next'}
          icon={showSubmitLabel ? 'check' : 'arrow-right'}
          onPress={handleNextClick}
          loading={isSubmitting}
        />
      </ButtonRow>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBlock: { gap: 6, marginBottom: 12 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  counter: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary },
  eta: { fontSize: 12.5, color: adTokens.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: adTokens.primary },

  section: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, color: adTokens.primary, textTransform: 'uppercase' },
  question: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary, lineHeight: 24 },
  required: { color: adTokens.danger },
  help: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, backgroundColor: adTokens.infoLight },
  helpText: { flex: 1, fontSize: 12.5, color: adTokens.infoDark, lineHeight: 17 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, padding: 20, gap: 12, borderRadius: 20, backgroundColor: adTokens.white, alignItems: 'center' },
  dialogIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary, textAlign: 'center' },
  dialogMessage: { alignSelf: 'stretch', padding: 14, borderRadius: 12 },
  dialogMessageText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
