import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCard, IdpNumberBadge, IdpBulletList } from './IdpUi';
import { openExternalLink } from '../../utils/openExternalLink';
import { adTokens } from '../../theme/colors';

const ID_ME_URL = 'https://id.me/';
const ID_ME_MULTIPLE_ACCOUNTS_URL =
  'https://help.id.me/hc/en-us/articles/1500002444141-What-to-do-if-you-have-multiple-ID-me-accounts';
const ID_ME_SUPPORT_URL = 'https://help.id.me/hc/en-us/articles/4404402156311-Verifying-for-EPCS-and-eRx';

const REQUIREMENTS = [
  'A smartphone that has a camera or a computer with a webcam',
  'Email address',
  'Social Security Number',
  "Government issued photo ID (driver's license, state ID, passport, or passport card)",
  'Medical credentials (National Provider Identifier number, Drug Enforcement Administration number, or DEA schedule)',
];

const STEPS = [
  {
    number: 1,
    title: 'Create or Sign In',
    content: [
      'Select the verification link provided from DoseSpot',
      'Click "Verify with ID.me" button on landing page',
      'Sign in with existing ID.me account or create a new one',
      'Note: Do not create more than one ID.me account',
      "If you don't have an ID.me account, then create one to continue",
    ],
  },
  {
    number: 2,
    title: 'Create Account and Set Up MFA',
    content: [
      'Enter your email address, password. Create account and confirm email address',
      'Select Multi-Factor Authentication (MFA) method to protect your account and for future login',
      'MFA method options include: Push Notification, Authenticator App, Security Key, or Passkey',
      'Tip: Setting MFA for the first time, make sure to Save your recovery code for every time account access',
    ],
  },
  {
    number: 3,
    title: 'Verify Your Identity',
    content: [
      'Choose verification method by selecting which photo ID to upload',
      "Acceptable documents: driver's license, state ID, passport, passport card",
      'Upload clear photos of front and back of document',
    ],
  },
  {
    number: 4,
    title: 'Phone Verification',
    content: [
      'Enter your phone number when prompted',
      'ID.me will send a confirmation text with 5-digit code',
      'Select the link in the text message to continue verification',
    ],
  },
  {
    number: 5,
    title: 'Review Information',
    content: [
      'Review your information carefully',
      'Give consent for data to be shared with DoseSpot',
      'Select "Confirm" to proceed',
    ],
  },
  {
    number: 6,
    title: 'Medical Credentials',
    content: [
      'Enter NPI number (National Provider Identifier)',
      'Enter DEA number (only required for EPCS)',
      'Enter DEA schedule (only required for EPCS)',
      'Note: Two separate links - one for DEA, one for non-DEA prescribing',
    ],
  },
  {
    number: 7,
    title: 'Share Information',
    content: [
      'Select "Allow" to share information with DoseSpot',
      'After this step, verification is complete',
      'Your screen will update automatically',
      'You will receive a confirmation email from ID.me',
    ],
  },
  {
    number: 8,
    title: 'Trusted Referee (If Needed)',
    content: [
      "If automated verification fails, you'll be routed to a video call with a Trusted Referee",
      'Upload photos of your identity documents',
      'Take and submit a video selfie',
      'Enter Social Security Number if creating new account',
    ],
  },
  {
    number: 9,
    title: 'Verification Complete',
    content: [
      'You will see a DoseSpot verification confirmation screen',
      'Your identity proofing is now complete',
      'You can now proceed to TFA setup',
      'Check your email for confirmation from ID.me',
    ],
  },
];

const RED_NOTES = [
  'Note: Do not create more than one ID.me account',
  'Note: Two separate links - one for DEA, one for non-DEA prescribing',
];
const GREEN_NOTES = ['You will receive a confirmation email from ID.me', 'Check your email for confirmation from ID.me'];

/** Same text/bullet colour rules as the web guide (red notes, blue tip, green confirmations). */
function getItemColors(item) {
  if (RED_NOTES.some((note) => item.includes(note))) return { text: '#dc3545', bullet: '#dc3545' };
  if (item.includes('Tip: Setting MFA for the first time')) return { text: '#0d6efd', bullet: '#0d6efd' };
  if (GREEN_NOTES.some((note) => item.includes(note))) return { text: '#28a745', bullet: '#28a745' };
  return { text: '#495057', bullet: '#0d6efd' };
}

