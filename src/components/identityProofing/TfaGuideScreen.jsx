import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCard, IdpInfoBox, IdpNumberBadge, IdpBulletList } from './IdpUi';
import { adTokens } from '../../theme/colors';

const STEPS = [
  {
    number: 1,
    title: 'Face Recognition Agreement',
    image: require('../../../assets/identity-proofing/tfa-step-1.png'),
    description: [
      'Complete Identity Proofing verification first',
      'Click "START TFA SETUP" button from your dashboard',
      'Enter your mobile number to begin activation',
    ],
  },
  {
    number: 2,
    title: 'Select Document',
    image: require('../../../assets/identity-proofing/tfa-step-2.png'),
    description: [
      'You will receive a text message with download link',
      'Download and install the DUO Mobile app from App Store or Google Play',
      'Open the app once installed',
    ],
  },
  {
    number: 3,
    title: 'Scan Document',
    image: require('../../../assets/identity-proofing/tfa-step-3.png'),
    description: [
      "You'll receive a second text with activation link",
      'Click the activation link to connect DUO Mobile to your account',
      'Account Name defaults to DoseSpot (you may change this)',
      'Enter your name and click Next',
    ],
  },
  {
    number: 4,
    title: 'Scan ID Front',
    image: require('../../../assets/identity-proofing/tfa-step-4.png'),
    description: [
      'The Reference Number will be displayed and pre-populated',
      'Verify the number matches your verification session',
    ],
  },
  {
    number: 5,
    title: 'Scan ID Back',
    image: require('../../../assets/identity-proofing/tfa-step-5.png'),
    description: [
      'Open DUO Mobile app on your phone',
      'Find the 6-digit passcode displayed in the app',
      'Enter the passcode in the authentication prompt',
      "If you have a PIN for prescriptions, enter it now. Otherwise, you'll create one",
    ],
  },
  {
    number: 6,
    title: 'Verify Photo',
    image: require('../../../assets/identity-proofing/tfa-step-6.png'),
    description: [
      "A message bar shows you're showing all steps completed or processing",
      'You can safely skip the tutorial or continue with other tasks',
      'Your documents are now being reviewed',
    ],
  },
];

/** Port of Two-Factor-Authentication/Step2Guide.jsx. */
export default function TfaGuideScreen() {
  const { navigate } = useIdentityProofing();

  return (
    <IdpScreen footer={<IdpButton label="Next" variant="success" onPress={() => navigate('tfa-confirm')} flex />}>
      <Text style={styles.title}>Two-Factor Authentication (TFA)</Text>
      <Text style={styles.subtitle}>
        Follow the steps below to complete DUO Mobile activation for secure Two-Factor Authentication
      </Text>

      <IdpInfoBox style={styles.infoBar}>
        <Text style={styles.infoText}>
          Check SMS notifications from Experian on your phone to complete Two-Factor Authentication....
        </Text>
      </IdpInfoBox>

      <View style={styles.list}>
        {STEPS.map((step) => (
          <IdpCard key={step.number} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IdpNumberBadge number={step.number} size={38} />
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <View style={styles.imageWrap}>
              <Image source={step.image} style={styles.image} resizeMode="contain" accessibilityLabel={step.title} />
            </View>
            <IdpBulletList items={step.description} bulletColor="#3B82F6" textColor="#5F6368" />
          </IdpCard>
        ))}
      </View>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#3A3A3A', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 21, color: '#5F6368', marginBottom: 16 },
  infoBar: { marginBottom: 20, backgroundColor: '#E3F2FD', borderColor: '#E3F2FD' },
  infoText: { fontSize: 14, lineHeight: 20, color: '#3A3A3A' },
  list: { gap: 14 },
  stepCard: { padding: 14 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#3A3A3A' },
  imageWrap: {
    marginVertical: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  image: { width: '100%', height: 190, backgroundColor: adTokens.gray50 },
});
