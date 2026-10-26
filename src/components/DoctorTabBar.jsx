import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../theme/colors';

// 'More' is not a real screen: pressing it opens the More sheet (see
// DoctorTabsNavigator) instead of navigating.
const MORE_META = { label: 'More', icon: 'dots-horizontal', iconActive: 'dots-horizontal' };

// The tabs are whatever the backend menu returned (title + icon from the menu
// item); a few well-known screens get a filled "active" icon / a different
// default icon so each tab keeps ONE recognisable symbol. Label is only used
// for accessibility - the dock itself shows icons only.
const ICON_OVERRIDES = { DoctorDashboard: 'home-outline', ManageAppointments: 'calendar-month-outline' };
const ACTIVE_ICONS = {
  DoctorDashboard: 'home',
  DoctorPatients: 'account-multiple',
  ManageAppointments: 'calendar-month',
  DoctorMessage: 'message-text',
};

function metaForItem(item) {
  const icon = ICON_OVERRIDES[item.key] || item.icon || 'circle-outline';
  return {
    label: item.title,
    icon,
    iconActive: ACTIVE_ICONS[item.key] || icon,
  };
}

export const DOCK_HEIGHT = 68;
const DOCK_SIDE_MARGIN = 16;
const DOCK_PADDING = 8;
const PILL_HEIGHT = 50;
const MAX_PILL_WIDTH = 62;
const DOCK_RADIUS = DOCK_HEIGHT / 2;

// RN's built-in Animated (not reanimated - this project has no babel.config.js
// wiring its plugin). Everything below animates transforms only, so it all runs
// natively.
function TabItem({ meta, isActive, onPress }) {
  const iconPop = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(iconPop, { toValue: isActive ? 1 : 0, useNativeDriver: true, friction: 6, tension: 120 }).start();
  }, [isActive, iconPop]);

  // The icon the pill lands on lifts slightly.
  const iconScale = iconPop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => Animated.spring(press, { toValue: 0.86, useNativeDriver: true, speed: 50 }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 5 }).start()}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={meta.label}
    >
      <Animated.View style={{ transform: [{ scale: Animated.multiply(press, iconScale) }] }}>
        <MaterialCommunityIcons
          name={isActive ? meta.iconActive : meta.icon}
          size={23}
          color={isActive ? adTokens.white : adTokens.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Floating frosted-WHITE glass dock for the doctor tabs (the first four backend
 * menu entries, then More). A pill detached from the screen edges: a real blur of
 * whatever scrolls beneath it (via `blurTarget` on Android), a translucent white
 * tint, a hairline border and a soft top highlight - so it reads as glass over the
 * content rather than a flat bar. ONE blue pill sits behind the active icon and
 * glides (spring + brief stretch) to the next tab on switch. Icons only; names are
 * just accessibility labels. `moreOpen` moves the pill onto More while its sheet is
 * showing, since More never becomes the focused route.
 *
 * Positioned absolutely over the scenes (the navigator's own tab bar renders
 * nothing - see DoctorTabsNavigator), so pages pad their bottom by the dock inset.
 */
export default function DoctorTabBar({
  state,
  navigation,
  tabItems,
  onMorePress,
  moreOpen,
  blurTarget,
  bottomOffset,
}) {
  const [rowWidth, setRowWidth] = useState(0);
  const pillX = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const lastPlaced = useRef({ width: 0, index: -1 });

  const tabCount = state.routes.length;
  const moreIndex = state.routes.findIndex((route) => route.name === 'More');
  const activeIndex = moreOpen && moreIndex >= 0 ? moreIndex : state.index;
  const tabWidth = rowWidth / tabCount;
  const pillWidth = Math.min(MAX_PILL_WIDTH, Math.max(tabWidth - 6, 40));
  const targetX = activeIndex * tabWidth + (tabWidth - pillWidth) / 2;

  useEffect(() => {
    if (!rowWidth) return;
    const placed = lastPlaced.current;
    lastPlaced.current = { width: rowWidth, index: activeIndex };

    // First layout, or the dock itself resized / the tab count changed (menu loaded):
    // jump straight there - nothing to animate between.
    if (placed.index < 0 || placed.width !== rowWidth) {
      pillX.setValue(targetX);
      return;
    }
    if (placed.index === activeIndex) return;

    Animated.spring(pillX, { toValue: targetX, useNativeDriver: true, friction: 8, tension: 85 }).start();
    Animated.sequence([
      Animated.timing(stretch, { toValue: 1.16, duration: 110, useNativeDriver: true }),
      Animated.spring(stretch, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }),
    ]).start();
  }, [activeIndex, rowWidth, targetX, pillX, stretch]);

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.shadow}>
        <View style={styles.dock}>
          {/* Glass: blur of what is behind, then a translucent white tint over it. On
              Android the blur only samples the BlurTargetView it is pointed at. */}
          <BlurView
            style={StyleSheet.absoluteFill}
            tint="light"
            intensity={60}
            blurTarget={blurTarget}
            blurMethod="dimezisBlurViewSdk31Plus"
          />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.82)', 'rgba(255, 255, 255, 0.58)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Bright edge along the top, the way glass catches light. */}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.highlight}
            pointerEvents="none"
          />

          <View style={styles.row} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
            {rowWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pillWrap,
                  { width: pillWidth, transform: [{ translateX: pillX }, { scaleX: stretch }] },
                ]}
              >
                <LinearGradient
                  colors={['#4F9BFF', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pill}
                />
              </Animated.View>
            ) : null}
            {state.routes.map((route, index) => {
              const isMore = route.name === 'More';
              const item = tabItems.find((tabItem) => tabItem.key === route.name);
              const meta = isMore ? MORE_META : item ? metaForItem(item) : null;
              if (!meta) return null;

              return (
                <TabItem
                  key={route.key}
                  meta={meta}
                  isActive={index === activeIndex}
                  onPress={() => {
                    if (isMore) {
                      onMorePress();
                      return;
                    }
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!event.defaultPrevented && state.index !== index) navigation.navigate(route.name);
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: DOCK_SIDE_MARGIN, right: DOCK_SIDE_MARGIN },
  // iOS shadow only (the dock itself is translucent, so an Android elevation shadow
  // would show through the glass and grey it out).
  shadow: {
    borderRadius: DOCK_RADIUS,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  dock: {
    height: DOCK_HEIGHT,
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: DOCK_PADDING,
  },
  highlight: { position: 'absolute', top: 0, left: DOCK_RADIUS, right: DOCK_RADIUS, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', height: PILL_HEIGHT },
  tab: { flex: 1, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pillWrap: { position: 'absolute', left: 0, top: 0, height: PILL_HEIGHT },
  pill: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
});
