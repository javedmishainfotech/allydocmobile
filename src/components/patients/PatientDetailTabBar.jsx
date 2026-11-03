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

export default function PatientDetailTabBar({ activeTab, onSelectTab }) {
  return (
    <View style={styles.wrap}>
      <SegmentedTabs tabs={TABS} activeKey={activeTab} onChange={onSelectTab} scrollable style={styles.track} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border, paddingVertical: 10 },
  track: { paddingHorizontal: 16 },
});
