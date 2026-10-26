import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCheckbox, IdpLoading } from './IdpUi';
import LegalTextView from './LegalTextView';
import { getLegalAgreement, acceptLegalAgreement } from '../../services/identityProofingService';
import { parseLegalAgreementForDisplay } from '../../utils/legalTextParser';
import { getItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

/** Port of components/IdentityProofing/Step2Consent.jsx. */
export default function Step2Consent() {
  const { profile } = useAuth();
  const {
    consentAccepted,
    setConsentAccepted,
    nextStep,
    cancelFlow,
    updateIdpStatus,
    updateIdpStepCount,
  } = useIdentityProofing();

  const [agreementText, setAgreementText] = useState('');
  const [agreementId, setAgreementId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const blocks = useMemo(() => parseLegalAgreementForDisplay(agreementText), [agreementText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clinicianId = await getItem('doseSpotRefrenceId');
      if (!clinicianId) {
        if (!cancelled) {
          setError('Unable to fetch user information');
          setLoading(false);
        }
        return;
      }

      const result = await getLegalAgreement(clinicianId);
      if (cancelled) return;

      if (!result.success) {
        toast.error(result.message || 'Failed to fetch legal agreement');
        setError('Failed to load agreement content');
      } else {
        const text = result.data?.agreementText || result.raw?.agreementText;
        const id = result.data?.agreementId || result.raw?.agreementId;
        if (text) setAgreementText(text);
        else setError('Failed to load agreement content');
        if (id) setAgreementId(id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async () => {
    setSubmitting(true);

    const result = await acceptLegalAgreement({
      agreementId: agreementId || 1,
      nameSigned: profile?.fullName,
    });

    const isAccepted = result.raw?.status === true && result.data?.result?.resultCode === 'OK';

    if (isAccepted) {
      toast.success(result.message || 'Agreement accepted successfully');
      // Only after a successful signature do we advance the stored IDP progress.
      await updateIdpStatus('Pending', true);
      await updateIdpStepCount(1, true);
    } else {
      toast.error(result.data?.result?.resultDescription || result.message || 'Failed to accept agreement');
    }

    // Same as the web flow: always move on to the next step afterwards.
    setSubmitting(false);
    nextStep(2);
  };

  const footer = (
    <>
      <IdpButton label="Cancel" variant="outline-danger" onPress={cancelFlow} />
      <IdpButton
        label="Accept & Next"
        variant="success"
        onPress={handleAccept}
        disabled={!consentAccepted || loading || !!error}
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
      <Text style={styles.heading}>Consent Agreement</Text>
      <LegalTextView blocks={blocks} />
      <IdpCheckbox checked={consentAccepted} onChange={setConsentAccepted}>
        I agree to the terms and consent to identity verification
      </IdpCheckbox>
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  error: { color: '#dc3545', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
});
