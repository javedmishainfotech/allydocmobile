import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCard, IdpCheckbox, IdpTextField } from './IdpUi';
import { sendMobileTfa } from '../../services/identityProofingService';
import { toast } from '../../utils/toast';

const validatePhoneNumber = (digits) => {
  if (!digits) return 'Mobile phone number is required';
  if (digits.length < 10) return 'Please enter a valid mobile phone number';
  return '';
};

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={18} color="#4688F1" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** Port of Two-Factor-Authentication/Step1ActivationText.jsx. */
export default function TfaActivationScreen() {
  const { navigate, goToOverview, updateTfaStatus } = useIdentityProofing();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsAgreement, setSmsAgreement] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handlePhoneChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digits);
    setErrors((prev) => ({ ...prev, phoneNumber: validatePhoneNumber(digits) }));
  };

  const handleAgreementChange = (checked) => {
    setSmsAgreement(checked);
    setErrors((prev) => ({ ...prev, smsAgreement: checked ? '' : 'You must agree to receive SMS messages' }));
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    const phoneError = validatePhoneNumber(phoneNumber);
    if (phoneError) nextErrors.phoneNumber = phoneError;
    if (!smsAgreement) nextErrors.smsAgreement = 'You must agree to receive SMS messages';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    const result = await sendMobileTfa({ mobilePhoneNumber: phoneNumber });
    const resultCode = result.data?.result?.resultCode;

    if (result.raw?.status === true && resultCode === 'OK') {
      toast.success(result.message || 'TFA activation texts sent successfully!');
      try {
        await updateTfaStatus('Pending', true);
        toast.success('TFA status updated: Pending');
      } catch {
        console.warn('[identityProofing] failed to update TFA status');
      }
      navigate('tfa-guide');
    } else {
      setErrors((prev) => ({
        ...prev,
        phoneNumber:
          result.message ||
          result.data?.result?.resultDescription ||
          'Failed to send TFA activation texts. Please try again.',
      }));
    }
    setSubmitting(false);
  };

  return (
    <IdpScreen
      footer={
        <>
          <IdpButton label="Cancel" variant="outline-danger" onPress={goToOverview} disabled={submitting} />
          <IdpButton
            label="Send Me DUO Activation Texts"
            variant="success"
            icon="phone"
            onPress={handleSubmit}
            loading={submitting}
            flex
          />
        </>
      }
    >
      <View style={styles.gettingStarted}>
        <SectionHeader icon="check-circle" title="Getting Started" />
        <Text style={styles.sectionText}>Please confirm the following information below to begin this process.</Text>
        <Text style={styles.sectionText}>
          Upon clicking the &quot;<Text style={styles.bold}>Send Me DUO Activation Texts</Text>&quot; button, you will receive two
          text messages:
        </Text>
        <Text style={styles.sectionText}>1: First text will contain a link for downloading the DUO Mobile app</Text>
        <Text style={styles.sectionText}>2: Second text will link your device to the DoseSpot System</Text>
      </View>

      <IdpCard>
        <SectionHeader icon="phone" title="DUO Mobile Phone Information" />

        <View style={styles.important}>
          <MaterialCommunityIcons name="alert" size={20} color="#FF9800" style={styles.importantIcon} />
          <Text style={styles.importantText}>
            <Text style={styles.importantStrong}>Important:</Text> Enter a{' '}
            <Text style={styles.importantStrong}>valid mobile phone number</Text>. Do not enter a clinic phone number or
            landline. This must be a mobile number that can{' '}
            <Text style={styles.importantStrong}>receive SMS text messages</Text>.
          </Text>
        </View>

        <IdpTextField
          label="Mobile Phone Number"
          required
          prefix="+1"
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          error={errors.phoneNumber}
          containerStyle={styles.fieldTight}
        />
        <View style={styles.helpRow}>
          <MaterialCommunityIcons name="message-text" size={14} color="#6c757d" />
          <Text style={styles.helpText}>This phone number will be used for DUO activation and verification</Text>
        </View>

        <IdpCheckbox checked={smsAgreement} onChange={handleAgreementChange} error={errors.smsAgreement}>
          I agree to receive text messages via SMS and accept any fees from my mobile provider. Standard message and
          data rates may apply.
        </IdpCheckbox>
      </IdpCard>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  gettingStarted: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  sectionText: { fontSize: 14, lineHeight: 21, color: '#5F6368', marginBottom: 8 },
  bold: { fontWeight: '700' },
  important: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: 4,
  },
  importantIcon: { marginTop: 1 },
  importantText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#5F6368' },
  importantStrong: { fontWeight: '700', color: '#333' },
  fieldTight: { marginBottom: 8 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  helpText: { flex: 1, fontSize: 12, color: '#6c757d' },
});
