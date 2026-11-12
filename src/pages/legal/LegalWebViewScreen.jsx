import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, BackHandler, Linking, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActivityIndicator, Button } from 'react-native-paper';
import { colors } from '../../theme/colors';

/**
 * Generic in-app WebView screen for the web app's own Privacy Policy / Terms
 * & Conditions pages (reused for both via route.params - see legalLinks.js
 * for the verified URLs). Reusing one screen avoids duplicating two nearly
 * identical screens.
 */

// Safety net for iOS: WKWebView's `onLoadEnd` only fires once EVERY sub-resource of the page
// (including the third-party CDN scripts/fonts these web pages pull in) has finished loading,
// and won't fire at all if one of them stalls - leaving the spinner stuck forever even though
// the page has actually rendered underneath. Android's WebView doesn't block this way. Watching
// `onLoadProgress` reach 1 is a more reliable "done" signal, and this timeout is the last-resort
// fallback if even that never comes.
const LOAD_TIMEOUT_MS = 12000;

// CONFIRMED on a real iOS device: the web app's bundle calls
// `navigator.serviceWorker.addEventListener(...)` unconditionally near the very top of its
// module, with no feature-detection (it's wiring up Firebase web-push). react-native-webview's
// WKWebView doesn't expose `navigator.serviceWorker` at all (it's `undefined`), so that line
// threw synchronously and aborted the whole script before React ever mounted - `#root` stayed
// empty, a blank white screen, and since the HTTP load itself succeeded this never surfaced as
// an `onError`/`onHttpError`. Android's WebView does support service workers, which is why the
// exact same page always rendered fine there. Stubbing `navigator.serviceWorker` with inert
// no-ops (only when it's actually missing) lets that line run without throwing, without
// touching the page's own code.
//
// The web app's bundle also calls `localStorage.setItem`/`getItem` unguarded (device-token
// bookkeeping) during startup; WKWebView can throw a SecurityError on Web Storage access under
// some iOS privacy configurations (e.g. "Block All Cookies"), which would be just as fatal, so
// that's guarded the same way as a precaution.
const COMPAT_SCRIPT = `(function () {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
    var listeners = {};
    var swStub = {
      addEventListener: function (type, handler) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(handler);
      },
      removeEventListener: function (type, handler) {
        if (listeners[type]) listeners[type] = listeners[type].filter(function (h) { return h !== handler; });
      },
      controller: null,
      ready: new Promise(function () {}),
      register: function () {
        return Promise.resolve({
          installing: null,
          waiting: null,
          active: null,
          addEventListener: function () {},
          update: function () { return Promise.resolve(); },
          unregister: function () { return Promise.resolve(true); },
        });
      },
      getRegistration: function () { return Promise.resolve(undefined); },
      getRegistrations: function () { return Promise.resolve([]); },
    };
    try {
      Object.defineProperty(navigator, 'serviceWorker', { value: swStub, configurable: true });
    } catch (e) {}
  }

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] || null; },
      get length() { return Object.keys(data).length; },
    };
  }
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    try {
      var probeKey = '__ad_storage_probe__';
      window[name].setItem(probeKey, '1');
      window[name].removeItem(probeKey);
    } catch (e) {
      try {
        Object.defineProperty(window, name, { value: memoryStorage(), configurable: true });
      } catch (e2) {}
    }
  });
  true;
})();`;

// RN's URL polyfill has no `.origin` (same workaround PaymentCheckoutSheet.jsx uses).
const getOrigin = (value) => String(value || '').match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i)?.[0] || null;

export default function LegalWebViewScreen({ route, navigation }) {
  const { url, title } = route.params || {};
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pageOrigin = useMemo(() => getOrigin(url), [url]);

  useEffect(() => {
    navigation.setOptions({ title: title || 'AllyDoc' });
  }, [navigation, title]);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, reloadKey]);

  // Keeps the WebView on the AllyDoc page it was opened for - a link to any other origin (an
  // outbound reference inside the terms/privacy text, say) opens in the device's own browser
  // instead of navigating this in-app view away from it.
  const handleShouldStartLoad = useCallback(
    (request) => {
      const requestOrigin = getOrigin(request.url);
      if (!pageOrigin || !requestOrigin || requestOrigin === pageOrigin) return true;
      Linking.openURL(request.url).catch(() => {});
      return false;
    },
    [pageOrigin],
  );

  // Android hardware back button: step back through the page's own history
  // first (matches normal browser behavior), only falling back to leaving
  // the screen once there's nowhere left to go back to inside the WebView.
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false; // let the default navigation.goBack() handle it
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>This page's URL couldn't be found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {hasError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn&apos;t load this page.</Text>
          <Text style={styles.errorSubtext}>Please check your internet connection.</Text>
          <Button mode="contained" onPress={handleRetry} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      ) : (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.flex}
          injectedJavaScriptBeforeContentLoaded={COMPAT_SCRIPT}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress >= 1) setLoading(false);
          }}
          onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          onHttpError={() => {
            setLoading(false);
            setHasError(true);
          }}
        />
      )}
      {loading && !hasError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accentDark} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  errorText: { fontSize: 16, fontWeight: '700', color: colors.heading },
  errorSubtext: { fontSize: 14, color: colors.bodyText, textAlign: 'center' },
  retryButton: { marginTop: 10 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
