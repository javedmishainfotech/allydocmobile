import React from 'react';
import { Linking, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, idpColors } from './IdpUi';
import { toast } from '../../utils/toast';

const SUPPORT_PHONE_DISPLAY = '800-831-5814';

/** Port of components/IdentityProofing/Step1Begin.jsx. */
export default function Step1Begin() {
  const { nextStep, cancelFlow } = useIdentityProofing();

  const callSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE_DISPLAY}`).catch(() => toast.error('Could not open the phone dialer.'));
  };

  return (
    <IdpScreen
      footer={
        <>
          <IdpButton label="Cancel" variant="outline-danger" onPress={cancelFlow} />
          <IdpButton label="Begin Identity Proofing" variant="success" onPress={() => nextStep(1)} flex />
        </>
      }
    >
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="card-account-details-outline" size={38} color="#4688F1" />
        </View>
        <Text style={styles.title}>Identity Proofing Required</Text>
        <Text style={styles.description}>
          To continue using AllyDoc, identity verification of certain financial records is required. This process is
          completed through Experian.
        </Text>
        <Text style={styles.support}>
          If you experience any issues, please contact support at{' '}
          <Text style={styles.phone} onPress={callSupport}>
            {SUPPORT_PHONE_DISPLAY}
          </Text>{' '}
          for assistance.
        </Text>
      </View>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 16 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: idpColors.text, marginTop: 14, textAlign: 'center' },
  description: { fontSize: 15.5, lineHeight: 23, color: idpColors.bodyText, marginTop: 10, textAlign: 'center' },
  support: { fontSize: 14, lineHeight: 21, color: idpColors.bodyText, marginTop: 16, textAlign: 'center' },
  phone: { color: '#1A73E8', fontWeight: '600' },
});
