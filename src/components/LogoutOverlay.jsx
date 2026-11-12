import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { adTokens } from '../theme/colors';

/**
 * Port of the web's LogoutProgressModal: a mount-once overlay shown while `logoutUser()`'s
 * cleanup (revoke refresh token, unregister push token, wipe storage) is in flight. The web
 * version needs its own safety timeout and a route-change listener to close itself, since its
 * cleanup and its navigation are two separately-triggered things that could in principle drift
 * apart; here both come from the same Redux dispatch, so the overlay and the stack swap over to
 * the logged-out screen always land in the same render - nothing extra to synchronize.
 */
export default function LogoutOverlay() {
  const { isLoggingOut } = useAuth();

  return (
    <Modal visible={isLoggingOut} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={adTokens.primaryDark} />
          <Text style={styles.text}>Logging out...</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  card: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: adTokens.cardBorderRadius,
    backgroundColor: adTokens.bgBody,
    ...adTokens.cardShadow,
  },
  text: { fontSize: 14, fontWeight: '600', color: adTokens.textPrimary },
});
