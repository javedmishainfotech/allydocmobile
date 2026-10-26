import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCard, IdpTextField } from './IdpUi';
import IdpPinModal from './IdpPinModal';
import { tfaActivate, updatePin } from '../../services/identityProofingService';
import { setPin as setPinApi, updateDoseSpotStatus } from '../../services/settingsService';
import { getItem, setItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const digitsOnly = (text, max) => text.replace(/\D/g, '').slice(0, max);

/** Port of Two-Factor-Authentication/Step3Confirm.jsx. */
export default function TfaConfirmScreen() {
  const { goToOverview, updateTfaStatus } = useIdentityProofing();

  const [referenceNumber, setReferenceNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [pinNumber, setPinNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [submittingPin, setSubmittingPin] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedRef, hasPinSet] = await Promise.all([getItem('tfaReferenceNumber'), getItem('hasPinSetForTFA')]);
      setReferenceNumber(storedRef || '');
      setIsPinSet(hasPinSet === '1' || hasPinSet === 'true');
    })();
  }, []);

  const validatePasscode = (value) => {
    if (!value) return 'Passcode is required';
    return value.length !== 6 ? 'Passcode must be 6 digits' : '';
  };

  const validatePin = (value) => {
    if (!value) return 'PIN is required';
    return value.length !== 4 ? 'PIN must be 4 digits' : '';
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    const passcodeError = validatePasscode(passcode);
    const pinError = validatePin(pinNumber);
    if (passcodeError) nextErrors.passcode = passcodeError;
    if (pinError) nextErrors.pinNumber = pinError;
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    const result = await tfaActivate({ oneTimePassword: passcode, pin: pinNumber });

    const apiResult = result.data?.Result || result.data?.result || result.raw?.Result || result.raw?.result || {};
    const resultCode = apiResult.resultCode || apiResult.ResultCode;
    const resultDescription = apiResult.resultDescription || apiResult.ResultDescription || '';
    const isSuccess = resultCode === 'OK' || (!resultCode && result.raw?.status === true);

    if (isSuccess) {
      toast.success('TFA activated successfully');
      try {
        await updateTfaStatus('TFAActivatedSuccess', true);
      } catch {
        console.warn('[identityProofing] failed to update TFA status');
      }
      goToOverview();
    } else if (resultCode === 'ERROR') {
      toast.error(resultDescription || 'Failed to activate TFA. Please try again.');
      setErrors({ submit: resultDescription });
    } else if (!result.success) {
      const message = result.message || resultDescription || 'Failed to confirm TFA. Please try again.';
      toast.error(message);
      setErrors({ submit: message });
    } else {
      toast.error('No response from server. Please try again later.');
      goToOverview();
    }
    setSubmitting(false);
  };

  const markPinSet = async () => {
    try {
      const userId = await getItem('userId');
      await updateDoseSpotStatus({ userId: parseInt(userId || '0', 10), processName: 'TFAPINSET', text: '1' });
    } catch {
      console.warn('[identityProofing] failed to update PIN status');
    }
    await setItem('hasPinSetForTFA', 'true');
    setIsPinSet(true);
    setShowPinModal(false);
  };

  const handleSetPin = async (pin) => {
    setSubmittingPin(true);
    const result = await setPinApi(pin);
    const resultCode = result.data?.result?.resultCode;
    const resultDescription = result.data?.result?.resultDescription;

    if (resultCode === 'OK') {
      toast.success(resultDescription || 'PIN set successfully!');
      await markPinSet();
    } else {
      toast.error(resultDescription || result.message || 'Failed to set PIN. Please try again.');
    }
    setSubmittingPin(false);
  };

  const handleUpdatePin = async ({ currentPin, newPin }) => {
    setSubmittingPin(true);
    const result = await updatePin({ newPIN: newPin, currentPIN: currentPin });
    const resultCode = result.data?.result?.resultCode;
    const resultDescription = result.data?.result?.resultDescription;
    let outcome;

    if (resultCode === 'OK') {
      toast.success(resultDescription || 'PIN updated successfully!');
      await markPinSet();
    } else {
      const oldPinMismatch = (resultDescription || '').toLowerCase().includes('the old pin entered does not match our records');
      const message = oldPinMismatch
        ? 'The old PIN entered does not match our records.'
        : resultDescription || result.message || 'Failed to update PIN. Please try again.';
      toast.error(message);
      if (oldPinMismatch) outcome = { currentPinError: 'PIN do not match. Please try again!' };
    }
    setSubmittingPin(false);
    return outcome;
  };

  const canSubmit = passcode.length === 6 && pinNumber.length === 4;

  return (
    <>
      <IdpScreen
        footer={
          <>
            <IdpButton label="Cancel" variant="outline-secondary" onPress={goToOverview} disabled={submitting} />
            <IdpButton label="Submit" variant="success" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} flex />
          </>
        }
      >
        <Text style={styles.title}>Confirm Information</Text>
        <Text style={styles.subtitle}>
          The DUO app is now synced. For the last step, please confirm the following information below to complete the
          authentication process.
        </Text>

        <IdpCard style={styles.formCard}>
          <IdpTextField label="Reference Number" value={referenceNumber} disabled editable={false} />

          <IdpTextField
            label="Passcode"
            required
            secureToggle
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter 6-digit passcode"
            value={passcode}
            onChangeText={(text) => {
              setPasscode(digitsOnly(text, 6));
              setErrors((prev) => ({ ...prev, passcode: '' }));
            }}
            error={errors.passcode || undefined}
            helper="The passcode can be found in the DUO App"
          />

          <IdpTextField
            label="Pin Number"
            required
            secureToggle
            keyboardType="number-pad"
            maxLength={4}
            placeholder="Enter 4-digit PIN"
            value={pinNumber}
            onChangeText={(text) => {
              setPinNumber(digitsOnly(text, 4));
              setErrors((prev) => ({ ...prev, pinNumber: '' }));
            }}
            error={errors.pinNumber || undefined}
            containerStyle={styles.lastField}
          />
          <Pressable onPress={() => setShowPinModal(true)} hitSlop={8} style={styles.pinLink}>
            <Text style={styles.pinLinkText}>{isPinSet ? 'Update your Pin Number' : 'Set your Pin Number'}</Text>
          </Pressable>

          {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}
        </IdpCard>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Note: After successful submission, your TFA will be activated and you&apos;ll be able to send the prescription for
            controlled substances.
          </Text>
        </View>
      </IdpScreen>

      <IdpPinModal
        visible={showPinModal}
        mode={isPinSet ? 'update' : 'set'}
        isSubmitting={submittingPin}
        onClose={() => setShowPinModal(false)}
        onSave={isPinSet ? handleUpdatePin : handleSetPin}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#3A3A3A', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, color: '#5F6368', textAlign: 'center', marginBottom: 20 },
  formCard: { paddingBottom: 12 },
  lastField: { marginBottom: 4 },
  pinLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  pinLinkText: { fontSize: 13.5, fontWeight: '600', color: '#4688F1', textDecorationLine: 'underline' },
  submitError: { color: '#dc3545', fontSize: 12.5, marginTop: 8 },
  note: { marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: adTokens.gray50 },
  noteText: { fontSize: 12.5, lineHeight: 19, color: '#5F6368' },
});
