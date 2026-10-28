import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SearchableDropdown from './SearchableDropdown';
import { getAllSymptoms, getBookingConsent, recordConsentAcceptance } from '../../services/bookingService';
import { Card, ButtonRow, ErrorText, LoadingBlock, PrimaryButton, SecondaryButton, StepHeader, soloButtonStyle } from './BookingUi';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

// The first steps of the booking flow (web: BookingConsentStep, Step1, MedicalInfoStep,
// BookingResumePrompt, Step5).

const consentDocument = (html) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<style>body{font-family:-apple-system,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;padding:12px;margin:0}` +
  `h1,h2,h3,h4{color:#0f172a}a{color:#2563eb}</style></head><body>${html}</body></html>`;

/** Patient consent: the wording the super admin published is shown (it is html, so in a WebView) and
 * must be accepted - and that acceptance recorded - before the booking continues. */
export function ConsentStep({ onNext, questionnaireId }) {
  const [state, setState] = useState({ loading: true, html: '', error: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const load = async () => {
    setState({ loading: true, html: '', error: '' });
    const result = await getBookingConsent();
    if (!result.success) {
      setState({ loading: false, html: '', error: result.message || 'Could not load the consent text' });
    } else if (!result.html) {
      setState({ loading: false, html: '', error: 'This document has not been published yet.' });
    } else {
      setState({ loading: false, html: result.html, error: '' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isReady = !state.loading && !state.error && Boolean(state.html);

  const submit = async () => {
    // A patient must never be able to accept wording that failed to load.
    if (!isReady) {
      setError('The consent text is not available yet. Please wait or try again.');
      return;
    }
    if (!accepted) {
      setError('You must accept the consent to continue.');
      return;
    }
    setError('');
    // The acceptance is recorded before the flow advances, and a failure stops it: letting a patient
    // book while the record of what they agreed to failed to save would defeat the point of asking.
    setIsRecording(true);
    const result = await recordConsentAcceptance({ questionnaireId });
    setIsRecording(false);
    if (!result.success) {
      const message = result.message || 'We could not record your consent. Please check your connection and try again.';
      toast.error(message);
      setError(message);
      return;
    }
    toast.success(result.message || 'Consent recorded successfully.');
    onNext?.();
  };

  return (
    <View style={styles.consentStep}>
      <StepHeader title="Patient Consent" subtitle="Please review and accept the following before booking your appointment." />
      {/* Plain bordered box (web: .bk-consent-body) - the shadow lives on the screen's own card,
          drawn by BookAppointmentPage around every step, not on this inner box. */}
      <View style={styles.consentBox}>
        {state.loading ? (
          <LoadingBlock text="Loading consent..." />
        ) : state.error ? (
          <View style={styles.consentError}>
            <Text style={styles.consentErrorTitle}>Consent could not be loaded</Text>
            <Text style={styles.consentErrorText}>{state.error}</Text>
            <SecondaryButton label="Try again" onPress={load} style={soloButtonStyle} />
          </View>
        ) : (
          <WebView originWhitelist={['*']} source={{ html: consentDocument(state.html) }} style={styles.consentWeb} />
        )}
      </View>

      <Pressable
        style={[styles.checkRow, !isReady && styles.disabled]}
        disabled={!isReady}
        onPress={() => {
          setAccepted((value) => !value);
          setError('');
        }}
      >
        <MaterialCommunityIcons
          name={accepted ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={accepted ? adTokens.primary : adTokens.textMuted}
        />
        <Text style={styles.checkText}>
          I have read and agree to the Terms &amp; Conditions and Privacy Policy, and consent to proceed with appointment
          booking.
        </Text>
      </Pressable>
      <ErrorText>{error}</ErrorText>

      <ButtonRow>
        <PrimaryButton label="Next" onPress={submit} loading={isRecording} disabled={!accepted || !isReady} />
      </ButtonRow>
    </View>
  );
}

/** Condition / symptom: the patient's primary reason for the consultation (`GET /AllSymptoms`). */
export function ConditionStep({ onNext, onPrev, setSymptomList }) {
  const [symptoms, setSymptoms] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showError, setShowError] = useState(false);

  const load = async () => {
    setLoadError('');
    const result = await getAllSymptoms();
    if (result.success) setSymptoms(Array.isArray(result.data) ? result.data : []);
    else setLoadError(result.message || 'Could not load conditions.');
  };

  useEffect(() => {
    load();
  }, []);

  const options = useMemo(
    () => (symptoms || []).map((symptom) => ({ value: symptom.id, label: symptom.patientDisplayName || symptom.symtom })),
    [symptoms],
  );

  const submit = () => {
    if (selectedId == null) {
      setShowError(true);
      return;
    }
    const chosen = symptoms.find((symptom) => symptom.id === selectedId);
    const label = options.find((option) => option.value === selectedId)?.label;
    // symtomTypeId / symptonName are what the booking and the questionnaire read, so they keep their
    // names; the condition's own details ride along so the medical-info step needs no second fetch.
    setSymptomList({
      symtomTypeId: selectedId,
      symptonName: label,
      patientDisplayName: chosen?.patientDisplayName || label,
      shortDescription: chosen?.shortDescription || '',
      medicalInfo: Array.isArray(chosen?.medicalInfo) ? chosen.medicalInfo : [],
      assessmentEnabled: chosen?.assessmentEnabled ?? true,
      assessmentRequired: chosen?.assessmentRequired ?? false,
    });
    onNext();
  };

  return (
    <View>
      <StepHeader title="Appointment Details" subtitle="Please select your primary reason for consultation" />
      {loadError ? (
        <Card>
          <Text style={styles.consentErrorText}>{loadError}</Text>
          <SecondaryButton label="Try again" onPress={load} style={soloButtonStyle} />
        </Card>
      ) : symptoms == null ? (
        <LoadingBlock text="Loading conditions..." />
      ) : (
        <>
          <Card>
            <Text style={styles.fieldTitle}>
              Condition / Symptom <Text style={styles.required}>*</Text>
            </Text>
            <SearchableDropdown
              placeholder="Select a condition..."
              options={options}
              value={selectedId}
              onChange={(value) => {
                setSelectedId(value);
                setShowError(false);
              }}
              error={showError ? 'Please select at least one symptom.' : undefined}
            />
          </Card>
          <ButtonRow>
            {onPrev ? <SecondaryButton label="Back" onPress={onPrev} /> : null}
            <PrimaryButton label="Continue" onPress={submit} />
          </ButtonRow>
        </>
      )}
    </View>
  );
}

// Bullet dot before a list item - blue for a section's own top-level items (web:
// .bk-medinfo__list--primary li::before, #60A5FA), neutral grey for a subsection's nested items
// (web: .bk-medinfo__list li::before, #94A3B8, which is exactly adTokens.textMuted).
function MedicalListItem({ text, primary }) {
  return (
    <View style={styles.medListItem}>
      <View style={[styles.medBullet, { backgroundColor: primary ? '#60A5FA' : adTokens.textMuted }]} />
      <Text style={styles.medItem}>{text}</Text>
    </View>
  );
}

function MedicalSection({ section, isLast }) {
  const items = section.items ?? [];
  const subsections = section.subsections ?? [];
  return (
    <View style={[styles.medSection, isLast && styles.medSectionLast]}>
      {/* Blue rule before the heading (web: .bk-medinfo__section-title::before), so sections read
          as a scannable outline. */}
      <View style={styles.medSectionTitleRow}>
        <View style={styles.medSectionBar} />
        <Text style={styles.medTitle}>{section.title}</Text>
      </View>
      {section.body ? <Text style={styles.medBody}>{section.body}</Text> : null}
      {subsections.map((sub, index) => (
        <View key={index} style={styles.medSub}>
          <Text style={styles.medSubTitle}>{sub.title}</Text>
          {(sub.items ?? []).map((item, j) => (
            <MedicalListItem key={j} text={item} />
          ))}
        </View>
      ))}
      {items.map((item, j) => (
        <MedicalListItem key={j} text={item} primary />
      ))}
    </View>
  );
}

/** Reference information about the chosen condition, written per condition by a super admin. It
 * skips itself when there is nothing to show (an empty card with a Continue button would be worse).
 * Styling matches the web's `.bk-medinfo__*` rules (components.css) at its own phone breakpoint. */
export function MedicalInfoStep({ symptomList, onNext, onPrev }) {
  const { height: windowHeight } = useWindowDimensions();
  const condition = Array.isArray(symptomList) ? symptomList[0] : symptomList;
  const sections = (condition?.medicalInfo ?? []).filter(
    (section) => section?.title || section?.body || section?.items?.length || section?.subsections?.length,
  );
  const shortDescription = condition?.shortDescription || '';
  const hasContent = sections.length > 0 || Boolean(shortDescription);

  useEffect(() => {
    if (!hasContent) onNext?.();
  }, [hasContent, onNext]);

  if (!hasContent) return null;

  return (
    <View>
      {/* Plain bordered box (web: .bk-medinfo__card { overflow: hidden }) - the shadow lives on the
          screen's own card, drawn by BookAppointmentPage around every step, not on this inner box. */}
      <View style={styles.medCard}>
        {/* Dark-blue hero band (web: bk-medinfo__hero, linear-gradient 135deg #2563EB -> #1D4ED8). */}
        <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medHeroBand}>
          <Text style={styles.medLabel}>MEDICAL INFORMATION</Text>
          <Text style={styles.medHero}>{condition?.patientDisplayName || condition?.symptonName || 'About this condition'}</Text>
          <Text style={styles.medHeroSubtitle}>
            Please read the following information carefully before proceeding with your health questionnaire.
          </Text>
        </LinearGradient>

        {/* Capped and scrollable (web: 38vh on phones), so a long condition's text never pushes the
            Continue button off screen; the acknowledgement note stays fixed below it. */}
        <ScrollView style={{ maxHeight: windowHeight * 0.38 }} nestedScrollEnabled contentContainerStyle={styles.medScroll}>
          {sections.length > 0 ? (
            sections.map((section, index) => (
              <MedicalSection key={index} section={section} isLast={index === sections.length - 1} />
            ))
          ) : (
            <Text style={styles.medBody}>{shortDescription}</Text>
          )}
        </ScrollView>

        <View style={styles.ack}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#92400E" />
          <Text style={styles.ackText}>
            Continuing confirms you have read and understood this information. It is general guidance, not a
            diagnosis or a treatment plan.
          </Text>
        </View>
      </View>
      <ButtonRow>
        <SecondaryButton label="Back" onPress={onPrev} />
        <PrimaryButton label="I have read this" onPress={onNext} />
      </ButtonRow>
    </View>
  );
}

/** Shown instead of the first step when the patient has an abandoned booking still in progress. */
export function ResumePrompt({ attempt, onContinue, onStartNew, isDismissing }) {
  const startedOn = attempt?.startedOn ? new Date(attempt.startedOn) : null;
  return (
    <View>
      <StepHeader
        title="Continue your previous booking?"
        subtitle={`${
          attempt?.symptomName ? `You started booking an appointment for "${attempt.symptomName}"` : 'You started booking an appointment'
        }${startedOn ? ` on ${startedOn.toLocaleDateString()}` : ''} but did not finish it.`}
      />
      <Card>
        <Text style={styles.medBody}>
          Would you like to continue from where you left off, or start a new booking instead?
        </Text>
      </Card>
      <ButtonRow>
        <SecondaryButton label="Start New" onPress={onStartNew} disabled={isDismissing} />
        <PrimaryButton label="Continue" onPress={onContinue} disabled={isDismissing} />
      </ButtonRow>
    </View>
  );
}

/** Last step: the request is in, the doctor will accept it. */
export function SuccessStep({ onClose }) {
  return (
    <View style={styles.success}>
      <View style={styles.successIcon}>
        <MaterialCommunityIcons name="check" size={44} color={adTokens.successDark} />
      </View>
      <Text style={styles.successTitle}>Booking Successful!</Text>
      <Text style={styles.medBody}>Your appointment has been submitted successfully.</Text>
      <View style={styles.successNote}>
        <Text style={styles.successNoteText}>You will be notified once the Doctor has accepted your appointment request.</Text>
      </View>
      <ButtonRow>
        <PrimaryButton label="Close" onPress={onClose} icon={null} />
      </ButtonRow>
    </View>
  );
}

const styles = StyleSheet.create({
  consentStep: { flex: 1 },
  consentBox: {
    flex: 1,
    minHeight: 320,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: adTokens.border,
    overflow: 'hidden',
    backgroundColor: adTokens.gray50,
  },
  consentWeb: { flex: 1, backgroundColor: 'transparent' },
  consentError: { padding: 18, gap: 10, alignItems: 'center' },
  consentErrorTitle: { fontSize: 15, fontWeight: '700', color: adTokens.danger },
  consentErrorText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
  checkText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19 },
  disabled: { opacity: 0.5 },

  fieldTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  required: { color: adTokens.danger },

  medCard: {
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    overflow: 'hidden',
  },
  // Dark-blue hero band - web: .bk-medinfo__hero, phone breakpoint (<=575.98px) padding/sizes.
  medHeroBand: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  medLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  medHero: { fontSize: 19, fontWeight: '700', lineHeight: 24, letterSpacing: -0.3, color: adTokens.white },
  medHeroSubtitle: { fontSize: 13.5, lineHeight: 20, color: 'rgba(255,255,255,0.88)' },

  // Scrollable body - web: .bk-medinfo__scroll, phone breakpoint padding.
  medScroll: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 4 },
  medBody: { fontSize: 14, lineHeight: 23, color: '#334155', marginBottom: 10 },
  medSection: { marginBottom: 20 },
  medSectionLast: { marginBottom: 8 },
  medSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  medSectionBar: { width: 3, height: 15, borderRadius: 999, backgroundColor: adTokens.primary },
  medTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#1D4ED8' },
  // Nested under a section heading - web: .bk-medinfo__sub (left rule, indent).
  medSub: { marginLeft: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: adTokens.gray200, marginBottom: 10 },
  medSubTitle: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 4 },
  medListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  medBullet: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8 },
  medItem: { flex: 1, fontSize: 14, lineHeight: 22, color: '#334155' },

  // Acknowledgement note - web: .bk-medinfo__ack (amber, sits fixed below the scroll area).
  ack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
  },
  ackText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: '#92400E' },

  success: { alignItems: 'center', gap: 10, paddingTop: 24 },
  successIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: adTokens.successLight, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: adTokens.textPrimary },
  successNote: { alignSelf: 'stretch', padding: 14, borderRadius: 12, backgroundColor: adTokens.primaryLight },
  successNoteText: { fontSize: 13.5, color: adTokens.primaryDark, textAlign: 'center', lineHeight: 19 },
});
