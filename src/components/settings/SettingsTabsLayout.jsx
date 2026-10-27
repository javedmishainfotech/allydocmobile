import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

/**
 * The Settings screen frame shared by every role (web: the `.ad-tabs` bar over one scrolling
 * content area): a horizontal chip row of `tabs` and the active tab's content below it.
 * `renderTab(key)` returns the content of a tab. A deep link (`route.params.tab`, the web's
 * `?tab=`) selects a tab; one this role doesn't have is ignored, as on the web.
 *
 * @param {{ tabs: {key: string, label: string, icon: string}[], renderTab: (key: string) => React.ReactNode }} props
 */
export default function SettingsTabsLayout({ tabs, renderTab, subtitle = 'Manage your profile settings and more' }) {
  const dockInset = useDockInset();
  const route = useRoute();
  const requestedTab = tabs.some((tab) => tab.key === route.params?.tab) ? route.params.tab : null;
  // A tab picked by hand wins until another screen deep-links to a different tab.
  const [picked, setPicked] = useState({ tab: tabs[0].key, forRequest: null });
  const activeTab = picked.forRequest === requestedTab ? picked.tab : requestedTab || tabs[0].key;
  const setActiveTab = (tab) => setPicked({ tab, forRequest: requestedTab });

  return (
    <View style={styles.flex1}>
      {/* No repeated "Settings" title here - the navbar above already shows it. */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={15}
                color={isActive ? adTokens.white : adTokens.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        keyboardShouldPersistTaps="handled"
      >
        {renderTab(activeTab)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 16, flexShrink: 0 },
  pageSubtitle: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 12 },

  // Scrollable chip row, not an underlined text-tab bar - bigger touch target
  // (full chip, not just the label text) and reads at a glance even mid-scroll,
  // since the active one carries its own filled background instead of relying
  // on an underline that can scroll out of view.
  // flexShrink: 0 is the fix for the chips getting squashed: a ScrollView defaults
  // to flexShrink: 1, so when a tab's content below was tall (My Profile) the
  // column gave the chip row's height away and the labels got clipped.
  tabBar: { flexGrow: 0, flexShrink: 0, marginTop: 14, marginBottom: 2 },
  tabBarContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  tabChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  tabLabelActive: { color: adTokens.white, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 32 },
});
