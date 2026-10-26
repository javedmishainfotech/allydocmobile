import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View, StyleSheet } from 'react-native';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpAlert, IdpLinkButton, IdpLoading } from './IdpUi';
import VerificationFlowSummary from './VerificationFlowSummary';
import IdentityProofingCard from './IdentityProofingCard';
import { TwoFactorCard, TfaDeactivationCard } from './TwoFactorCards';
import ExperianFailedFallback from './ExperianFailedFallback';
import { openExternalLink } from '../../utils/openExternalLink';
import { adTokens } from '../../theme/colors';
import { isTfaActivated, isTfaDeactivationLifecycle } from '../../utils/idpStatus';

const AUTO_DISMISS_SECONDS = 10;
const ID_ME_URL = 'https://id.me/';

/**
 * Dismissible alert that closes itself after AUTO_DISMISS_SECONDS and shows the
 * countdown (web: statusAlertMessage / idpCompletionAlert). `source` is
 * `{ id, variant, message } | null`; a new `id` shows the alert again.
 */
function useAutoDismissAlert(source) {
  const [dismissedId, setDismissedId] = useState(null);
  const [remaining, setRemaining] = useState(AUTO_DISMISS_SECONDS);
  const sourceId = source?.id ?? null;

  useEffect(() => {
    if (sourceId === null) return undefined;
    const interval = setInterval(() => setRemaining((prev) => Math.max(prev - 1, 0)), 1000);
    return () => {
      clearInterval(interval);
      setRemaining(AUTO_DISMISS_SECONDS);
    };
  }, [sourceId]);

  const visible = source !== null && dismissedId !== sourceId && remaining > 0;
  return {
    alert: visible ? source : null,
    countdown: visible ? remaining : null,
    dismiss: () => setDismissedId(sourceId),
  };
}

/** Port of IdentityProofingOverview.jsx. */
export default function OverviewScreen() {
  const {
    ready,
    idpStatus,
    tfaStatus,
    idpAttemptCount,
    checkRegistrationStatus,
    navigate,
    openDrawerScreen,
  } = useIdentityProofing();

  const [statusAlertSource, setStatusAlertSource] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isIdpVerified = idpStatus === 'idpsuccess';
  const isIdpFailed = idpStatus === 'idperror';

  // Shown on every visit while IDP is success/error (no "already shown once" gate), like the web page.
  const completionAlertSource = isIdpVerified
    ? {
        id: 'idp-success',
        variant: 'success',
        message: 'Your IDP is successfully Completed, You can now proceed to the next step(TFA)',
      }
    : isIdpFailed
      ? { id: 'idp-error', variant: 'danger', message: 'Your IDP is failed, Try ID.me' }
      : null;

  const statusAlert = useAutoDismissAlert(statusAlertSource);
  const completionAlert = useAutoDismissAlert(completionAlertSource);

  const syncStatus = useCallback(async () => {
    const message = await checkRegistrationStatus();
    if (message) setStatusAlertSource({ id: Date.now(), variant: 'success', message });
  }, [checkRegistrationStatus]);

  // Web runs this check once on mount (once the stored statuses are loaded).
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    (async () => {
      const message = await checkRegistrationStatus();
      if (!cancelled && message) setStatusAlertSource({ id: Date.now(), variant: 'success', message });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, checkRegistrationStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncStatus();
    setRefreshing(false);
  };

  if (!ready) {
    return (
      <IdpScreen>
        <IdpLoading />
      </IdpScreen>
    );
  }

  const renderDismissibleAlert = ({ alert, countdown, dismiss }) =>
    alert ? (
      <IdpAlert
        variant={alert.variant}
        onClose={dismiss}
        footnote={countdown !== null ? `(Auto dismissing in ${countdown} sec)` : undefined}
        style={styles.alertSpacing}
      >
        {alert.message}
      </IdpAlert>
    ) : null;

  const showTfaBackHome = isIdpVerified && isTfaActivated(tfaStatus);

  return (
    <IdpScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      {renderDismissibleAlert(statusAlert)}
      {renderDismissibleAlert(completionAlert)}

      <VerificationFlowSummary />

      {isIdpFailed || idpAttemptCount > 0 ? (
        <ExperianFailedFallback
          idpAttemptCount={idpAttemptCount}
          idpStatus={idpStatus}
          onStartIdMe={() => openExternalLink(ID_ME_URL)}
          onViewGuide={() => navigate('idme-guide')}
        />
      ) : null}

      <View style={styles.cards}>
        <IdentityProofingCard />
        {isTfaDeactivationLifecycle(tfaStatus) ? <TfaDeactivationCard /> : <TwoFactorCard />}
      </View>

      {showTfaBackHome ? (
        <View style={styles.backHome}>
          <IdpLinkButton label="Back to Home" onPress={() => openDrawerScreen('DoctorDashboard')} />
        </View>
      ) : null}
    </IdpScreen>
  );
}

const styles = StyleSheet.create({
  alertSpacing: { marginBottom: 12 },
  cards: { gap: 16 },
  backHome: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: adTokens.gray200,
    alignItems: 'flex-end',
  },
});
