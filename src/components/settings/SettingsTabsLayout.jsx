import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';
import SegmentedTabs from '../ui/SegmentedTabs';

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

      <SegmentedTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} scrollable style={styles.tabBar} />

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

  // flexShrink: 0 is the fix for the bar getting squashed: a ScrollView defaults to
  // flexShrink: 1, so when a tab's content below was tall (My Profile) the column gave the
  // tab bar's height away and its labels got clipped.
  tabBar: { flexGrow: 0, flexShrink: 0, marginHorizontal: 16, marginTop: 14, marginBottom: 2 },

  content: { padding: 16, paddingBottom: 32 },
});
