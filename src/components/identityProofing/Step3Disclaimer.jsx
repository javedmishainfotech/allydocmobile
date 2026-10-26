import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCheckbox, IdpLoading } from './IdpUi';
import LegalTextView from './LegalTextView';
import { getIdpDisclaimer, acceptIdpDisclaimer } from '../../services/identityProofingService';
import { parseDisclaimerForDisplay } from '../../utils/legalTextParser';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

/** Port of components/IdentityProofing/Step3Disclaimer.jsx. */
export default function Step3Disclaimer() {
  const {
    disclaimerAccepted,
    setDisclaimerAccepted,
    nextStep,
    cancelFlow,
    updateIdpStatus,
    updateIdpStepCount,
  } = useIdentityProofing();

  const [disclaimerText, setDisclaimerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const blocks = useMemo(() => parseDisclaimerForDisplay(disclaimerText), [disclaimerText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getIdpDisclaimer();
      if (cancelled) return;

      const resultCode = result.data?.result?.resultCode;
      if (!result.success || resultCode !== 'OK') {
        toast.error(result.data?.result?.resultDescription || result.message || 'Failed to fetch disclaimer');
        setError('Failed to load disclaimer content');
      } else if (result.data?.idpDisclaimerText) {
        setDisclaimerText(result.data.idpDisclaimerText);
      } else {
        setError('Failed to load disclaimer content');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async () => {
    setSubmitting(true);

    const result = await acceptIdpDisclaimer({ idpDisclaimerId: 1 });
    const resultCode = result.data?.result?.resultCode;
    const isAccepted = result.raw?.status === true && resultCode === 'OK';

    if (isAccepted) {
      toast.success(result.message || 'Disclaimer accepted successfully');
      await updateIdpStatus('Pending', true);
      await updateIdpStepCount(2, true);
    } else {
      const description = result.data?.result?.resultDescription ?? '';
      toast.error(description || result.message || 'Failed to accept disclaimer');

      // A clinician who already signed the disclaimer is treated as progress too.
      const alreadySigned =
        resultCode === 'ERROR' && description.toLowerCase().includes('clinician has already signed disclaimer');
      if (alreadySigned) {
        await updateIdpStatus('Pending', true);
        await updateIdpStepCount(2, true);
      }
    }

    // Same as the web flow: always move on to the next step afterwards.
    setSubmitting(false);
    nextStep(3);
  };

  const footer = (
    <>
      <IdpButton label="Cancel" variant="outline-danger" onPress={cancelFlow} />
      <IdpButton
        label="Accept & Next"
        variant="success"
        onPress={handleAccept}
        disabled={!disclaimerAccepted || loading || !!error}
        loading={submitting}
        flex
      />
    </>
  );

  if (loading) {
    return (
      <IdpScreen>
        <IdpLoading />
      </IdpScreen>
    );
  }

  if (error) {
    return (
      <IdpScreen footer={footer}>
        <Text style={styles.error}>{error}</Text>
      </IdpScreen>
    );
  }

  return (
    <IdpScreen footer={footer}>
      <Text style={styles.heading}>Identity Proofing Disclaimer</Text>
      <LegalTextView blocks={blocks} />
      <IdpCheckbox checked={disclaimerAccepted} onChange={setDisclaimerAccepted}>
        I agree to the terms and consent to identity verification
      </IdpCheckbox>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  error: { color: '#dc3545', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
});
