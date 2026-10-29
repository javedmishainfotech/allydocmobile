import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getUserDetails } from '../../services/settingsService';
import { getEpcsSuggestions, postReadyToSign, sendEpcs } from '../../services/prescriptionService';
import { adTokens, colors } from '../../theme/colors';

const STEP_NOTICE = 1;
const STEP_PREPARING = 2;
const STEP_TFA = 3;
const STEP_TRANSMITTING = 4;

const STEP_LABELS = {
  [STEP_NOTICE]: 'Electronic Signature Notice',
  [STEP_PREPARING]: 'EPCS Sign-In',
  [STEP_TFA]: 'Two-Factor Authentication',
  [STEP_TRANSMITTING]: 'Transmitting Prescription',
};

/**
 * Port of AllyDocReactApp's EpcsWorkflowModal.jsx / EpcsWorkflowStepper.jsx: a 4-step DEA
 * e-signing flow for already-created controlled-substance prescriptions (signing happens at
 * SEND time, not at add time - see AddPrescriptionPage.jsx's openMedication for the TFA/PIN
 * gate that controls whether a controlled drug can be added at all).
 *
 * This is a regulated workflow: a successful run legally signs and transmits a real
 * prescription to a real pharmacy. Ported field-for-field from web, including that there is
 * no client-side PIN/OTP attempt-limiting (web has none either - whatever lockout exists is
 * enforced server-side; this UI only ever surfaces whatever message the API sends back).
 */
