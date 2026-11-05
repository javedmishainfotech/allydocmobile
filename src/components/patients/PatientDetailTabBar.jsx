import React from 'react';
import { View, StyleSheet } from 'react-native';
import SegmentedTabs from '../ui/SegmentedTabs';
import { adTokens } from '../../theme/colors';

// All 9 ViewPatientPage.jsx tabs in one horizontally-scrollable segmented row, same
// look/behavior as every other tab bar in the app (Settings, Treatment Plan, Doctor
// Detail, ...) instead of this screen's own paginated "More" page.
const TABS = [
  { key: 'personal', label: 'Personal', icon: 'account-outline' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar-month-outline' },
  { key: 'prescriptions', label: 'Prescriptions', icon: 'file-document-outline' },
  { key: 'history', label: 'Medications', icon: 'pill' },
  { key: 'allergies', label: 'Allergies', icon: 'alert-outline' },
  { key: 'coverage', label: 'Coverage', icon: 'shield-check-outline' },
  { key: 'selfreported', label: 'Self Reported', icon: 'clipboard-text-outline' },
  { key: 'rxchange', label: 'RxChange', icon: 'swap-horizontal' },
  { key: 'refills', label: 'Refills', icon: 'autorenew' },
];

// Nurse role is restricted to a view-only subset of these tabs (web: ViewPatientPage.jsx
// NURSE_ALLOWED_TABS).
export const NURSE_ALLOWED_TABS = ['personal', 'appointments', 'prescriptions'];

export default function PatientDetailTabBar({ activeTab, onSelectTab, isNurse = false }) {
  const tabs = isNurse ? TABS.filter((t) => NURSE_ALLOWED_TABS.includes(t.key)) : TABS;
  return (
    <View style={styles.wrap}>
      {/* Nurse's 3-tab subset fits comfortably as an equal-width, non-scrolling row (per
          SegmentedTabs' own doc comment: that mode is for a small fixed set) - only the full
          9-tab set needs horizontal scrolling. */}
      <SegmentedTabs tabs={tabs} activeKey={activeTab} onChange={onSelectTab} scrollable={!isNurse} style={styles.track} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border, paddingVertical: 10 },
  track: { paddingHorizontal: 16 },
});
