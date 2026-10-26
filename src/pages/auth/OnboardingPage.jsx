import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, BackHandler, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useOrg } from '../../hooks/useOrg';
import { ONBOARDING_SLIDES } from '../../constants/onboardingSlides';
import BrandBanner from '../../components/BrandBanner';
import AuthButton from '../../components/AuthButton';
import OnboardingIllustration from '../../components/onboarding/OnboardingIllustration';
import { colors } from '../../theme/colors';

const LAST_INDEX = ONBOARDING_SLIDES.length - 1;
const DOT_WIDTH = 20;

/** One animated page indicator dot: widens + brightens as its page scrolls into view. */
function Dot({ index, scrollX, pageWidth }) {
  const range = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
  const scaleX = scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
  return <Animated.View style={[styles.dot, { opacity, transform: [{ scaleX }] }]} />;
}

/**
 * Logged-out landing page (the mobile counterpart of the web app's "/" LandingPage): 4
 * swipeable slides about what the app really does, then the way into the existing auth
 * flow. It is the AuthStack's first screen, so it shows whenever the user is signed out -
 * on a fresh launch and again after logout.
 *  - Skip / Get Started -> OrgEntry (the normal first auth step: org code, or continue without one)
 *  - Log In            -> Login directly, with no organization (same as "continue without
 *                         an organization code" on OrgEntry)
 * Both push on top of this screen, so Back returns to the landing page, like the web.
 */
export default function OnboardingPage({ navigation }) {
  const { chooseOrg } = useOrg();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const isLast = index === LAST_INDEX;
  const compact = width < 340 || height < 640;
  const illustrationSize = Math.max(200, Math.min(width - 64, height * 0.36, 320));

  const goTo = useCallback(
    (nextIndex) => {
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    },
    [],
  );

  // Coming back here (Back from Org code / Login) always lands on the FIRST slide, not on
  // the last one the user tapped Get Started / Log In from. The screen stays mounted under
  // the pushed one, so its pager would otherwise still be sitting on that slide.
  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setIndex(0);
    }, []),
  );

  const finish = useCallback(
    (target) => {
      if (target === 'Login') chooseOrg('');
      navigation.navigate(target);
    },
    [chooseOrg, navigation],
  );

  // Android back steps to the previous slide; on the first slide it falls through
  // to the system default (leave the app - nothing sits behind the intro).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) {
        goTo(index - 1);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [index, goTo]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (event) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index && next >= 0 && next <= LAST_INDEX) setIndex(next);
    },
  });

  const renderItem = ({ item, index: itemIndex }) => (
    <View style={[styles.page, { width }]}>
      <OnboardingIllustration slide={item} size={illustrationSize} active={itemIndex === index} />
      <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
        {item.title}
      </Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Dark-blue brand header with the white logo; it also covers the status-bar area. */}
      <BrandBanner>
        {/* Kept in layout on the last slide (just invisible) so nothing below shifts. */}
        <Pressable
          onPress={() => finish('OrgEntry')}
          disabled={isLast}
          hitSlop={12}
          style={[styles.skip, isLast && styles.skipHidden]}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
          accessibilityElementsHidden={isLast}
          importantForAccessibility={isLast ? 'no-hide-descendants' : 'auto'}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </BrandBanner>

      {/* Animated.FlatList (not FlatList): the native-driven scrollX below only attaches to an animated component. */}
      <Animated.FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(slide) => slide.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        style={styles.pager}
      />

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_SLIDES.length}`}
        >
          {ONBOARDING_SLIDES.map((slide, dotIndex) => (
            <Dot key={slide.key} index={dotIndex} scrollX={scrollX} pageWidth={width} />
          ))}
        </View>

        {/* Fixed height so the buttons don't jump when Next becomes Get Started + Log In. */}
        <View style={styles.actions}>
          {isLast ? (
            <>
              <AuthButton label="Get Started" onPress={() => finish('OrgEntry')} />
              <Pressable
                onPress={() => finish('Login')}
                style={({ pressed }) => [styles.outlineButton, pressed && styles.outlineButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Log in to your account"
              >
                <Text style={styles.outlineLabel}>Log In</Text>
              </Pressable>
            </>
          ) : (
            <AuthButton label="Next" onPress={() => goTo(index + 1)} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  skip: { paddingVertical: 8, paddingHorizontal: 6 },
  skipHidden: { opacity: 0 },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.white },

  pager: { flex: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 6 },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.heading,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: -0.4,
  },
  titleCompact: { fontSize: 22, marginTop: 12 },
  description: { fontSize: 15, lineHeight: 22, color: colors.bodyText, textAlign: 'center', marginTop: 4 },

  footer: { paddingHorizontal: 24, gap: 18 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT_WIDTH, height: 8, borderRadius: 4, backgroundColor: colors.accentDark },
  actions: { minHeight: 112, justifyContent: 'flex-start', gap: 12 },

  outlineButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonPressed: { backgroundColor: colors.accentLight },
  outlineLabel: { color: colors.accentDark, fontSize: 16, fontWeight: '600' },
});
