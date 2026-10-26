import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, BackHandler, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActivityIndicator, Button } from 'react-native-paper';
import { colors } from '../../theme/colors';

/**
 * Generic in-app WebView screen for the web app's own Privacy Policy / Terms
 * & Conditions pages (reused for both via route.params - see legalLinks.js
 * for the verified URLs). Reusing one screen avoids duplicating two nearly
 * identical screens.
 */
export default function LegalWebViewScreen({ route, navigation }) {
  const { url, title } = route.params || {};
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    navigation.setOptions({ title: title || 'AllyDoc' });
  }, [navigation, title]);

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
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
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
