import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IdpSelectField } from '../identityProofing/IdpUi';
import { getAllSymptoms, getBookingConsent, recordConsentAcceptance } from '../../services/bookingService';
import { Card, ButtonRow, ErrorText, LoadingBlock, PrimaryButton, SecondaryButton, StepHeader } from './BookingUi';
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
    <View>
      <StepHeader title="Patient Consent" subtitle="Please review and accept the following before booking your appointment." />
      <View style={styles.consentBox}>
        {state.loading ? (
          <LoadingBlock text="Loading consent..." />
        ) : state.error ? (
          <View style={styles.consentError}>
            <Text style={styles.consentErrorTitle}>Consent could not be loaded</Text>
            <Text style={styles.consentErrorText}>{state.error}</Text>
            <SecondaryButton label="Try again" onPress={load} />
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
          <SecondaryButton label="Try again" onPress={load} />
        </Card>
      ) : symptoms == null ? (
        <LoadingBlock text="Loading conditions..." />
      ) : (
        <>
          <Card>
            <Text style={styles.fieldTitle}>
              Condition / Symptom <Text style={styles.required}>*</Text>
            </Text>
            <IdpSelectField
              placeholder="Select a condition..."
              searchable
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

function MedicalSection({ section }) {
  const items = section.items ?? [];
  const subsections = section.subsections ?? [];
  return (
    <View style={styles.medSection}>
      <Text style={styles.medTitle}>{section.title}</Text>
      {section.body ? <Text style={styles.medBody}>{section.body}</Text> : null}
      {subsections.map((sub, index) => (
        <View key={index} style={styles.medSub}>
          <Text style={styles.medSubTitle}>{sub.title}</Text>
          {(sub.items ?? []).map((item, j) => (
            <Text key={j} style={styles.medItem}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
      {items.map((item, j) => (
        <Text key={j} style={styles.medItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

/** Reference information about the chosen condition, written per condition by a super admin. It
 * skips itself when there is nothing to show (an empty card with a Continue button would be worse). */
export function MedicalInfoStep({ symptomList, onNext, onPrev }) {
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
      <Card>
        <Text style={styles.medLabel}>MEDICAL INFORMATION</Text>
        <Text style={styles.medHero}>{condition?.patientDisplayName || condition?.symptonName || 'About this condition'}</Text>
        <Text style={styles.medBody}>
          Please read the following information carefully before proceeding with your health questionnaire.
        </Text>
        {sections.length > 0 ? (
          sections.map((section, index) => <MedicalSection key={index} section={section} />)
        ) : (
          <Text style={styles.medBody}>{shortDescription}</Text>
        )}
        <View style={styles.ack}>
          <MaterialCommunityIcons name="information-outline" size={16} color={adTokens.infoDark} />
          <Text style={styles.ackText}>
            Continuing confirms you have read and understood this information. It is general guidance, not a diagnosis
            or a treatment plan.
          </Text>
        </View>
      </Card>
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
  consentBox: { height: 320, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, overflow: 'hidden', backgroundColor: adTokens.white },
  consentWeb: { flex: 1, backgroundColor: 'transparent' },
  consentError: { padding: 18, gap: 10, alignItems: 'center' },
  consentErrorTitle: { fontSize: 15, fontWeight: '700', color: adTokens.danger },
  consentErrorText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
  checkText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19 },
  disabled: { opacity: 0.5 },

  fieldTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  required: { color: adTokens.danger },

  medLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, color: adTokens.primary },
  medHero: { fontSize: 20, fontWeight: '800', color: adTokens.textPrimary },
  medBody: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19 },
  medSection: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: adTokens.border },
  medTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  medSub: { gap: 4, marginTop: 4 },
  medSubTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.primaryDark },
  medItem: { fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19 },
  ack: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, backgroundColor: adTokens.infoLight },
  ackText: { flex: 1, fontSize: 12.5, color: adTokens.infoDark, lineHeight: 17 },

  success: { alignItems: 'center', gap: 10, paddingTop: 24 },
  successIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: adTokens.successLight, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: adTokens.textPrimary },
  successNote: { alignSelf: 'stretch', padding: 14, borderRadius: 12, backgroundColor: adTokens.primaryLight },
  successNoteText: { fontSize: 13.5, color: adTokens.primaryDark, textAlign: 'center', lineHeight: 19 },
});
