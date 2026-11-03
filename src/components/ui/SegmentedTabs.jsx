import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, adTokens } from '../../theme/colors';

/**
 * Shared segmented tab bar: a rounded gray track holding the segments, with the active one
 * filled by the brand gradient (the same one AppHeader/DoctorTabBar use for their own active
 * states) and lifted off the track with a soft shadow. Replaces several near-identical,
 * plainer tab bars that had drifted across the app (flat-color pills, bottom-border
 * underlines, bare text) with one consistent, more polished look.
 *
 * `tabs`: [{ key, label, icon?, count? }]. `count` renders a small badge next to the label
 * when > 0 (shown on any tab that has one, active or not - e.g. an unread count).
 *
 * `scrollable`: segments size to their content and the track scrolls horizontally - for a
 * variable-length or many-tab set (e.g. Settings). Otherwise every segment is equal width and
 * the track never scrolls - for a small fixed set (e.g. a detail modal's 2-4 tabs).
 */
export default function SegmentedTabs({ tabs, activeKey, onChange, scrollable = false, style }) {
  const content = tabs.map((tab) => {
    const isActive = tab.key === activeKey;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onChange(tab.key)}
        // The shadow lives on this outer view; the gradient + its rounded-corner clip live on
        // the inner one - a shadow on a view with `overflow: hidden` (needed to clip the
        // gradient to the radius) gets clipped away along with everything else.
        style={[!scrollable && styles.segmentFlex, isActive && styles.segmentActiveShadow]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.segment}>
          {isActive ? (
            <LinearGradient
              colors={colors.authGradient}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.segmentContent}>
            {tab.icon ? (
              <MaterialCommunityIcons name={tab.icon} size={15} color={isActive ? adTokens.white : adTokens.textSecondary} />
            ) : null}
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <View style={[styles.count, isActive && styles.countActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]} numberOfLines={1}>
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.track}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.track, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: adTokens.gray100,
  },
  segment: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  segmentFlex: { flex: 1 },
  // Separate from `segment` (which has overflow: hidden, clipping the gradient to the
  // rounded corners) - a shadow on an overflow-hidden view gets clipped away too.
  segmentActiveShadow: {
    shadowColor: colors.accentDarker,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary },
  labelActive: { color: adTokens.white },
  count: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: adTokens.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  countActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'transparent' },
  countText: { fontSize: 10.5, fontWeight: '800', color: adTokens.textSecondary },
  countTextActive: { color: adTokens.white },
});