export default function EpcsWorkflowModal({ visible, doseSpotPatientId, appointmentId, prescriptions, onClose, onSent }) {
  const { profile } = useAuth();
  const [step, setStep] = useState(STEP_NOTICE);
  const [prescriberDetails, setPrescriberDetails] = useState(null);
  const [prepErrors, setPrepErrors] = useState([]);
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(STEP_NOTICE);
    setPrepErrors([]);
    setPin('');
    setOtp('');
    setSendError('');
    setSending(false);
    if (profile?.userId) {
      getUserDetails(profile.userId).then((res) => setPrescriberDetails(res.success ? res.data : null));
    }
  }, [visible, profile?.userId]);

  const deaNumber = prescriberDetails?.deaNumbers?.[0]?.deaNumber || 'On file';
  const prescriberName = prescriberDetails?.fullName || profile?.fullName || 'Prescriber';

  const startEpcsFlow = async () => {
    setStep(STEP_PREPARING);
    setPrepErrors([]);
    const suggestionResults = await Promise.all(
      prescriptions.map(async (rx) => {
        const res = await getEpcsSuggestions(doseSpotPatientId, rx.id);
        const suggestions = res.success ? res.data?.EpcsSuggestions : null;
        return {
          prescriptionId: rx.id,
          clinicianReferenceNumberOverrides: {
            OverrideDeaNumber: suggestions?.SuggestedDeaNumber?.DEANumber || '',
            OverrideSupervisorDeaNumber: suggestions?.SuggestedSupervisorDeaNumber?.DEANumber || '',
          },
        };
      }),
    );

    const readyRes = await postReadyToSign(doseSpotPatientId, {
      prescriptions: suggestionResults.map((s) => ({
        prescriptionId: s.prescriptionId,
        ClinicianReferenceNumberOverrides: s.clinicianReferenceNumberOverrides,
      })),
      appointmentId,
    });

    const resultList = Array.isArray(readyRes.data) ? readyRes.data : [];
    const errors = resultList
      .filter((entry) => entry?.Result?.ResultCode === 'ERROR')
      .map((entry, i) => ({
        name: prescriptions[i]?.name || `Prescription ${i + 1}`,
        message: entry.Result?.ResultDescription || 'Unable to prepare this prescription for signing.',
      }));

    if (!readyRes.success || errors.length > 0) {
      setPrepErrors(errors.length > 0 ? errors : [{ name: '', message: readyRes.message || 'Unable to prepare prescriptions for signing.' }]);
      return;
    }
    setStep(STEP_TFA);
  };

  const handleSignAndSend = async () => {
    setSending(true);
    setSendError('');
    setStep(STEP_TRANSMITTING);
    const res = await sendEpcs(doseSpotPatientId, {
      pin: pin.trim(),
      otp: otp.trim(),
      prescriptionIds: prescriptions.map((rx) => rx.id),
      appointmentId,
    });
    setSending(false);
    const resultCode = res.raw?.data?.Result?.ResultCode;
    if (!res.success || resultCode === 'ERROR') {
      setSendError(res.raw?.data?.Result?.ResultDescription || res.message || 'Unable to sign and send this prescription.');
      return;
    }
    onSent();
  };

  const canSubmitTfa = /^\d{4}$/.test(pin) && /^\d{6}$/.test(otp);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={sending ? undefined : onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.stepLabel}>Step {step} of 4</Text>
            <Text style={styles.title}>{STEP_LABELS[step]}</Text>
          </View>
          <Pressable onPress={onClose} disabled={sending} hitSlop={8}>
            <Feather name="x" size={22} color={adTokens.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {step === STEP_NOTICE ? (
            <>
              <View style={styles.prescriberCard}>
                <Text style={styles.prescriberLabel}>Prescriber</Text>
                <Text style={styles.prescriberName}>{prescriberName}</Text>
                <Text style={styles.prescriberLabel}>DEA Number</Text>
                <Text style={styles.prescriberName}>{deaNumber}</Text>
              </View>
              <View style={styles.noticeBox}>
                <Feather name="file-text" size={16} color={adTokens.warningDark} />
                <Text style={styles.noticeText}>
                  By completing the two-factor authentication protocol at this time, you are legally signing the
                  prescription(s) and authorizing the transmission of the above information to the pharmacy for
                  dispensing. The two-factor authentication protocol may only be completed by the practitioner whose
                  name and DEA registration number appear above.
                </Text>
              </View>
              <Text style={styles.rxListTitle}>Prescriptions to sign ({prescriptions.length})</Text>
              {prescriptions.map((rx) => (
                <Text key={rx.id} style={styles.rxListItem}>
                  • {rx.name}
                </Text>
              ))}
            </>
          ) : null}

          {step === STEP_PREPARING ? (
            prepErrors.length > 0 ? (
              <View>
                <Text style={styles.errorTitle}>Unable to prepare these prescriptions for signing:</Text>
                {prepErrors.map((err, i) => (
                  <View key={i} style={styles.errorRow}>
                    {err.name ? <Text style={styles.errorRowName}>{err.name}</Text> : null}
                    <Text style={styles.errorRowMessage}>{err.message}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={adTokens.primary} />
                <Text style={styles.loaderText}>Preparing EPCS sign-in...</Text>
              </View>
            )
          ) : null}

          {step === STEP_TFA ? (
            <>
              <Text style={styles.tfaIntro}>
                Enter your 4-digit prescriber PIN and your 6-digit DUO passcode to sign and transmit the selected
                prescription(s).
              </Text>
              <Text style={styles.fieldLabel}>Prescriber PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="4-digit PIN"
                placeholderTextColor={adTokens.textMuted}
              />
              <Text style={styles.fieldLabel}>DUO Passcode</Text>
              <TextInput
                style={styles.pinInput}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit passcode"
                placeholderTextColor={adTokens.textMuted}
              />
              {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
            </>
          ) : null}

          {step === STEP_TRANSMITTING ? (
            sending ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={adTokens.primary} />
                <Text style={styles.loaderText}>Transmitting prescription...</Text>
              </View>
            ) : sendError ? (
              <View style={styles.loaderWrap}>
                <Feather name="alert-circle" size={32} color={adTokens.danger} />
                <Text style={styles.errorText}>{sendError}</Text>
              </View>
            ) : null
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step === STEP_NOTICE ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={startEpcsFlow}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </Pressable>
            </>
          ) : null}
          {step === STEP_PREPARING && prepErrors.length > 0 ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={startEpcsFlow}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </>
          ) : null}
          {step === STEP_TFA ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, !canSubmitTfa && styles.disabledButton]} disabled={!canSubmitTfa} onPress={handleSignAndSend}>
                <Text style={styles.primaryButtonText}>Sign & Send</Text>
              </Pressable>
            </>
          ) : null}
          {step === STEP_TRANSMITTING && !sending && sendError ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => setStep(STEP_TFA)}>
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: adTokens.white },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  stepLabel: { fontSize: 11, fontWeight: '700', color: adTokens.textMuted, textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginTop: 2 },
  body: { padding: 16 },

  prescriberCard: { backgroundColor: adTokens.gray50, borderRadius: 12, padding: 14, marginBottom: 14, gap: 2 },
  prescriberLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textMuted, textTransform: 'uppercase', marginTop: 6 },
  prescriberName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },

  noticeBox: { flexDirection: 'row', gap: 10, backgroundColor: adTokens.warningLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary, lineHeight: 18 },

  rxListTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
  rxListItem: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 2 },

  loaderWrap: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  loaderText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },

  errorTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.danger, marginBottom: 10 },
  errorRow: { backgroundColor: adTokens.dangerLight, borderRadius: 10, padding: 12, marginBottom: 8 },
  errorRowName: { fontSize: 12.5, fontWeight: '700', color: adTokens.dangerDark },
  errorRowMessage: { fontSize: 12, color: adTokens.dangerDark, marginTop: 2 },
  errorText: { fontSize: 12.5, color: adTokens.danger, textAlign: 'center', marginTop: 8 },

  tfaIntro: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6, marginTop: 10 },
  pinInput: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 18,
    letterSpacing: 6,
    textAlign: 'center',
    color: adTokens.textPrimary,
  },

  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  secondaryButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  secondaryButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  primaryButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
