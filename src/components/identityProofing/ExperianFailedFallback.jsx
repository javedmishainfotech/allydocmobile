import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IdpCard, IdpButton } from './IdpUi';
import { adTokens } from '../../theme/colors';
import { IDP_MAX_ATTEMPTS } from '../../utils/idpStatus';

/** Port of components/ExperianFailedIdMeFallback.jsx - shown on IDP failure or after any failed attempt. */
export default function ExperianFailedFallback({ idpAttemptCount = 0, idpStatus = '', onStartIdMe, onViewGuide }) {
  const isIdpFailed = idpStatus === 'idperror';
  const isMaxAttemptsReached = idpAttemptCount >= IDP_MAX_ATTEMPTS;
  const buttonsDisabled = !isIdpFailed && !isMaxAttemptsReached;

  return (
    <IdpCard style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="close-circle" size={34} color="#dc3545" />
        <View style={styles.flex1}>
          <Text style={styles.title}>Experian Identity Verification Failed</Text>
          <Text style={styles.status}>
            <Text style={styles.bold}>Status:</Text> {idpAttemptCount} unsuccessful verification attempts
          </Text>
        </View>
      </View>

      <View style={styles.attemptsBox}>
        <View style={styles.attemptsHeader}>
          <Text style={styles.attemptsLabel}>Experian Verification Attempts:</Text>
          <Text style={styles.attemptsCount}>
            {idpAttemptCount} / {IDP_MAX_ATTEMPTS} Failed ✕
          </Text>
        </View>
        <View style={styles.attemptBars}>
          {Array.from({ length: IDP_MAX_ATTEMPTS }).map((_, index) => {
            const isUsed = index < idpAttemptCount;
            return (
              <View key={index} style={[styles.attemptBar, { backgroundColor: isUsed ? '#dc3545' : '#6c757d', opacity: isUsed ? 1 : 0.4 }]}>
                <Text style={styles.attemptBarText}>Attempt {index + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {isMaxAttemptsReached ? (
        <>
          <View style={styles.nextStepBox}>
            <View style={styles.nextStepHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={adTokens.primary} />
              <Text style={styles.nextStepTitle}>Required Next Step:</Text>
            </View>
            <Text style={styles.nextStepText}>
              You must now complete identity verification using <Text style={styles.bold}>ID.me</Text> as an alternative
              method. Please proceed using the ID.me verification option below.
            </Text>
            <Text style={styles.nextStepNote}>
              ⏱️ After ID.me verification completion, it may take up to 24 hours for the system to update your status.
            </Text>
          </View>

          <IdpButton label="Start Id.me Verification" variant="idme" onPress={onStartIdMe} disabled={buttonsDisabled} />
          <IdpButton
            label="View Id.me Detailed Guide"
            variant="outline-primary"
            onPress={onViewGuide}
            disabled={buttonsDisabled}
            style={styles.secondaryAction}
          />
        </>
      ) : null}
    </IdpCard>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  card: { backgroundColor: '#fff5f5', borderColor: '#f5c2c7', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#dc3545', marginBottom: 2 },
  status: { fontSize: 13, color: adTokens.textSecondary },
  bold: { fontWeight: '700' },
  attemptsBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: adTokens.gray200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  attemptsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  attemptsLabel: { fontSize: 13, fontWeight: '500', color: adTokens.textPrimary },
  attemptsCount: { fontSize: 13, fontWeight: '700', color: '#dc3545' },
  attemptBars: { flexDirection: 'row', gap: 8 },
  attemptBar: { flex: 1, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  attemptBarText: { color: '#fff', fontSize: 11.5, fontWeight: '600' },
  nextStepBox: {
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#cfe2ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  nextStepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  nextStepTitle: { fontSize: 14, fontWeight: '700', color: adTokens.primary },
  nextStepText: { fontSize: 13.5, lineHeight: 20, color: adTokens.textPrimary, marginBottom: 6 },
  nextStepNote: { fontSize: 12.5, lineHeight: 18, color: adTokens.textSecondary },
  secondaryAction: { marginTop: 10 },
});
