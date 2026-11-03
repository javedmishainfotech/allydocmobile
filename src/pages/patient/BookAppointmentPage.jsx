import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { usePatientDashboard } from '../../hooks/usePatientDashboard';
import { dismissBookingAttempt } from '../../services/bookingService';
import { getItem } from '../../utils/storage';
import { LoadingBlock } from '../../components/booking/BookingUi';
import QuestionnaireWizard from '../../components/booking/QuestionnaireWizard';
import { ConsentStep, ConditionStep, MedicalInfoStep, ResumePrompt, SuccessStep } from '../../components/booking/BookingSteps';
import { DateTimeStep, PaymentStep } from '../../components/booking/BookingPaymentSteps';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

export const BOOK_APPOINTMENT_ROUTE = 'BookAppointment';

// Where each tracked CurrentStep lands the patient back in `views` on resume - "Questionnaire" and
// "DateTime" are the only two the backend records past consent, so Consent is the catch-all fallback.
// (Indices into the view list, exactly as the web does - a freelancer's list has no date/time step.)
const RESUME_STEP_INDEX = { Consent: 1, Questionnaire: 3, DateTime: 4 };

/**
 * Book Appointment - port of AllyDocReactApp's BookAppointmentModal wizard, as a full screen:
 * consent -> condition -> medical information -> questionnaire -> date & time (clinic / hospital
 * patients only; a freelancer's doctor sets the time) -> payment -> success. An abandoned booking
 * found on open can be continued exactly where it stopped, or dismissed.
 */
