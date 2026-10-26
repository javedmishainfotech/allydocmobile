import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpCard, IdpButton, IdpAlert, IdpBulletList } from './IdpUi';
import { requestTfaActivation } from '../../services/identityProofingService';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';
import { IDP_MAX_ATTEMPTS, isTfaActivated } from '../../utils/idpStatus';

const TFA_REQUIREMENTS = [
  'Mobile phone number for SMS verification',
  'Authenticator app (optional: Google Authenticator, Authy)',
  'Access to your mobile device',
  '2-3 minutes to complete',
];

const BADGE_BY_STATUS = {
  locked: { label: 'Locked', bg: '#dc3545', color: '#fff' },
  not_started: { label: 'Not Started', bg: '#6c757d', color: '#fff' },
  in_progress: { label: 'In Progress', bg: '#ffc107', color: '#212529' },
  completed: { label: 'Completed', bg: '#28a745', color: '#fff' },
  failed: { label: 'TFA Failed', bg: '#dc3545', color: '#fff' },
  deactivation_initiated: { label: 'Deactivation Initiated', bg: '#ffc107', color: '#212529' },
  deactivated: { label: 'Deactivated', bg: '#6c757d', color: '#fff' },
  deactivation_failed: { label: 'Deactivation Failed', bg: '#dc3545', color: '#fff' },
};

const BANNER_COPY = {
  not_started: {
    title: 'TFA Initiation Required',
    message:
      'Your Identity Proofing is complete. To enable secure prescribing, request the Super Admin to initiate Two-Factor Authentication (TFA) for your account.',
  },
  deactivated: {
    title: 'TFA Re-activation Required',
    message:
      'Two-Factor Authentication has been successfully deactivated. To enable secure prescribing again, request the Super Admin to initiate Two-Factor Authentication (TFA) for your account.',
  },
};

/** Port of useTfaInitiationRequest.js. */
function useTfaInitiationRequest() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequested, setIsRequested] = useState(false);

  const requestInitiation = useCallback(async () => {
    setIsRequesting(true);
    const result = await requestTfaActivation();
    if (result.raw?.status === true) {
      toast.success(result.message || 'TFA activation request sent to the administrator.');
      setIsRequested(true);
    } else {
      toast.error(result.message || 'Failed to send TFA initiation request.');
    }
    setIsRequesting(false);
  }, []);

  return { requestInitiation, isRequesting, isRequested };
}

/** Port of TfaInitiationRequestBanner.jsx. */
export function TfaInitiationRequestBanner({ variant = 'not_started', style }) {
  const { requestInitiation, isRequesting, isRequested } = useTfaInitiationRequest();
  const { title, message } = BANNER_COPY[variant] || BANNER_COPY.not_started;

  return (
    <IdpAlert variant="info" title={title} style={style}>
      <Text style={styles.bannerText}>{message}</Text>
      <IdpButton
        label={isRequested ? 'Request Sent' : 'TFA Initiation Request'}
        variant="primary"
        onPress={requestInitiation}
        loading={isRequesting}
        disabled={isRequested}
        style={styles.bannerButton}
      />
    </IdpAlert>
  );
}

function CardHeader({ displayStatus }) {
  const badge = BADGE_BY_STATUS[displayStatus] || BADGE_BY_STATUS.locked;
  return (
    <View style={styles.header}>
      <View style={styles.flex1}>
        <Text style={styles.eyebrow}>STEP 2</Text>
        <Text style={styles.title}>Two-Factor Authentication</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    </View>
  );
}

function openAccountSettings(openDrawerScreen) {
  openDrawerScreen('DoctorSettings', { tab: 'account' });
}

