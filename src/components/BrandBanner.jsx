import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AllyDocLogo from './AllyDocLogo';
import { colors } from '../theme/colors';

// Height of the header's own content row (logo + optional right-hand action).
// Fixed, so the band is exactly `status-bar inset + CONTENT_HEIGHT` on every screen
// that uses it and never grows with its content (a taller band pushes the form down
// and can tip a short screen into scrolling).
const CONTENT_HEIGHT = 70;

/**
 * The dark-blue brand header of the auth screens: the web login page's branding panel
 * (160deg #0F172A -> #1E3A5F -> #1D4ED8, faint decorative rings, white AllyDoc logo)
 * as a straight, solid band.
 *
 * Structure, top to bottom:
 *   1. status-bar spacer - exactly the safe-area top inset, nothing else, so the band
 *      reaches behind the status bar while the content below never sits under it;
 *   2. content row - fixed height, the logo on the left and `children` (e.g. the
 *      onboarding Skip button) on the right, both centred on the same line.
 * The rings sit behind both and don't take part in layout.
 *
 * It also owns the status-bar ICON colour for every screen that shows it. The app's global
 * <StatusBar style="auto" /> resolves to DARK icons in this light-locked app, which are
 * all but invisible on this dark-blue band - so while the banner's screen is focused we ask
 * for light icons. Only when focused: these screens stay mounted underneath pushed ones
 * (e.g. the white-header LegalWebView), and expo-status-bar merges mounted StatusBars in
 * mount order, so an unfocused banner would otherwise keep white icons on a white header.
 * Unmounting/unfocusing falls back to the global setting.
 */
export default function BrandBanner({ children }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  return (
    <>
      {isFocused ? <StatusBar style="light" /> : null}
      <LinearGradient
        colors={colors.authGradient}
        locations={[0, 0.4, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.banner}
      >
        {/* Decorative rings, as on the web panel (.auth-circle). */}
        <View style={[styles.circle, styles.circleA]} pointerEvents="none" />
        <View style={[styles.circle, styles.circleB]} pointerEvents="none" />

        <View style={{ height: insets.top }} />
        <View style={styles.content}>
          <View accessible accessibilityRole="image" accessibilityLabel="AllyDoc">
            <AllyDocLogo light height={34} />
          </View>
          {children}
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 24,
    // Clips the decorative rings to the band's straight edges.
    overflow: 'hidden',
  },
  content: {
    height: CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleA: { width: 200, height: 200, top: -90, right: -60, borderWidth: 26 },
  circleB: { width: 130, height: 130, bottom: -70, left: -40, borderWidth: 18 },
});
