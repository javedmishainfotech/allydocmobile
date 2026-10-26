import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, AccessibilityInfo, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, adTokens } from '../../theme/colors';

// Where each floating chip sits around the disc (fractions of the illustration box).
const CHIP_SLOTS = [
  { top: '6%', left: 0 },
  { bottom: '12%', right: 0 },
  { top: '58%', left: '2%' },
];

/** A floating label chip that gently bobs, unless the user asked for reduced motion. */
function FloatingChip({ chip, slot, delay, animate }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      bob.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1800, delay, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, bob, delay]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View style={[styles.chip, slot, { transform: [{ translateY }] }]}>
      <View style={styles.chipIcon}>
        <MaterialCommunityIcons name={chip.icon} size={15} color={colors.accentDark} />
      </View>
      <Text style={styles.chipLabel} numberOfLines={1}>
        {chip.label}
      </Text>
    </Animated.View>
  );
}

/**
 * Onboarding visual built from the app's own icon language (tinted circles, like
 * RoleCard) rather than stock art: a soft halo, a gradient disc holding the slide's
 * icon, and floating chips that name the real screens the slide is about.
 * Purely decorative, so it is hidden from screen readers (the title + description
 * beside it carry the meaning).
 */
export default function OnboardingIllustration({ slide, size, active }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  const disc = size * 0.4;

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.halo, { width: size * 0.92, height: size * 0.92, borderRadius: size }]} />
      <View style={[styles.ring, { width: size * 0.68, height: size * 0.68, borderRadius: size }]} />

      <LinearGradient
        colors={[colors.accent, colors.accentDarker]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2 }]}
      >
        <MaterialCommunityIcons name={slide.icon} size={disc * 0.5} color={colors.white} />
      </LinearGradient>

      {slide.chips.map((chip, index) => (
        <FloatingChip
          key={chip.label}
          chip={chip}
          slot={CHIP_SLOTS[index % CHIP_SLOTS.length]}
          delay={index * 350}
          animate={active && !reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.accentLight },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.hintBorder,
    borderStyle: 'dashed',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentDark,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorderInactive,
    ...adTokens.cardShadow,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: colors.heading },
});
