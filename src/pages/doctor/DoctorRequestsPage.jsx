import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import RefillsTab from '../../components/patients/RefillsTab';
import RxChangeTab from '../../components/patients/RxChangeTab';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

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

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

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
  tabBar: { flexDirection: 'row', backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: adTokens.primary },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  tabLabelActive: { color: adTokens.primaryDark },
  body: { padding: 16 },
});
