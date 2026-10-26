import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCard, IdpInfoBox, IdpNumberBadge, IdpBulletList } from './IdpUi';
import { adTokens } from '../../theme/colors';

const STEPS = [
  {
    title: 'Face Recognition Agreement',
    img: require('../../../assets/identity-proofing/facial-step-1.png'),
    points: ['Read through the Facial Recognition Agreement', 'Click LET’S GET STARTED to proceed'],
  },
  {
    title: 'Select Document',
    img: require('../../../assets/identity-proofing/facial-step-2.png'),
    points: ['Select the type of ID document', 'US/Canadian Driver’s License, ID card, or Passport supported'],
  },
  {
    title: 'Scan Document',
    img: require('../../../assets/identity-proofing/facial-step-3.png'),
    points: ['Tap Capture ID photo and align', 'Position ID card properly'],
  },
  {
    title: 'Scan ID Front',
    img: require('../../../assets/identity-proofing/facial-step-4.png'),
    points: ['Scan the front of your ID', "'Success' message confirms correct capture"],
  },
  {
    title: 'Scan ID Back',
    img: require('../../../assets/identity-proofing/facial-step-5.png'),
    points: ['Scan the back of your ID', "'Success' message confirms the back capture"],
  },
  {
    title: 'Verify Photo',
    img: require('../../../assets/identity-proofing/facial-step-6.png'),
    points: ['Follow recommended tips', 'Take a selfie'],
  },
  {
    title: 'Review Details',
    img: require('../../../assets/identity-proofing/facial-step-7.png'),
    points: ["'Success' message confirms your photo", 'Tap Finish Application or retake'],
  },
  {
    title: 'Complete Verification',
    img: require('../../../assets/identity-proofing/facial-step-8.png'),
    points: ['A progress bar confirms all steps', 'Documents are being reviewed'],
  },
];

/** Port of components/IdentityProofing/Step6FacialSteps.jsx - the Experian facial-recognition walkthrough. */
export default function FacialStepsScreen() {
  const { goToOverview } = useIdentityProofing();

  return (
    <IdpScreen footer={<IdpButton label="Back to IDP Page" variant="outline-secondary" onPress={goToOverview} flex />}>
      <IdpInfoBox>
        <Text style={styles.infoBlue}>
          Check SMS notifications from Experian on your phone to complete Identity Proofing...
        </Text>
      </IdpInfoBox>

      <IdpInfoBox icon="alert-outline" tone="warning" style={styles.warning}>
        <Text style={styles.warningTitle}>Before You Continue - Please Read Carefully!</Text>
        <Text style={styles.warningText}>
          These quick guidelines will help you complete the verification process on your mobile phone.
        </Text>
        <Text style={styles.warningText}>
          Below, you will see the steps that are needed to complete IP Facial Recognition on your mobile.
        </Text>
      </IdpInfoBox>

      <View style={styles.list}>
        {STEPS.map((step, index) => (
          <IdpCard key={step.title} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IdpNumberBadge number={index + 1} />
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Image source={step.img} style={styles.image} resizeMode="contain" accessibilityLabel={step.title} />
            <IdpBulletList items={step.points} bulletColor="#0d6efd" textColor="#495057" />
          </IdpCard>
        ))}
      </View>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  infoBlue: { fontSize: 14, lineHeight: 20, color: '#1976D2' },
  warning: { marginTop: 12, marginBottom: 16 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#C62828', marginBottom: 6 },
  warningText: { fontSize: 13.5, lineHeight: 20, color: '#3A3A3A', marginBottom: 4 },
  list: { gap: 14 },
  stepCard: { padding: 14 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#212529' },
  image: { width: '100%', height: 220, marginBottom: 12, borderRadius: 6, backgroundColor: adTokens.gray50 },
});