export default function BookAppointmentPage() {
  const bottomSafe = useBottomSafeSpacing();
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = useAuth();
  const { loadPendingPayment } = usePatientDashboard();
  const patientId = route.params?.patientId || profile?.userId;
  const isFreelancer = String(profile?.userType || '').toLowerCase() === 'freelancer';
  // "Pay now" for a booking a staff member started for the patient: straight to the payment step.
  const payOnlyQuestionnaireId = route.params?.paymentQuestionnaireId;

  // The step list: consent, condition, medical info, questionnaire, [date/time], payment, success.
  const views = useMemo(() => {
    const list = ['consent', 'condition', 'medicalInfo', 'questionnaire', 'dateTime', 'payment', 'success'];
    return isFreelancer ? list.filter((view) => view !== 'dateTime') : list;
  }, [isFreelancer]);

  const [currentIndex, setCurrentIndex] = useState(() => (payOnlyQuestionnaireId ? views.indexOf('payment') : 0));
  const [symptomList, setSymptomList] = useState(null);
  const [questionnaireId, setQuestionnaireId] = useState(payOnlyQuestionnaireId);
  const [resumeSavedAnswers, setResumeSavedAnswers] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [pendingAttempt, setPendingAttempt] = useState(null);
  const [resumeResolved, setResumeResolved] = useState(Boolean(payOnlyQuestionnaireId));
  const [isDismissing, setIsDismissing] = useState(false);

  const handleNext = useCallback(() => setCurrentIndex((prev) => Math.min(prev + 1, views.length - 1)), [views.length]);
  const handlePrev = useCallback(() => setCurrentIndex((prev) => Math.max(prev - 1, 0)), []);
  const close = useCallback(() => navigation.goBack(), [navigation]);

  useEffect(() => {
    getItem('auth_token').then(setAuthToken);
  }, []);

  // Every open of this screen is a fresh mount, so a mount-time check is enough.
  useEffect(() => {
    if (payOnlyQuestionnaireId) return;
    if (!patientId) {
      setResumeResolved(true);
      return;
    }
    loadPendingPayment(patientId)
      .then((attempt) => {
        if (attempt?.attemptId) setPendingAttempt(attempt);
        else setResumeResolved(true);
      })
      .catch(() => setResumeResolved(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, payOnlyQuestionnaireId]);

  const handleContinueResume = () => {
    if (!pendingAttempt) return;
    if (pendingAttempt.symptomId) {
      setSymptomList({ symtomTypeId: pendingAttempt.symptomId, symptonName: pendingAttempt.symptomName || '' });
    }
    if (pendingAttempt.patientQuestionnaireId) setQuestionnaireId(pendingAttempt.patientQuestionnaireId);
    setResumeSavedAnswers(pendingAttempt.savedAnswers || []);
    setCurrentIndex(Math.min(RESUME_STEP_INDEX[pendingAttempt.currentStep] ?? 0, views.length - 1));
    setResumeResolved(true);
  };

  const handleStartNew = async () => {
    if (!pendingAttempt) {
      setResumeResolved(true);
      return;
    }
    setIsDismissing(true);
    await dismissBookingAttempt(pendingAttempt.attemptId, patientId);
    setIsDismissing(false);
    setPendingAttempt(null);
    setResumeResolved(true);
  };

  // The consent step's own text needs most of the screen to read comfortably, so it gets a
  // non-scrolling flex container (its WebView scrolls internally) instead of the ScrollView every
  // other step uses.
  const isConsentStep = resumeResolved && !pendingAttempt && views[currentIndex] === 'consent';

  const renderStep = () => {
    if (!resumeResolved && !pendingAttempt) return <LoadingBlock text="Loading..." />;
    if (pendingAttempt && !resumeResolved) {
      return (
        <ResumePrompt
          attempt={pendingAttempt}
          onContinue={handleContinueResume}
          onStartNew={handleStartNew}
          isDismissing={isDismissing}
        />
      );
    }
    switch (views[currentIndex]) {
      case 'consent':
        return <ConsentStep onNext={handleNext} questionnaireId={questionnaireId} />;
      case 'condition':
        return <ConditionStep onNext={handleNext} onPrev={handlePrev} setSymptomList={setSymptomList} />;
      case 'medicalInfo':
        return <MedicalInfoStep symptomList={symptomList} onNext={handleNext} onPrev={handlePrev} />;
      case 'questionnaire':
        return (
          <QuestionnaireWizard
            symptomList={symptomList}
            patientId={patientId}
            questionnaireId={questionnaireId}
            setQuestionnaireId={setQuestionnaireId}
            resumeSavedAnswers={resumeSavedAnswers}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={close}
          />
        );
      case 'dateTime':
        return <DateTimeStep questionnaireId={questionnaireId} onNext={handleNext} />;
      case 'payment':
        return <PaymentStep questionnaireId={questionnaireId} authToken={authToken} onNext={handleNext} />;
      case 'success':
        return <SuccessStep onClose={close} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Stepper dots (web: .bk-stepper) */}
      <View style={styles.stepper}>
        {views.map((view, index) => (
          <View
            key={view}
            style={[styles.dot, index < currentIndex && styles.dotDone, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>
      {/* One screen-level card holds everything the current step renders (header, fields, buttons) -
          web: the modal's `.bk-card` + `.bk-card-body`, not a shadow/border on each inner section. */}
      {isConsentStep ? (
        <View style={[styles.consentContent, { paddingBottom: 12 + bottomSafe }]}>
          <View style={[styles.screenCard, styles.flex1]}>{renderStep()}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + bottomSafe }]} keyboardShouldPersistTaps="handled">
          <View style={styles.screenCard}>{renderStep()}</View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 12, paddingBottom: 32 },
  consentContent: { flex: 1, padding: 12 },
  // Web: .bk-card (white, rounded, bordered, two-layer shadow) + .bk-card-body (padding, mobile
  // breakpoint 20px/16px).
  screenCard: {
    padding: 16,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: adTokens.white,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  stepper: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 14 },
  dot: { width: 28, height: 6, borderRadius: 3, backgroundColor: adTokens.border },
  dotDone: { backgroundColor: adTokens.primaryLight },
  dotActive: { backgroundColor: adTokens.primary },
});
