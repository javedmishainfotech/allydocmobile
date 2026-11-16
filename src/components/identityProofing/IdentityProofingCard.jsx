import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpCard, IdpButton, IdpAlert, IdpBulletList } from './IdpUi';
import { adTokens } from '../../theme/colors';
import { IDP_MAX_ATTEMPTS } from '../../utils/idpStatus';
import { getItem } from '../../utils/storage';
import { useIdentityProofingApi } from '../../hooks/useIdentityProofingApi';
import { toast } from '../../utils/toast';

const REQUIREMENTS = ['Government-issued photo ID', 'Smartphone with camera', '5-10 minutes to complete'];

// Exact port of the countdown formatting in AllyDocReactAppLatest's IDPRestrictionModal
// (utils/Modals/Modals.jsx formatTime) - e.g. "11h 59m 34s".
function formatIdpTime(totalSeconds) {
  const pad = (num) => String(num).padStart(2, '0');
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
}

const BADGE_BY_STATUS = {
  completed: { label: 'Completed', bg: '#28a745', color: '#fff' },
  in_progress: { label: 'In Progress', bg: '#ffc107', color: '#212529' },
  failed: { label: 'IDP Failed', bg: '#dc3545', color: '#fff' },
  not_started: { label: 'Not Started', bg: '#6c757d', color: '#fff' },
};

