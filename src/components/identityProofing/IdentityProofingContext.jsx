import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getItem, setItem } from '../../utils/storage';
import { updateDoseSpotStatus } from '../../services/settingsService';
import { getRegistrationStatus } from '../../services/identityProofingService';
import { toast } from '../../utils/toast';
import {
  getIdentityDisplayStatus,
  getTfaDisplayStatus,
  getFullAccessStatus,
  isKnownTfaStatus,
  resolveTfaStatusFromApi,
} from '../../utils/idpStatus';

/**
 * Mobile counterpart of the <Outlet context> object built in
 * AllyDocReactAppLatest's IdentityProofing.jsx: the single source of truth for
 * IDP/TFA statuses (persisted under the same storage keys as the web
 * localStorage - idpStatus, idpAttemptCount, idpStepCount, tfaStatus - and
 * synced to the backend via /updateDoseSpotStatus), plus the in-memory
 * multi-step flow state and the screen stack used by the module.
 */

const IdentityProofingContext = createContext(null);

export function useIdentityProofing() {
  const ctx = useContext(IdentityProofingContext);
  if (!ctx) throw new Error('useIdentityProofing must be used inside <IdentityProofingProvider>');
  return ctx;
}

const OVERVIEW_ROUTE = { name: 'overview', params: undefined };

