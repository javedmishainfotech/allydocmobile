import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import ProfileTab from '../../components/settings/ProfileTab';
import ChangePasswordTab from '../../components/settings/ChangePasswordTab';
import CertificationsTab from '../../components/settings/CertificationsTab';
import AccountSettingsTab from '../../components/settings/AccountSettingsTab';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

// Exact tab set/order for the Freelancer Doctor variant (AllyDocReactApp's
// Settings/index.jsx tabs array): "Clinic Available Hours" is excluded because
// it's gated on `usertype !== "freelancer"`, and "Assign Disease" is excluded
// because it requires `usertype === "clinic"` - neither applies here.
const TABS = [
  { key: 'profile', label: 'My Profile', icon: 'account-outline' },
  { key: 'security', label: 'Change Password', icon: 'lock-outline' },
  { key: 'certifications', label: 'Certifications', icon: 'certificate-outline' },
  { key: 'account', label: 'Account Settings', icon: 'cog-outline' },
];

/** Port of AllyDocReactApp/src/module/Doctor/Pages/Settings/index.jsx for the
 * Freelancer Doctor variant - a horizontal tab bar (.ad-tabs) over a single
 * scrolling content area below, same as web. */
export default function DoctorSettingsPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const route = useRoute();
  const requestedTab = TABS.some((tab) => tab.key === route.params?.tab) ? route.params.tab : null;
  // A tab picked by hand wins until another screen deep-links to a different tab (web: ?tab=account).
  const [picked, setPicked] = useState({ tab: 'profile', forRequest: null });
  const activeTab = picked.forRequest === requestedTab ? picked.tab : requestedTab || 'profile';
  const setActiveTab = (tab) => setPicked({ tab, forRequest: requestedTab });

  return (
    <View style={styles.flex1}>
      {/* No repeated "Settings" title here - the navbar above already shows it. */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageSubtitle}>Manage your profile settings and more</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => {
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

      <ScrollView style={styles.flex1} contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}>
        {activeTab === 'profile' ? <ProfileTab userId={profile?.userId} /> : null}
        {activeTab === 'security' ? <ChangePasswordTab /> : null}
        {activeTab === 'certifications' ? <CertificationsTab userId={profile?.userId} /> : null}
        {activeTab === 'account' ? <AccountSettingsTab userId={profile?.userId} /> : null}
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
