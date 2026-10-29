import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { setItem } from '../../utils/storage';
import { setPin, updateDoseSpotStatus } from '../../services/settingsService';
import SetPinModal from '../settings/SetPinModal';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

function StatusRow({ complete, label }) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLeft}>
        <View style={[styles.statusIcon, complete ? styles.statusIconDone : styles.statusIconPending]}>
          <Feather name={complete ? 'check' : 'x'} size={14} color={complete ? adTokens.successDark : adTokens.dangerDark} />
        </View>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <View style={[styles.badge, complete ? styles.badgeDone : styles.badgePending]}>
        <Text style={[styles.badgeText, complete ? styles.badgeTextDone : styles.badgeTextPending]}>
          {complete ? 'Completed' : 'Required'}
        </Text>
      </View>
    </View>
  );
}

function ActionStepButton({ onPress, stepNumber, title, description }) {
  return (
    <Pressable style={styles.actionStep} onPress={onPress}>
      <View style={styles.actionStepNumber}>
        <Text style={styles.actionStepNumberText}>{stepNumber}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.actionStepTitle}>{title}</Text>
        <Text style={styles.actionStepDesc}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

/**
 * Port of AllyDocReactApp's EPCSAuthorizationRequiredModal.jsx: a live TFA/PIN status
 * checklist (instead of the previous fixed red banner) shown when a doctor tries to
 * prescribe a controlled substance. Actual EPCS signing/sending still isn't built on
 * mobile (see docs/PROGRESS.md) - this modal only makes the two real, independently
 * buildable prerequisites (TFA activation, TFA PIN) completable from here, same as web.
 */
export default function EPCSAuthorizationRequiredModal({ visible, tfaCompleted, pinSet, onClose, onPinSet }) {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const isDoctorAdmin = roleName === 'doctor admin';
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [submittingPin, setSubmittingPin] = useState(false);

  const showTfaIssue = !tfaCompleted;
  const showPinIssue = !pinSet;
  const pendingStepCount = [showTfaIssue, showPinIssue].filter(Boolean).length;

  const handleCompleteTfa = () => {
    if (isDoctorAdmin) {
      toast.info('Two-Factor Authentication setup is not available for this role.');
      return;
    }
    onClose();
    navigation.navigate('IdentityProofing');
  };

  const handleSetPinClick = () => {
    if (isDoctorAdmin) {
      toast.info('TFA PIN setup is not available for this role.');
      return;
    }
    setPinModalOpen(true);
  };

  const handleSavePin = async (pin) => {
    setSubmittingPin(true);
    const res = await setPin(pin);
    setSubmittingPin(false);
    const resultCode = res.raw?.result?.resultCode;
    if (resultCode === 'OK' || res.success) {
      toast.success(res.raw?.result?.resultDescription || 'PIN set successfully!');
      await setItem('hasPinSetForTFA', 'true');
      updateDoseSpotStatus({ userId: profile?.userId, processName: 'TFAPINSET', text: '1' });
      setPinModalOpen(false);
      onClose();
      onPinSet?.();
    } else {
      toast.error(res.raw?.result?.resultDescription || res.message || 'Failed to set PIN. Please try again.');
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="shield-alert-outline" size={22} color={adTokens.warningDark} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.title}>EPCS Authorization Required</Text>
                <Text style={styles.subtitle}>Complete the required security setup before prescribing controlled substances.</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Feather name="info" size={14} color={adTokens.warningDark} />
              <Text style={styles.infoText}>
                You cannot prescribe controlled substances until your EPCS authorization requirements are complete.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Authorization status</Text>
            <View style={styles.statusCard}>
              <StatusRow complete={tfaCompleted} label="Two-Factor Authentication" />
              <StatusRow complete={pinSet} label="TFA PIN" />
            </View>

            {!isDoctorAdmin ? (
              <>
                <Text style={styles.sectionLabel}>
                  {pendingStepCount > 0 ? `Complete ${pendingStepCount} remaining step${pendingStepCount > 1 ? 's' : ''}:` : 'All required steps are complete.'}
                </Text>
                {showTfaIssue ? (
                  <ActionStepButton
                    onPress={handleCompleteTfa}
                    stepNumber={1}
                    title="Complete TFA"
                    description="Set up DUO mobile app verification for EPCS access."
                  />
                ) : null}
                {showPinIssue ? (
                  <ActionStepButton
                    onPress={handleSetPinClick}
                    stepNumber={showTfaIssue ? 2 : 1}
                    title="Set your TFA PIN"
                    description="Create your secure 4-digit PIN for controlled prescribing."
                  />
                ) : null}
              </>
            ) : (
              <Text style={styles.mutedText}>EPCS two-factor setup is not available for clinic admin accounts.</Text>
            )}

            <Text style={styles.footerNote}>
              Controlled-substance e-prescribing (EPCS signing) itself isn&apos;t available in the app yet - please send
              those prescriptions from the web portal, even after these steps are complete.
            </Text>

            <Pressable style={styles.okButton} onPress={onClose}>
              <Text style={styles.okButtonText}>Ok</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SetPinModal
        visible={pinModalOpen}
        mode="set"
        onClose={() => setPinModalOpen(false)}
        onSave={handleSavePin}
        isSaving={submittingPin}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxHeight: '90%', backgroundColor: adTokens.white, borderRadius: 16, padding: 18 },
  header: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: adTokens.warningLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  subtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: adTokens.warningLight, borderRadius: 10, padding: 12, marginBottom: 14 },
  infoText: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary, lineHeight: 17 },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8, marginTop: 4 },
  statusCard: { backgroundColor: adTokens.gray50, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  statusIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusIconDone: { backgroundColor: adTokens.successLight },
  statusIconPending: { backgroundColor: adTokens.dangerLight },
  statusLabel: { fontSize: 12.5, color: adTokens.textPrimary },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  badgeDone: { backgroundColor: adTokens.success },
  badgePending: { backgroundColor: adTokens.danger },
  badgeText: { fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase' },
  badgeTextDone: { color: adTokens.white },
  badgeTextPending: { color: adTokens.white },
  actionStep: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  actionStepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: adTokens.primary, alignItems: 'center', justifyContent: 'center' },
  actionStepNumberText: { fontSize: 11, fontWeight: '700', color: adTokens.white },
  actionStepTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  actionStepDesc: { fontSize: 11, color: adTokens.textSecondary, marginTop: 1 },
  mutedText: { fontSize: 12.5, color: adTokens.textSecondary, marginBottom: 10 },
  footerNote: { fontSize: 11, color: adTokens.textMuted, lineHeight: 15, marginTop: 10, marginBottom: 14 },
  okButton: { alignSelf: 'flex-end', backgroundColor: adTokens.primary, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 20 },
  okButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