/** Port of components/IdentityProofingStep.jsx - the "Step 1 / Identity Proofing (IDP)" card. */
export default function IdentityProofingCard() {
  const { idpStatus, idpAttemptCount, idpDisplayStatus, startFlow } = useIdentityProofing();
  const { sendIdpInitiationEmail, checkRemainingEmailTime } = useIdentityProofingApi();

  const isIdpVerified = idpStatus === 'idpsuccess';
  const isIdpFailed = idpStatus === 'idperror';
  const isStartDisabled = idpAttemptCount >= IDP_MAX_ATTEMPTS;
  const badge = BADGE_BY_STATUS[idpDisplayStatus] || BADGE_BY_STATUS.not_started;

  // ---- "Request IDP Verification" (email to admin) - mirrors IDPRestrictionModal on web's
  // Doctor Dashboard: /api/SendEmail/DoctorToAdmin, rate-limited via
  // /api/SendEmail/CheckRemainingEmailTime. Only relevant while IDP hasn't been started yet. ----
  const isIdpNotStarted = idpDisplayStatus === 'not_started';
  const [canSendIdpMail, setCanSendIdpMail] = useState(true);
  const [isCheckingIdpEmailTime, setIsCheckingIdpEmailTime] = useState(false);
  const [idpRemainingSeconds, setIdpRemainingSeconds] = useState(0);
  const [isRequestingIdp, setIsRequestingIdp] = useState(false);
  const [isIdpRequestSubmitted, setIsIdpRequestSubmitted] = useState(false);
  const [idpRequestError, setIdpRequestError] = useState(null);

  const checkIdpEmailTime = useCallback(async () => {
    const userId = await getItem('userId');
    if (!userId) return;
    setIsCheckingIdpEmailTime(true);
    try {
      const result = await checkRemainingEmailTime(userId);
      if (result?.success && result?.data) {
        const { canSendMail, retryAfterSeconds } = result.data;
        setCanSendIdpMail(canSendMail !== false);
        setIdpRemainingSeconds(canSendMail === false ? Number(retryAfterSeconds) || 0 : 0);
      }
    } catch {
      // On error, allow the doctor to try - same fallback as web.
      setCanSendIdpMail(true);
    } finally {
      setIsCheckingIdpEmailTime(false);
    }
  }, [checkRemainingEmailTime]);

  useEffect(() => {
    if (isIdpNotStarted) checkIdpEmailTime();
  }, [isIdpNotStarted, checkIdpEmailTime]);

  // Countdown timer, same tick-down as web's effect.
  useEffect(() => {
    if (canSendIdpMail || idpRemainingSeconds <= 0) return undefined;
    const interval = setInterval(() => {
      setIdpRemainingSeconds((prev) => {
        if (prev <= 1) {
          setCanSendIdpMail(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canSendIdpMail, idpRemainingSeconds]);

  const isIdpCooldownActive = !isCheckingIdpEmailTime && !canSendIdpMail && idpRemainingSeconds > 0;
  const isIdpConfirmationState = isIdpRequestSubmitted && !isIdpCooldownActive && idpRemainingSeconds === 0;
  const isIdpInitialState = !isIdpRequestSubmitted && !isIdpCooldownActive && canSendIdpMail && !isCheckingIdpEmailTime;

  const handleRequestIdpEmail = async () => {
    const userId = await getItem('userId');
    if (!userId) {
      toast.error('User ID not found. Please login again.');
      return;
    }
    setIdpRequestError(null);
    setIsRequestingIdp(true);
    try {
      const result = await sendIdpInitiationEmail(userId);
      if (result?.success) {
        toast.success(result.message || 'You have successfully requested for initiation of IDP');
        setIsIdpRequestSubmitted(true);
        setTimeout(() => {
          checkIdpEmailTime();
        }, 10000);
      } else {
        const message = result?.message || '';
        const is12HourError =
          message.toLowerCase().includes('12 hour') || message.toLowerCase().includes('try after');
        toast.error(
          is12HourError
            ? 'Please try after 12 hours to request initiation of IDP'
            : message || 'Failed to send IDP initiation request. Please try again.',
        );
        setIdpRequestError('Request failed. Please try again.');
      }
    } catch {
      toast.error('Failed to send IDP initiation request. Please try again.');
      setIdpRequestError('Request failed. Please try again.');
    } finally {
      setIsRequestingIdp(false);
    }
  };

  return (
    <IdpCard>
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>STEP 1</Text>
          <Text style={styles.title}>Identity Proofing (IDP)</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.paragraph}>
        Identity Proofing is a security process that verifies you are who you claim to be. This is required for
        prescribers to comply with federal regulations when prescribing controlled substances.
      </Text>

      <Text style={styles.subheading}>What you&apos;ll need:</Text>
      <IdpBulletList items={REQUIREMENTS} bulletColor={adTokens.textSecondary} textColor="#212529" />

      <IdpAlert variant="warning" style={styles.alert}>
        <Text style={styles.alertText}>
          <Text style={styles.bold}>Important:</Text> If you fail the Experian identity questions, you will have up to
          three attempts. After the third failure, we will display the link to complete the workflow using ID.me. Once the
          ID.me verification is complete, it takes up to 24 hours for DoseSpot to update.
        </Text>
      </IdpAlert>

      <View style={styles.timeline}>
        <Text style={[styles.timelineItem, idpDisplayStatus === 'not_started' && styles.timelineActiveGray]}>Not Started</Text>
        <Text style={styles.timelineDot}>•</Text>
        <Text style={[styles.timelineItem, idpDisplayStatus === 'in_progress' && styles.timelineActiveOrange]}>In Progress</Text>
        {idpDisplayStatus === 'completed' ? (
          <>
            <Text style={styles.timelineDot}>•</Text>
            <Text style={[styles.timelineItem, styles.timelineActiveGreen]}>Completed</Text>
          </>
        ) : null}
        {idpDisplayStatus === 'failed' ? (
          <>
            <Text style={styles.timelineDot}>•</Text>
            <Text style={[styles.timelineItem, styles.timelineActiveRed]}>IDP Failed</Text>
          </>
        ) : null}
      </View>

      {!isIdpVerified && !isStartDisabled && !isIdpFailed ? (
        <IdpButton label="Start IDP Verification" variant="success" onPress={startFlow} style={styles.cta} />
      ) : null}

      {isIdpNotStarted ? (
        <View style={styles.emailRequestBlock}>
          {isCheckingIdpEmailTime ? <Text style={styles.checkingText}>Checking request status…</Text> : null}

          {idpRequestError && !isIdpRequestSubmitted ? (
            <Text style={styles.emailErrorText}>{idpRequestError}</Text>
          ) : null}

          {isIdpInitialState ? (
            <>
              <Text style={styles.emailHelperText}>
                Your identity proofing (IDP) verification has not been started yet. You can submit a request
                to begin the process. Once it is initiated, you will be notified.
              </Text>
              <IdpButton
                label="Request IDP Verification"
                variant="outline-primary"
                loading={isRequestingIdp}
                onPress={handleRequestIdpEmail}
                style={styles.cta}
              />
            </>
          ) : null}

          {isIdpConfirmationState ? (
            <IdpAlert variant="info" style={styles.emailAlert}>
              Your request to initiate identity proofing has been submitted.
            </IdpAlert>
          ) : null}

          {isIdpCooldownActive ? (
            <IdpAlert
              variant="warning"
              footnote={`Time remaining: ${formatIdpTime(idpRemainingSeconds)}`}
              style={styles.emailAlert}
            >
              Your identity proofing initiation request has been acknowledged. You will be notified once the
              process is successfully started. If you do not receive a notification, you may submit another
              reminder request after the waiting period ends.
            </IdpAlert>
          ) : null}
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
  alert: { marginTop: 14 },
  alertText: { fontSize: 13, lineHeight: 19, color: '#664d03' },
  bold: { fontWeight: '700' },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 16 },
  timelineItem: { fontSize: 12.5, color: '#6c757d' },
  timelineDot: { fontSize: 12.5, color: '#6c757d' },
  timelineActiveGray: { fontWeight: '700' },
  timelineActiveOrange: { fontWeight: '700', color: '#ff9800' },
  timelineActiveGreen: { fontWeight: '700', color: '#28a745' },
  timelineActiveRed: { fontWeight: '700', color: '#dc3545' },
  cta: { marginTop: 16 },

  emailRequestBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: adTokens.gray200 },
  checkingText: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 8 },
  emailHelperText: { fontSize: 13, lineHeight: 19, color: adTokens.textSecondary, marginBottom: 10 },
  emailErrorText: { fontSize: 12.5, color: '#dc3545', marginBottom: 8 },
  emailAlert: { marginTop: 0 },
});