/** Port of components/TwoFactorStep.jsx - the "Step 2 / Two-Factor Authentication" card. */
export function TwoFactorCard() {
  const { idpStatus, tfaStatus, idpAttemptCount, tfaDisplayStatus, isTwoFactorLocked, navigate, goToOverview, openDrawerScreen } =
    useIdentityProofing();

  const displayStatus = isTwoFactorLocked || idpAttemptCount >= IDP_MAX_ATTEMPTS ? 'locked' : tfaDisplayStatus;
  const isTfaVerified = isTfaActivated(tfaStatus) || displayStatus === 'completed';
  const isStartTfaDisabled = displayStatus === 'locked' || idpStatus === 'idperror' || tfaStatus === 'tfaerror';

  const handleSetup = () => {
    if (idpStatus !== 'idpsuccess') {
      toast.error('Please complete the Identity Proofing process(IDP) first.');
      goToOverview();
      return;
    }
    navigate('tfa-activation');
  };

  return (
    <IdpCard>
      <CardHeader displayStatus={displayStatus} />

      <Text style={styles.paragraph}>
        Two-Factor Authentication adds an extra layer of security by requiring a second verification factor in addition
        to your password. This protects your account and sensitive patient information from unauthorized access.
      </Text>

      <Text style={styles.subheading}>What you&apos;ll need:</Text>
      <IdpBulletList items={TFA_REQUIREMENTS} bulletColor={adTokens.textSecondary} textColor="#212529" />

      <View style={styles.statusBlock}>
        {displayStatus === 'locked' ? (
          <IdpAlert variant="danger" title="TFA Setup Locked">
            Complete Identity Proofing (Step 1) to unlock Two-Factor Authentication setup.
          </IdpAlert>
        ) : displayStatus === 'not_started' ? (
          <TfaInitiationRequestBanner variant="not_started" />
        ) : (
          <IdpAlert variant="info" title="Almost there!">
            Follow the prompts to configure your preferred authenticator method.
          </IdpAlert>
        )}
      </View>

      <View style={styles.timeline}>
        <Text style={[styles.timelineItem, displayStatus === 'not_started' && styles.timelineActiveDark]}>Not Started</Text>
        <Text style={styles.timelineItem}>•</Text>
        <Text style={[styles.timelineItem, displayStatus === 'in_progress' && styles.timelineActiveOrange]}>In Progress</Text>
        {displayStatus === 'completed' ? (
          <>
            <Text style={styles.timelineItem}>•</Text>
            <Text style={[styles.timelineItem, styles.timelineActiveGreen]}>Completed</Text>
          </>
        ) : null}
        {displayStatus === 'failed' ? (
          <>
            <Text style={styles.timelineItem}>•</Text>
            <Text style={[styles.timelineItem, styles.timelineActiveRed]}>TFA Failed</Text>
          </>
        ) : null}
      </View>

      {!isTfaVerified && !isStartTfaDisabled && displayStatus === 'in_progress' ? (
        <IdpButton label="Start TFA Verification" variant="primary" onPress={handleSetup} style={styles.cta} />
      ) : null}

      {isTfaVerified ? (
        <View style={styles.deactivateBlock}>
          <Text style={[styles.deactivateText, styles.deactivateTitle]}>Need to deactivate TFA?</Text>
          <Text style={styles.deactivateText}>
            To begin the deactivation process, go to your{' '}
            <Text style={styles.deactivateLink} onPress={() => openAccountSettings(openDrawerScreen)}>
              Account Settings
            </Text>
            .
          </Text>
        </View>
      ) : null}
    </IdpCard>
  );
}

/** Port of components/TfaDeactivationStep.jsx. */
export function TfaDeactivationCard() {
  const { tfaDisplayStatus, openDrawerScreen } = useIdentityProofing();
  const goToAccountSettings = () => openAccountSettings(openDrawerScreen);

  return (
    <IdpCard>
      <CardHeader displayStatus={tfaDisplayStatus} />

      {tfaDisplayStatus === 'deactivation_initiated' ? (
        <View>
          <Text style={styles.deactivationTitle}>TFA Deactivation Initiated</Text>
          <Text style={styles.paragraph}>
            Your administrator has initiated the TFA deactivation process. To complete deactivation, go to Account
            Settings and complete the verification process.
          </Text>
          <IdpButton label="Complete TFA Deactivation" variant="primary" onPress={goToAccountSettings} />
        </View>
      ) : null}

      {tfaDisplayStatus === 'deactivated' ? <TfaInitiationRequestBanner variant="deactivated" /> : null}

      {tfaDisplayStatus === 'deactivation_failed' ? (
        <View>
          <Text style={styles.deactivationTitle}>TFA Deactivation Failed</Text>
          <Text style={styles.paragraph}>
            We couldn&apos;t complete the deactivation process. Please return to Account Settings and try again.
          </Text>
          <IdpButton label="Go to Account Settings" variant="outline-primary" onPress={goToAccountSettings} />
        </View>
      ) : null}
    </IdpCard>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  eyebrow: { fontSize: 11, letterSpacing: 0.6, color: adTokens.textSecondary, marginBottom: 2 },
  title: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  paragraph: { fontSize: 13.5, lineHeight: 20, color: adTokens.textSecondary, marginBottom: 14 },
  subheading: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  statusBlock: { marginTop: 14 },
  bannerText: { fontSize: 13, lineHeight: 19, color: '#055160' },
  bannerButton: { marginTop: 10 },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 16 },
  timelineItem: { fontSize: 12.5, color: '#6c757d' },
  timelineActiveDark: { fontWeight: '700', color: '#000' },
  timelineActiveOrange: { fontWeight: '700', color: '#ff9800' },
  timelineActiveGreen: { fontWeight: '700', color: '#28a745' },
  timelineActiveRed: { fontWeight: '700', color: '#dc3545' },
  cta: { marginTop: 16 },
  deactivateBlock: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: adTokens.gray100 },
  deactivateText: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 19 },
  deactivateTitle: { fontWeight: '700', marginBottom: 4 },
  deactivateLink: { color: adTokens.warningDark, fontWeight: '700' },
  deactivationTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
});
