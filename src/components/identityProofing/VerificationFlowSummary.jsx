import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpCard, IdpPill } from './IdpUi';
import { IDP_STATUS_CONFIG, TFA_STATUS_CONFIG, FULL_ACCESS_CONFIG } from '../../utils/idpStatus';
import { adTokens } from '../../theme/colors';

const ICON_GRAY = '#d3d9df';

/** Port of VerificationFlowSummary.jsx - the "Verification Process Flow" card, laid out as a vertical timeline for phones. */
export default function VerificationFlowSummary() {
  const { idpDisplayStatus, tfaDisplayStatus, fullAccessStatus } = useIdentityProofing();

  const steps = [
    {
      id: 'step-1',
      title: 'Step 1',
      description: 'Identity Proofing',
      icon: 'shield-check-outline',
      config: IDP_STATUS_CONFIG[idpDisplayStatus] || IDP_STATUS_CONFIG.not_started,
      iconBg:
        idpDisplayStatus === 'completed'
          ? '#28a745'
          : idpDisplayStatus === 'in_progress'
            ? '#ffc107'
            : idpDisplayStatus === 'failed'
              ? '#dc3545'
              : ICON_GRAY,
    },
    {
      id: 'step-2',
      title: 'Step 2',
      description: 'Two-Factor Auth',
      icon: 'cellphone',
      config: TFA_STATUS_CONFIG[tfaDisplayStatus] || TFA_STATUS_CONFIG.locked,
      showLock: tfaDisplayStatus === 'locked',
      iconBg:
        tfaDisplayStatus === 'completed'
          ? '#28a745'
          : tfaDisplayStatus === 'in_progress' || tfaDisplayStatus === 'deactivation_initiated'
            ? '#ffc107'
            : tfaDisplayStatus === 'deactivated'
              ? '#6c757d'
              : tfaDisplayStatus === 'failed' || tfaDisplayStatus === 'deactivation_failed'
                ? '#dc3545'
                : ICON_GRAY,
    },
    {
      id: 'step-3',
      title: 'Complete',
      description: 'Full Access',
      icon: 'check-circle-outline',
      config: FULL_ACCESS_CONFIG[fullAccessStatus],
      iconBg: fullAccessStatus === 'completed' ? '#28a745' : ICON_GRAY,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Verification Processes</Text>
      <Text style={styles.description}>
        To ensure the highest level of security and comply with healthcare regulations, we require all prescribers to
        complete a two-step verification process. This process verifies your identity and secures your account with
        advanced authentication measures.
      </Text>

      <IdpCard style={styles.card}>
        <Text style={styles.cardTitle}>Verification Process Flow</Text>
        {steps.map((step, index) => (
          <View key={step.id}>
            <View style={styles.stepRow}>
              <View style={[styles.iconCircle, { backgroundColor: step.iconBg }]}>
                <MaterialCommunityIcons name={step.icon} size={26} color="#fff" />
                {step.showLock ? (
                  <View style={styles.lockBadge}>
                    <MaterialCommunityIcons name="lock" size={11} color="#fff" />
                  </View>
                ) : null}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              <IdpPill config={step.config} />
            </View>
            {index < steps.length - 1 ? <View style={styles.connector} /> : null}
          </View>
        ))}
      </IdpCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: '#495057', textAlign: 'center', marginBottom: 6 },
  description: { fontSize: 13, lineHeight: 19, color: '#495057', textAlign: 'center', marginBottom: 14 },
  card: { paddingVertical: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#495057', textAlign: 'center', marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc3545',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 12, color: '#6c757d' },
  stepDescription: { fontSize: 14.5, fontWeight: '600', color: '#495057' },
  connector: { width: 2, height: 14, backgroundColor: adTokens.gray200, marginLeft: 23, marginVertical: 4 },
});
