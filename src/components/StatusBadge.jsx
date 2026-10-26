import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { adTokens } from '../theme/colors';

// Exact port of AllyDocReactApp/src/components/ui/StatusBadge.jsx's statusConfig
// (.ad-badge--* variants in src/styles/components.css).
const STATUS_CONFIG = {
  completed: { bg: adTokens.successLight, color: adTokens.successDark, label: 'Completed' },
  scheduled: { bg: adTokens.infoLight, color: adTokens.infoDark, label: 'Scheduled' },
  accepted: { bg: adTokens.successLight, color: adTokens.successDark, label: 'Accepted' },
  confirmed: { bg: adTokens.primaryLight, color: adTokens.primaryDark, label: 'Confirmed' },
  inprogress: { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'In Progress' },
  'in progress': { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'In Progress' },
  rescheduled: { bg: '#EDE9FE', color: '#8B5CF6', label: 'Rescheduled' },
  requested: { bg: adTokens.infoLight, color: adTokens.infoDark, label: 'Requested' },
  cancelled: { bg: adTokens.dangerLight, color: adTokens.dangerDark, label: 'Cancelled' },
  pending: { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'Pending' },
  paymentpending: { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'Payment Pending' },
  active: { bg: adTokens.successLight, color: adTokens.successDark, label: 'Active' },
  inactive: { bg: adTokens.gray100, color: adTokens.textSecondary, label: 'Inactive' },
};

export default function StatusBadge({ status, showDot = true }) {
  const normalized = String(status || '').toLowerCase().trim();
  const config = STATUS_CONFIG[normalized] || { bg: adTokens.gray100, color: adTokens.textSecondary, label: status || 'Unknown' };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: config.color }]} /> : null}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 11, fontWeight: '700' },
});