export function IdentityProofingProvider({ children, drawerNavigation }) {
  const [idpStatus, setIdpStatus] = useState('');
  const [idpAttemptCount, setIdpAttemptCount] = useState(0);
  const [idpStepCount, setIdpStepCount] = useState(0);
  const [tfaStatus, setTfaStatus] = useState('');
  const [ready, setReady] = useState(false);

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [formData, setFormData] = useState({});

  const [stack, setStack] = useState([OVERVIEW_ROUTE]);

  // Hydrate from storage once (web: the mount effect reading localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedIdp, storedAttempts, storedSteps, storedTfa] = await Promise.all([
        getItem('idpStatus'),
        getItem('idpAttemptCount'),
        getItem('idpStepCount'),
        getItem('tfaStatus'),
      ]);
      if (cancelled) return;

      const normalizedIdp = storedIdp ? storedIdp.toLowerCase() : '';
      if (normalizedIdp) setIdpStatus(normalizedIdp);
      if (storedAttempts) setIdpAttemptCount(parseInt(storedAttempts, 10) || 0);
      if (storedSteps) setIdpStepCount(parseInt(storedSteps, 10) || 0);

      if (storedTfa) {
        setTfaStatus(storedTfa.toLowerCase());
      } else {
        setTfaStatus(normalizedIdp === 'idpsuccess' ? 'not_started' : 'locked');
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncToBackend = useCallback(async (payload) => {
    const userId = await getItem('userId');
    if (!userId) return;
    const result = await updateDoseSpotStatus({ userId, ...payload });
    if (!result.success) {
      console.warn('[identityProofing] failed to sync status to backend:', payload.processName);
    }
  }, []);

  const updateIdpStatus = useCallback(
    async (newIdpStatus, sync = true) => {
      const normalized = newIdpStatus.toLowerCase();
      setIdpStatus(normalized);
      await setItem('idpStatus', normalized);

      const persistedTfa = await getItem('tfaStatus');
      if (normalized === 'idpsuccess') {
        if (!persistedTfa || persistedTfa === 'locked') {
          setTfaStatus('not_started');
          await setItem('tfaStatus', 'not_started');
        }
      } else if (normalized === 'idperror') {
        setTfaStatus('locked');
        await setItem('tfaStatus', 'locked');
      }

      if (sync) await syncToBackend({ processName: 'IDP', text: normalized });
    },
    [syncToBackend],
  );

  const updateIdpAttemptCount = useCallback(
    async (count, sync = true) => {
      setIdpAttemptCount(count);
      await setItem('idpAttemptCount', String(count));
      if (sync) await syncToBackend({ processName: 'IDPATTEMPT', text: String(count) });
    },
    [syncToBackend],
  );

  const updateIdpStepCount = useCallback(
    async (count, sync = true) => {
      setIdpStepCount(count);
      await setItem('idpStepCount', String(count));
      if (sync) await syncToBackend({ processName: 'IDP', stepCount: count });
    },
    [syncToBackend],
  );

  const updateTfaStatus = useCallback(
    async (newStatus, sync = true) => {
      const persistedIdp = ((await getItem('idpStatus')) || '').toLowerCase();
      // TFA can only move once IDP has succeeded (or be re-locked).
      if (persistedIdp !== 'idpsuccess' && newStatus !== 'locked') {
        console.warn('[identityProofing] TFA cannot be updated until IDP is successful');
        return;
      }

      const normalized = newStatus.toLowerCase();
      setTfaStatus(normalized);
      await setItem('tfaStatus', normalized);

      if (sync) await syncToBackend({ processName: 'TFA', text: normalized });
    },
    [syncToBackend],
  );

  /**
   * Port of the status check in IdentityProofingOverview's mount effect:
   * reads the live DoseSpot registration status and applies any IDP / TFA
   * change. Resolves with the user-facing "status updated" message, or null.
   */
  const checkRegistrationStatus = useCallback(async () => {
    const clinicianId = await getItem('doseSpotRefrenceId');
    if (!clinicianId) return null;

    const result = await getRegistrationStatus(clinicianId);
    if (!result.success) {
      const message = result.message || 'Failed to fetch registration status';
      toast.error(typeof message === 'string' ? message : 'Failed to fetch registration status');
      return null;
    }

    const statusFromDoseSpot = result.raw?.item;
    if (!statusFromDoseSpot) return null;

    const lower = statusFromDoseSpot.toLowerCase();

    if (lower === 'pending' || lower === 'idpsuccess' || lower === 'idperror') {
      await updateIdpStatus(statusFromDoseSpot, true);
      await updateIdpStepCount(0, true);
      return `IDP status updated: ${statusFromDoseSpot}`;
    }
    if (isKnownTfaStatus(lower)) {
      await updateTfaStatus(resolveTfaStatusFromApi(statusFromDoseSpot), true);
      return `TFA status updated: ${statusFromDoseSpot}`;
    }
    if (lower === 'tfaactivateinit') {
      await updateTfaStatus('Pending', true);
      return 'TFA status updated: Pending';
    }
    return null;
  }, [updateIdpStatus, updateIdpStepCount, updateTfaStatus]);

  const updateFormData = useCallback((data) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetFlowState = useCallback(() => {
    setFormData({});
    setConsentAccepted(false);
    setDisclaimerAccepted(false);
  }, []);

  // ---- screen stack (mobile replacement for the nested react-router routes) ----
  const route = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const navigate = useCallback((name, params) => {
    setStack((prev) => [...prev, { name, params }]);
  }, []);

  const replace = useCallback((name, params) => {
    setStack((prev) => [...prev.slice(0, -1), { name, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const goToOverview = useCallback(() => {
    setStack([OVERVIEW_ROUTE]);
  }, []);

  const goToStep = useCallback(
    (stepNumber) => {
      const safeStep = Math.min(Math.max(stepNumber, 1), 4);
      replace('step', { step: safeStep });
    },
    [replace],
  );

  const nextStep = useCallback(
    (fromStep) => {
      const next = Math.min(fromStep + 1, 4);
      replace('step', { step: next });
    },
    [replace],
  );

  const cancelFlow = useCallback(() => {
    resetFlowState();
    goToOverview();
  }, [goToOverview, resetFlowState]);

  const startFlow = useCallback(async () => {
    if (idpStatus === 'not_started' || !idpStatus) {
      updateIdpStatus('started', true);
    }
    const storedStep = Number(await getItem('idpStepCount')) || idpStepCount;
    // Resume where the clinician left off: 1 = consent signed, 2 = disclaimer signed.
    const target = storedStep === 1 ? 3 : storedStep === 2 ? 4 : 1;
    navigate('step', { step: target });
  }, [idpStatus, idpStepCount, navigate, updateIdpStatus]);

  const goToFacialSteps = useCallback(() => {
    resetFlowState();
    navigate('facial');
  }, [navigate, resetFlowState]);

  const openDrawerScreen = useCallback(
    (screenName, params) => {
      drawerNavigation?.navigate(screenName, params);
    },
    [drawerNavigation],
  );

  const idpDisplayStatus = getIdentityDisplayStatus(idpStatus);
  const tfaDisplayStatus = getTfaDisplayStatus(idpStatus, tfaStatus);
  const fullAccessStatus = getFullAccessStatus(idpStatus, tfaStatus);

  const value = useMemo(
    () => ({
      ready,
      idpStatus,
      idpAttemptCount,
      idpStepCount,
      tfaStatus,
      idpDisplayStatus,
      tfaDisplayStatus,
      fullAccessStatus,
      isTwoFactorLocked: idpStatus !== 'idpsuccess',

      updateIdpStatus,
      updateIdpAttemptCount,
      updateIdpStepCount,
      updateTfaStatus,
      checkRegistrationStatus,

      consentAccepted,
      setConsentAccepted,
      disclaimerAccepted,
      setDisclaimerAccepted,
      formData,
      updateFormData,
      resetFlowState,

      route,
      canGoBack,
      navigate,
      replace,
      goBack,
      goToOverview,
      goToStep,
      nextStep,
      cancelFlow,
      startFlow,
      goToFacialSteps,
      openDrawerScreen,
    }),
    [
      ready,
      idpStatus,
      idpAttemptCount,
      idpStepCount,
      tfaStatus,
      idpDisplayStatus,
      tfaDisplayStatus,
      fullAccessStatus,
      updateIdpStatus,
      updateIdpAttemptCount,
      updateIdpStepCount,
      updateTfaStatus,
      checkRegistrationStatus,
      consentAccepted,
      disclaimerAccepted,
      formData,
      updateFormData,
      resetFlowState,
      route,
      canGoBack,
      navigate,
      replace,
      goBack,
      goToOverview,
      goToStep,
      nextStep,
      cancelFlow,
      startFlow,
      goToFacialSteps,
      openDrawerScreen,
    ],
  );

  return <IdentityProofingContext.Provider value={value}>{children}</IdentityProofingContext.Provider>;
}
