import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AllyDocLogo from './AllyDocLogo';
import { colors } from '../theme/colors';

/**
 * The dark-blue brand header: the web login page's branding panel (the
 * 160deg #0F172A -> #1E3A5F -> #1D4ED8 gradient with its faint decorative circles)
 * carrying the white AllyDoc logo, as a band across the top of the auth screens.
 * `children` sits on the right of the logo (e.g. the onboarding Skip button).
 * Covers the status-bar area itself, so screens using it need no top safe-area padding.
 */
export default function BrandBanner({ children }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors.authGradient}
      locations={[0, 0.4, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.banner, { paddingTop: insets.top + 14 }]}
    >
      {/* Decorative rings, as on the web panel (.auth-circle). */}
      <View style={[styles.circle, styles.circleA]} pointerEvents="none" />
      <View style={[styles.circle, styles.circleB]} pointerEvents="none" />

      <View style={styles.row}>
        <View accessible accessibilityRole="image" accessibilityLabel="AllyDoc">
          <AllyDocLogo light height={34} />
        </View>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingBottom: 22,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleA: { width: 200, height: 200, top: -90, right: -60, borderWidth: 26 },
  circleB: { width: 130, height: 130, bottom: -70, left: -40, borderWidth: 18 },
});
