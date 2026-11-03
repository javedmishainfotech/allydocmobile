import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { confirmFailedPayment, confirmSuccessfulPayment } from '../../services/subscriptionService';
import { getPaymentResultConfig, parsePaymentReturnUrl } from '../../utils/paymentFlow';
import { adTokens } from '../../theme/colors';

const PAYMENT_URL = Constants.expoConfig?.extra?.paymentUrl || 'https://test.authorize.net/payment/payment';
// RN's URL polyfill has no `.origin`, so take it from the string.
const PAYMENT_ORIGIN = PAYMENT_URL.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i)?.[0] || undefined;
const MAX_ATTEMPTS = 3; // same as the web's Success page
const RETRY_DELAY_MS = 2000;

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The web posts a hidden-field form ({ token }) to the hosted payment page; the WebView does the same. */
const buildCheckoutHtml = (token) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>` +
  `<body onload="document.forms[0].submit()"><form method="POST" action="${escapeHtml(PAYMENT_URL)}">` +
  `<input type="hidden" name="token" value="${escapeHtml(token)}"></form></body></html>`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Secure checkout for a hosted-payment `token` (subscription purchase / renewal, appointment
 * booking): opens the payment processor's page in a WebView, watches for the redirect back to the
 * web app's `/success/<token>` or `/failure/<token>` page, and - exactly as those pages do -
 * confirms the outcome with the backend (`POST /SuccessPayment/{token}`, retried up to 3 times;
 * `POST /FailurePayment/{token}`), then shows the result. `onDone({ success, type })` runs when the
 * user closes the result; `onCancel` when they back out of the payment page.
 *
 * @param {{ visible: boolean, token: string|null, fallbackType?: string|null, onDone: Function, onCancel: Function }} props
 */
export default function PaymentCheckoutSheet({ visible, token, fallbackType = null, onDone, onCancel }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('paying'); // paying | confirming | success | failure | unconfirmed
  const [attempt, setAttempt] = useState(0);
  const [resolvedType, setResolvedType] = useState(fallbackType);
  const returnedToken = useRef(null);
  const handled = useRef(false);

  useEffect(() => {
    if (visible) {
      setPhase('paying');
      setAttempt(0);
      setResolvedType(fallbackType);
      returnedToken.current = null;
      handled.current = false;
    }
  }, [visible, token, fallbackType]);

  const html = useMemo(() => (token ? buildCheckoutHtml(token) : ''), [token]);

  const confirmSuccess = useCallback(async (paymentToken, urlType) => {
    setPhase('confirming');
    for (let tryNumber = 1; tryNumber <= MAX_ATTEMPTS; tryNumber += 1) {
      setAttempt(tryNumber);
      const result = await confirmSuccessfulPayment(paymentToken);
      if (result.success) {
        setResolvedType(result.data?.type || urlType || fallbackType);
        setPhase('success');
        return;
      }
      if (tryNumber < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS);
    }
    setPhase('unconfirmed');
  }, [fallbackType]);

  const confirmFailure = useCallback(async (paymentToken, urlType) => {
    setPhase('confirming');
    if (paymentToken) {
      const result = await confirmFailedPayment(paymentToken);
      setResolvedType(result.data?.type || urlType || fallbackType);
    } else {
      setResolvedType(urlType || fallbackType);
    }
    setPhase('failure');
  }, [fallbackType]);

  // Returns false to stop the WebView loading the web app's own success/failure page.
  const handleNavigation = useCallback(
    (url) => {
      const returned = parsePaymentReturnUrl(url);
      if (!returned) return true;
      if (!handled.current) {
        handled.current = true;
        returnedToken.current = { token: returned.token, type: returned.type };
        if (returned.kind === 'success') confirmSuccess(returned.token, returned.type);
        else confirmFailure(returned.token, returned.type);
      }
      return false;
    },
    [confirmFailure, confirmSuccess],
  );

  const retryConfirmation = () => {
    const returned = returnedToken.current;
    if (returned?.token) confirmSuccess(returned.token, returned.type);
  };

  const success = phase === 'success';
  const resultConfig = getPaymentResultConfig(success ? 'success' : 'failure', resolvedType);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={phase === 'paying' ? onCancel : undefined}>
      <Toast />
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {phase === 'paying' ? (
          <>
            <View style={styles.bar}>
              <View style={styles.barTitle}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={adTokens.successDark} />
                <Text style={styles.barText}>Secure payment</Text>
              </View>
              <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel="Cancel payment">
                <MaterialCommunityIcons name="close" size={22} color={adTokens.textSecondary} />
              </Pressable>
            </View>
            {token ? (
              <WebView
                style={styles.flex1}
                originWhitelist={['*']}
                source={{ html, baseUrl: PAYMENT_ORIGIN }}
                onShouldStartLoadWithRequest={(request) => handleNavigation(request.url)}
                onNavigationStateChange={(state) => handleNavigation(state.url)}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loading}>
                    <ActivityIndicator size="large" color={adTokens.primary} />
                  </View>
                )}
                setSupportMultipleWindows={false}
              />
            ) : null}
          </>
        ) : (
          <View style={styles.result}>
            {phase === 'confirming' ? (
              <>
                <ActivityIndicator size="large" color={adTokens.primary} />
                <Text style={styles.resultTitle}>Confirming Payment</Text>
                <Text style={styles.resultText}>Please wait while we confirm your payment.</Text>
                {attempt > 0 ? (
                  <Text style={styles.attempt}>
                    Attempt {attempt} of {MAX_ATTEMPTS}
                  </Text>
                ) : null}
              </>
            ) : phase === 'unconfirmed' ? (
              <>
                <MaterialCommunityIcons name="clock-alert-outline" size={56} color={adTokens.warning} />
                <Text style={styles.resultTitle}>Payment not confirmed yet</Text>
                <Text style={styles.resultText}>
                  We couldn&apos;t confirm your payment yet. Tap Retry Confirmation to check again.
                </Text>
                <Pressable style={styles.primaryButton} onPress={retryConfirmation}>
                  <Text style={styles.primaryText}>Retry Confirmation</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => onDone({ success: false, type: resolvedType })}>
                  <Text style={styles.secondaryText}>Close</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.badge, { backgroundColor: success ? adTokens.successLight : adTokens.dangerLight }]}>
                  <MaterialCommunityIcons
                    name={success ? 'check-circle-outline' : 'close-circle-outline'}
                    size={48}
                    color={success ? adTokens.successDark : adTokens.dangerDark}
                  />
                </View>
                <Text style={styles.resultTitle}>{resultConfig.title}</Text>
                <Text style={styles.resultMessage}>{resultConfig.message}</Text>
                {success && resultConfig.description ? <Text style={styles.resultText}>{resultConfig.description}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={() => onDone({ success, type: resolvedType })}>
                  <Text style={styles.primaryText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: adTokens.white },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  barTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barText: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.white },

  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  badge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 20, fontWeight: '800', color: adTokens.textPrimary, textAlign: 'center' },
  resultMessage: { fontSize: 15, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'center' },
  resultText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center', lineHeight: 19 },
  attempt: { fontSize: 13, fontWeight: '700', color: adTokens.textSecondary },
  primaryButton: { marginTop: 8, paddingVertical: 13, paddingHorizontal: 40, borderRadius: 12, backgroundColor: adTokens.primary },
  primaryText: { fontSize: 14.5, fontWeight: '700', color: adTokens.white },
  secondaryButton: { paddingVertical: 10, paddingHorizontal: 30 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: adTokens.textSecondary },
});
