import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  resetPin,
  setPin as setPinApi,
  updateDoseSpotStatus,
  requestTfaDeactivation,
  tfaDeactivate,
} from '../../services/settingsService';
import { getItem, setItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import SetPinModal from './SetPinModal';
import { colors, adTokens } from '../../theme/colors';

/**
 * Port of the "Account Settings" tab in AllyDocReactApp's Doctor Settings page:
 * Reset PIN + TFA Deactivation, both driven by flags persisted at login
 * (hasPinSetForTFA, resetPin, tfaStatus, tfaCredentialID - see authSlice.js,
 * which already copies every login response field into AsyncStorage).
 */
export default function AccountSettingsTab({ userId }) {
  const navigation = useNavigation();
  const [hasPinSetForTFA, setHasPinSetForTFA] = useState(null);
  const [adminResetPending, setAdminResetPending] = useState(false);
  const [tfaStatus, setTfaStatus] = useState(null);
  const [tfaCredentialId, setTfaCredentialId] = useState(null);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('set');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);

  const [otp, setOtp] = useState('');
  const [deactivatePin, setDeactivatePin] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isRequestingDeactivation, setIsRequestingDeactivation] = useState(false);

  const loadFlags = async () => {
    const [pinFlag, resetFlag, status, credId] = await Promise.all([
      getItem('hasPinSetForTFA'),
      getItem('resetPin'),
      getItem('tfaStatus'),
      getItem('tfaCredentialID'),
    ]);
    setHasPinSetForTFA(pinFlag === 'true' || pinFlag === '1');
    setAdminResetPending(resetFlag === 'true' || resetFlag === '1');
    setTfaStatus((status || '').toLowerCase());
    setTfaCredentialId(credId || null);
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const openSetPinModal = (mode) => {
    setPinModalMode(mode);
    setPinModalVisible(true);
  };

  const handleResetPinPress = async () => {
    if (!hasPinSetForTFA) {
      openSetPinModal('set');
      return;
    }
    setIsResettingPin(true);
    const response = await resetPin();
    setIsResettingPin(false);
    if (response.success) {
      toast.success(response.message || 'PIN reset. Please set a new PIN.');
      const needsSetWorkflow = /set pin workflow|does not have a pin set/i.test(response.message || '');
      openSetPinModal(needsSetWorkflow ? 'set' : 'reset');
    } else {
      toast.error(response.message || 'Unable to reset PIN.');
    }
  };

  const handleSavePin = async (pin) => {
    setIsSavingPin(true);
    const response = await setPinApi(pin);
    setIsSavingPin(false);
    if (response.success) {
      toast.success(response.message || 'PIN set successfully.');
      await setItem('resetPin', '0');
      await setItem('hasPinSetForTFA', 'true');
      await updateDoseSpotStatus({ userId, processName: 'TFAPINSET', text: '1' });
      await updateDoseSpotStatus({ userId, processName: 'TFAPINRESET', text: '0' });
      setPinModalVisible(false);
      await loadFlags();
    } else {
      toast.error(response.message || 'Unable to set PIN.');
    }
  };

  const handleRequestDeactivation = async () => {
    setIsRequestingDeactivation(true);
    const response = await requestTfaDeactivation();
    setIsRequestingDeactivation(false);
    if (response.success) {
      Alert.alert('Request sent', response.message || 'Check your email to continue TFA deactivation.');
    } else {
      toast.error(response.message || 'Unable to send deactivation request.');
    }
  };

  const handleDeactivate = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Enter the 6-digit passcode.');
      return;
    }
    if (!/^\d{4}$/.test(deactivatePin)) {
      toast.error('Enter your 4-digit PIN.');
      return;
    }
    if (tfaCredentialId && !credentialId.trim()) {
      toast.error('Credential ID is required.');
      return;
    }
    setIsDeactivating(true);
    const response = await tfaDeactivate({
      oneTimePassword: otp,
      pin: deactivatePin,
      credentialId: tfaCredentialId ? credentialId.trim() : undefined,
    });
    setIsDeactivating(false);
    if (response.success) {
      await updateDoseSpotStatus({ userId, processName: 'TFA', text: 'TFADeactivatedSuccess' });
      await setItem('tfaStatus', 'tfadeactivatedsuccess');
      toast.success(response.message || 'TFA deactivated successfully.');
      setOtp('');
      setDeactivatePin('');
      setCredentialId('');
      await loadFlags();
    } else {
      toast.error(response.message || 'Unable to deactivate TFA.');
    }
  };

  return (
    <View>
      {/* Reset PIN */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={adTokens.primaryDark} />
          <Text style={styles.sectionTitle}>PIN Management</Text>
        </View>

        {adminResetPending ? (
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="alert-outline" size={15} color={adTokens.warningDark} />
            <Text style={styles.warningText}>
              Your administrator has reset your PIN. Please set a new one to continue using TFA.
            </Text>
          </View>
        ) : null}

        {!hasPinSetForTFA && !adminResetPending ? (
          <Text style={styles.mutedText}>You have not set a PIN for two-factor authentication yet.</Text>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          disabled={isResettingPin}
          onPress={adminResetPending ? () => openSetPinModal('set') : handleResetPinPress}
        >
          {isResettingPin ? (
            <ActivityIndicator size={14} color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {hasPinSetForTFA && !adminResetPending ? 'Reset My PIN' : 'Set PIN'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* TFA Deactivation */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="shield-lock-outline" size={18} color={adTokens.primaryDark} />
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
        </View>

        {tfaStatus === 'tfaactivatedsuccess' ? (
          <>
            <Text style={styles.mutedText}>TFA is currently active on your account.</Text>
            <Pressable style={styles.dangerButton} disabled={isRequestingDeactivation} onPress={handleRequestDeactivation}>
              {isRequestingDeactivation ? (
                <ActivityIndicator size={14} color={colors.white} />
              ) : (
                <Text style={styles.dangerButtonText}>Request TFA Deactivation</Text>
              )}
            </Pressable>
          </>
        ) : tfaStatus === 'tfadeactivateinit' || tfaStatus === 'tfadeactivatederror' ? (
          <>
            <Text style={styles.mutedText}>Enter your authenticator passcode and PIN to confirm deactivation.</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit passcode"
              placeholderTextColor={adTokens.textMuted}
            />
            <TextInput
              style={styles.input}
              value={deactivatePin}
              onChangeText={(t) => setDeactivatePin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="4-digit PIN"
              placeholderTextColor={adTokens.textMuted}
            />
            {tfaCredentialId ? (
              <TextInput
                style={styles.input}
                value={credentialId}
                onChangeText={setCredentialId}
                placeholder="Credential ID"
                placeholderTextColor={adTokens.textMuted}
              />
            ) : null}
            <Pressable style={styles.dangerButton} disabled={isDeactivating} onPress={handleDeactivate}>
              {isDeactivating ? (
                <ActivityIndicator size={14} color={colors.white} />
              ) : (
                <Text style={styles.dangerButtonText}>Deactivate TFA</Text>
              )}
            </Pressable>
          </>
        ) : tfaStatus === 'tfadeactivatedsuccess' ? (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color={adTokens.successDark} />
            <Text style={styles.infoText}>Two-factor authentication has been deactivated for this account.</Text>
          </View>
        ) : tfaStatus === 'tfaactivateinit' || tfaStatus === 'pending' ? (
          <>
            <Text style={styles.mutedText}>Two-factor authentication setup is not complete yet.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('IdentityProofing')}>
              <Text style={styles.primaryButtonText}>Start TFA Verification</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.mutedText}>Two-factor authentication status is unavailable right now.</Text>
        )}
      </View>

      <SetPinModal
        visible={pinModalVisible}
        mode={pinModalMode}
        isSaving={isSavingPin}
        onClose={() => setPinModalVisible(false)}
        onSave={handleSavePin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  mutedText: { fontSize: 12.5, color: adTokens.textSecondary, marginBottom: 12 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: adTokens.warningLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  warningText: { flex: 1, fontSize: 12, color: adTokens.warningDark },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: adTokens.successLight,
    borderRadius: 10,
    padding: 10,
  },
  infoText: { flex: 1, fontSize: 12.5, color: adTokens.successDark },

  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
    marginBottom: 10,
  },

  primaryButton: { backgroundColor: adTokens.primary, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  dangerButton: { backgroundColor: adTokens.danger, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  dangerButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