/** Port of IdMeDetailedGuide.jsx. */
export default function IdMeGuideScreen() {
  const { goBack } = useIdentityProofing();

  return (
    <IdpScreen>
      <Text style={styles.title}>Complete Identity Proofing with ID.me</Text>
      <Text style={styles.intro}>
        DoseSpot has partnered with an organization named ID.me to facilitate identity proofing for Prescribers.
      </Text>

      <View style={styles.divider} />

      <View style={styles.alternativeBox}>
        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#ff8c00" style={styles.icon} />
        <View style={styles.flex1}>
          <Text style={styles.alternativeTitle}>Alternative Identity Verification Required</Text>
          <Text style={styles.alternativeText}>
            This verification method is used when Experian facial recognition verification cannot be completed after 3
            attempts. This guide will provide you with the instructions and links to additional ID.me support resources
            to complete this process.
          </Text>
        </View>
      </View>

      <IdpCard style={styles.section}>
        <Text style={styles.requirementsTitle}>Before You Start, You Will Need the Following:</Text>
        {REQUIREMENTS.map((requirement) => (
          <View key={requirement} style={styles.requirementRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#28a745" style={styles.icon} />
            <Text style={styles.requirementText}>{requirement}</Text>
          </View>
        ))}
      </IdpCard>

      <Text style={styles.stepsHeading}>Steps to Complete Verification:</Text>
      <View style={styles.stepList}>
        {STEPS.map((step) => (
          <IdpCard key={step.number} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IdpNumberBadge number={step.number} size={34} />
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <IdpBulletList
              items={step.content}
              bulletColor="#0d6efd"
              textColor="#495057"
              getItemStyle={getItemColors}
            />
          </IdpCard>
        ))}
      </View>

      <View style={styles.notesBox}>
        <View style={styles.notesHeader}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#0d6efd" />
          <Text style={styles.notesTitle}>Important Notes</Text>
        </View>
        <Text style={styles.note}>
          <Text style={styles.bold}>Two Links Available:</Text> One for DEA prescribing (controlled substances/EPCS),
          another for non-DEA prescribing
        </Text>
        <Text style={styles.note}>
          <Text style={styles.bold}>Account Limit:</Text> Do not create more than one ID.me account. For additional
          information, visit{' '}
          <Text style={styles.link} onPress={() => openExternalLink(ID_ME_MULTIPLE_ACCOUNTS_URL)}>
            Can I have more than one ID.me account?
          </Text>
        </Text>
        <Text style={styles.note}>
          <Text style={styles.bold}>MFA Setup:</Text> Save your recovery code when setting up MFA for the first time to
          ensure account access
        </Text>
        <Text style={[styles.note, styles.noteLast]}>
          <Text style={styles.bold}>Support Resources:</Text> Visit{' '}
          <Text style={styles.link} onPress={() => openExternalLink(ID_ME_SUPPORT_URL)}>
            ID.me support guide
          </Text>{' '}
          for additional assistance
        </Text>
      </View>

      <View style={styles.readyBox}>
        <Text style={styles.readyTitle}>Ready to start ID.me verification?</Text>
        <Text style={styles.readyText}>
          You will be directed to ID.me&apos;s secure platform to complete your identity verification.
        </Text>
        <IdpButton
          label="Start ID.me Verification"
          variant="success"
          icon="open-in-new"
          onPress={() => openExternalLink(ID_ME_URL)}
          style={styles.readyButton}
        />
      </View>

      <Text style={styles.footer}>
        Need help? Visit the{' '}
        <Text style={styles.link} onPress={() => openExternalLink(ID_ME_SUPPORT_URL)}>
          ID.me Support Guide
        </Text>{' '}
        or contact DoseSpot support for assistance.
      </Text>

      <IdpButton label="Back" variant="outline-secondary" onPress={goBack} style={styles.back} />
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  title: { fontSize: 19, fontWeight: '700', color: '#212529' },
  intro: { fontSize: 14, lineHeight: 21, color: '#495057', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#000', marginVertical: 16 },
  icon: { marginTop: 1 },
  alternativeBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff8c00',
    backgroundColor: '#fff5e6',
    marginBottom: 16,
  },
  alternativeTitle: { fontSize: 14.5, fontWeight: '700', color: '#212529', marginBottom: 4 },
  alternativeText: { fontSize: 13.5, lineHeight: 20, color: '#495057' },
  section: { marginBottom: 18 },
  requirementsTitle: { fontSize: 14.5, fontWeight: '700', color: '#0d6efd', marginBottom: 10 },
  requirementRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  requirementText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#495057' },
  stepsHeading: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 10 },
  stepList: { gap: 12, marginBottom: 18 },
  stepCard: { padding: 14 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepTitle: { flex: 1, fontSize: 14.5, fontWeight: '600', color: '#212529' },
  notesBox: { backgroundColor: '#e7f3ff', borderRadius: 8, padding: 14, marginBottom: 16 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  notesTitle: { fontSize: 14.5, fontWeight: '700', color: '#0d6efd' },
  note: { fontSize: 13.5, lineHeight: 20, color: '#495057', marginBottom: 8 },
  noteLast: { marginBottom: 0 },
  bold: { fontWeight: '700' },
  link: { color: '#0d6efd', textDecorationLine: 'underline' },
  readyBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: adTokens.gray200,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  readyTitle: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  readyText: { fontSize: 13, lineHeight: 19, color: adTokens.textSecondary, marginTop: 4 },
  readyButton: { marginTop: 12 },
  footer: {
    fontSize: 12.5,
    lineHeight: 19,
    color: adTokens.textSecondary,
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: adTokens.gray200,
  },
  back: { marginTop: 16 },
});
