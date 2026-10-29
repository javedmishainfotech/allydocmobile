import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { useNursePendingAppointments } from '../../hooks/useNursePendingAppointments';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import AssignDoctorModal from '../../components/nurse/AssignDoctorModal';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

/**
 * Port of AllyDocReactApp/src/module/Nurse/PendingAppointments/index.jsx: lists appointments
 * that have no doctor assigned yet and lets the nurse assign one via AssignDoctorModal.
 */
export default function NursePendingAppointmentsPage() {
  const dockInset = useDockInset();
  const { appointments, status, refresh } = useNursePendingAppointments();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const loading = status === 'idle' || (status === 'loading' && appointments.length === 0);

  const loadList = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      await refresh();
      if (isRefresh) setRefreshing(false);
    },
    [refresh],
  );

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // assignDoctorToPendingAppointment already refetches the list on success, no need to reload here.
  const handleAssigned = () => setSelectedAppointment(null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text style={styles.title}>Unassigned Pending Appointment</Text>
          <Text style={styles.subtitle}>You can assign doctors to these appointments</Text>
        </View>
        {!loading ? (
          <View style={styles.countBadge}>
            <Text style={styles.countLabel}>Total</Text>
            <Text style={styles.countValue}>{appointments.length}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item, index) => String(item.appointmentId ?? index)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + dockInset }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadList(true)} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-plus-outline" size={32} color={adTokens.textMuted} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyText}>There are no unassigned pending appointments at the moment.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const patientName = item.name?.trim() || 'Patient';
            const display = getAppointmentDisplay(item);
            return (
              <View style={styles.row}>
                <View style={styles.rowTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{patientName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    {item.consultReason ? (
                      <View style={styles.consultBadge}>
                        <Text style={styles.consultBadgeText}>{item.consultReason}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.inlineRow}>
                    <MaterialCommunityIcons name="calendar-outline" size={13} color={adTokens.textMuted} />
                    <Text style={styles.metaText}>{display.date}</Text>
                  </View>
                  <View style={styles.inlineRow}>
                    <MaterialCommunityIcons name="clock-outline" size={13} color={adTokens.textMuted} />
                    <Text style={styles.metaText}>{display.timeWithZone}</Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <StatusBadge status={item.appointmentStatus} />
                  <AppointmentInfoButton
                    rescheduleReason={item.rescheduleReason}
                    cancelReason={item.cancelReason}
                    remarks={item.remarks}
                    feedbackRating={item.feedbackRating}
                    feedbackComment={item.feedbackComment}
                  />
                </View>

                <Pressable style={styles.assignButton} onPress={() => setSelectedAppointment(item)}>
                  <Text style={styles.assignButtonText}>Assign Doctor</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <AssignDoctorModal
        visible={selectedAppointment != null}
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onAssigned={handleAssigned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.gray50 },
  flex1: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    padding: 16,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  countBadge: { alignItems: 'center', backgroundColor: adTokens.primaryTint, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  countLabel: { fontSize: 10, color: adTokens.primaryDark, fontWeight: '600' },
  countValue: { fontSize: 16, color: adTokens.primaryDark, fontWeight: '700' },
  loader: { marginTop: 40 },
  listContent: { padding: 16, gap: 10 },
  row: {
    backgroundColor: adTokens.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    padding: 12,
    gap: 10,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: adTokens.textSecondary },
  patientName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  consultBadge: { alignSelf: 'flex-start', backgroundColor: adTokens.infoLight, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4 },
  consultBadgeText: { fontSize: 11, color: adTokens.infoDark, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 16 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignButton: { backgroundColor: adTokens.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  assignButtonText: { color: adTokens.white, fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginTop: 4 },
  emptyText: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },
});
