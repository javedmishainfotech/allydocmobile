import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AllyDocLogo from './AllyDocLogo';
import { colors } from '../theme/colors';

// Height of the header below the status bar. Compact on purpose: the large branded
// banner belongs to the logged-out screens (BrandBanner); signed-in screens need the room.
const ROW_HEIGHT = 56;

/**
 * The compact signed-in header: the same dark-blue brand treatment as the login banner
 * (BrandBanner - same gradient, same white logo, a faint ring) at a fraction of the height.
 *
 *   no title, no back  -> the full AllyDoc logo (home screens)
 *   title              -> the brand mark + the title; with `onBack`, a back arrow replaces the mark
 *   `right`            -> actions on the right (bell, profile ...); nothing else ever goes there
 *
 * Used as a custom `header` by the signed-in navigators, which draw nothing of their own,
 * so a screen never ends up with two headers. It spends the safe-area top inset itself
 * (once - the navigators add none) and owns the status-bar icon colour: every signed-in
 * header is dark, so light icons are always right here (no focus bookkeeping needed,
 * unlike BrandBanner, which sits under screens that can show a white header on top).
 */
export default function AppHeader({ title, onBack, right }) {
  const insets = useSafeAreaInsets();
  const showFullLogo = !title && !onBack;

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={colors.authGradient}
        locations={[0, 0.4, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        {/* The same faint ring the login banner has, scaled down. */}
        <View style={styles.ring} pointerEvents="none" />

        <View style={styles.row}>
          {/* LEFT section: back arrow + screen title (or the logo on home screens). It takes all
              the space the actions leave and truncates a long title instead of pushing them. */}
          <View style={styles.left}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
              </Pressable>
            ) : null}

            {showFullLogo ? (
              <View accessible accessibilityRole="image" accessibilityLabel="AllyDoc">
                <AllyDocLogo light height={28} />
              </View>
            ) : (
              <>
                {!onBack ? (
                  <View accessible accessibilityRole="image" accessibilityLabel="AllyDoc">
                    <AllyDocLogo mark height={28} />
                  </View>
                ) : null}
                {title ? (
                  <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
                    {title}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {/* RIGHT section: the screen's actions (Identity Proofing, bell, profile menu). */}
          <View style={styles.right}>{right}</View>
        </View>
      </LinearGradient>
    </>
  );
}

/**
 * `header` option for the signed-in native stacks: back arrow + title on screens pushed
 * over another, the full logo on a stack's root screen (e.g. the Patient / Nurse dashboards).
 */
export function renderStackHeader({ navigation, options, back }) {
  return <AppHeader title={back ? options.title : undefined} onBack={back ? navigation.goBack : undefined} />;
}

const styles = StyleSheet.create({
  header: {
    // Straight edge (no curve) - clips the decorative ring to the band.
    overflow: 'hidden',
  },
  row: {
    height: ROW_HEIGHT,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  // Never shrinks, so the actions keep their size and stay on the right however long the
  // title is. The negative margin cancels the empty touch padding around the last button's
  // icon, so the group sits right at the edge of the content area.
  right: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', marginRight: -4 },
  title: { flexShrink: 1, fontSize: 18, fontWeight: '700', color: colors.white, letterSpacing: -0.2 },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    top: -60,
    right: -40,
    borderRadius: 999,
    borderWidth: 18,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});
