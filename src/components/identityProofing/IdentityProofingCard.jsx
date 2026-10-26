import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpCard, IdpButton, IdpAlert, IdpBulletList } from './IdpUi';
import { adTokens } from '../../theme/colors';
import { IDP_MAX_ATTEMPTS } from '../../utils/idpStatus';

const REQUIREMENTS = ['Government-issued photo ID', 'Smartphone with camera', '5-10 minutes to complete'];

const BADGE_BY_STATUS = {
  completed: { label: 'Completed', bg: '#28a745', color: '#fff' },
  in_progress: { label: 'In Progress', bg: '#ffc107', color: '#212529' },
  failed: { label: 'IDP Failed', bg: '#dc3545', color: '#fff' },
  not_started: { label: 'Not Started', bg: '#6c757d', color: '#fff' },
};

/** Port of components/IdentityProofingStep.jsx - the "Step 1 / Identity Proofing (IDP)" card. */
export default function IdentityProofingCard() {
  const { idpStatus, idpAttemptCount, idpDisplayStatus, startFlow } = useIdentityProofing();

  const isIdpVerified = idpStatus === 'idpsuccess';
  const isIdpFailed = idpStatus === 'idperror';
  const isStartDisabled = idpAttemptCount >= IDP_MAX_ATTEMPTS;
  const badge = BADGE_BY_STATUS[idpDisplayStatus] || BADGE_BY_STATUS.not_started;

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
});
