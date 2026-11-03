import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import RefillsTab from '../../components/patients/RefillsTab';
import RxChangeTab from '../../components/patients/RxChangeTab';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

const TABS = [
  { key: 'refill', label: 'Refill Change Request' },
  { key: 'rxchange', label: 'Rx Change Request' },
];

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/Requests/index.jsx: the clinic-wide Refill
 * and Rx Change pending-request queues, reusing the same tabs the per-patient chart already
 * built (RefillsTab/RxChangeTab) with `requestScope="clinic"` instead of `"patient"`.
 */
export default function DoctorRequestsPage() {
  const dockInset = useDockInset();
  const [activeTab, setActiveTab] = useState('refill');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.subtitle}>Review and act on refill and Rx change requests from pharmacies</Text>
      </View>

      <SegmentedTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} style={styles.tabBar} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 24 + dockInset }]}>
        {activeTab === 'refill' ? <RefillsTab requestScope="clinic" /> : <RxChangeTab requestScope="clinic" />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.gray50 },
  header: { padding: 16, backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  tabBar: { margin: 16, marginBottom: 0 },
  body: { padding: 16 },
});
