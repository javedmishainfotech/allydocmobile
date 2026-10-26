import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

// First page: 5 real tabs + a "More" slot. Second page (revealed by "More"):
// a "Back" slot + the remaining 4 tabs. Matches the reference design's
// icon-over-label tab bar with a sliding second page instead of a single
// long scrolling row.
const PRIMARY_TABS = [
  { key: 'personal', label: 'Personal', icon: 'account-outline' },
  { key: 'appointments', label: 'Appts', icon: 'calendar-month-outline' },
  { key: 'prescriptions', label: 'Prescriptions', icon: 'file-document-outline' },
  { key: 'history', label: 'Medications', icon: 'pill' },
  { key: 'allergies', label: 'Allergies', icon: 'alert-outline' },
];

const MORE_TABS = [
  { key: 'coverage', label: 'Coverage', icon: 'shield-check-outline' },
  { key: 'selfreported', label: 'Self Reported', icon: 'clipboard-text-outline' },
  { key: 'rxchange', label: 'RxChange', icon: 'swap-horizontal' },
  { key: 'refills', label: 'Refills', icon: 'autorenew' },
];

function TabButton({ tab, isActive, onPress }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        <MaterialCommunityIcons name={tab.icon} size={20} color={isActive ? adTokens.primaryDark : adTokens.textSecondary} />
      </View>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
      {isActive ? <View style={styles.tabUnderline} /> : null}
    </Pressable>
  );
}

/**
 * All 9 ViewPatientPage.jsx tabs, shown as two "pages" of icon tabs instead
 * of one long scrolling row: the first 5 are always visible, tapping "More"
 * slides in the remaining 4 with a "Back" tab to slide back - per the
 * reference design's three-dot "More" pattern.
 */
export default function PatientDetailTabBar({ activeTab, onSelectTab }) {
  const [showMore, setShowMore] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goToPage = (toMore) => {
    setShowMore(toMore);
    Animated.timing(slideAnim, {
      toValue: toMore ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  // If the active tab lives on the "More" page (e.g. opened there directly),
  // jump straight to that page instead of hiding the active tab.
  useEffect(() => {
    const isMoreTab = MORE_TABS.some((tab) => tab.key === activeTab);
    if (isMoreTab !== showMore) goToPage(isMoreTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -containerWidth],
  });

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.pagesRow, { width: containerWidth * 2, transform: [{ translateX }] }]}>
        <View style={[styles.page, { width: containerWidth }]}>
          {PRIMARY_TABS.map((tab) => (
            <TabButton key={tab.key} tab={tab} isActive={activeTab === tab.key} onPress={() => onSelectTab(tab.key)} />
          ))}
          <Pressable style={styles.tabButton} onPress={() => goToPage(true)}>
            <View style={styles.iconWrap}>
              <Feather name="more-horizontal" size={20} color={adTokens.textSecondary} />
            </View>
            <Text style={styles.tabLabel}>More</Text>
          </Pressable>
        </View>

        <View style={[styles.page, { width: containerWidth }]}>
          <Pressable style={styles.tabButton} onPress={() => goToPage(false)}>
            <View style={styles.iconWrap}>
              <Feather name="chevron-left" size={22} color={adTokens.textSecondary} />
            </View>
            <Text style={styles.tabLabel}>Back</Text>
          </Pressable>
          {MORE_TABS.map((tab) => (
            <TabButton key={tab.key} tab={tab} isActive={activeTab === tab.key} onPress={() => onSelectTab(tab.key)} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
    overflow: 'hidden',
  },
  pagesRow: { flexDirection: 'row' },
  page: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 4 },
  tabButton: { alignItems: 'center', gap: 4, minWidth: 58 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: adTokens.primaryLight },
  tabLabel: { fontSize: 10.5, fontWeight: '600', color: adTokens.textSecondary, textAlign: 'center' },
  tabLabelActive: { color: adTokens.primaryDark, fontWeight: '700' },
  tabUnderline: { height: 2.5, width: 22, backgroundColor: adTokens.primary, borderRadius: 2, marginTop: 2 },
});
