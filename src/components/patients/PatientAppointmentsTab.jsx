import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { getPatientAppointmentHistory } from '../../services/patientsService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../StatusBadge';
import AppointmentInfoButton from '../AppointmentInfoButton';
import { adTokens } from '../../theme/colors';

// Freelancer doctor doesn't get the "Rescheduled" filter option on web
// (showRescheduledOption={!isFreelancerDoctorAppointmentFilter}).
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function getInfoButtonProps(item) {
  return {
    rescheduleReason: item?.rescheduleReason ?? item?.RescheduleReason,
    cancelReason: item?.cancelReason ?? item?.CancelReason,
    remarks: item?.remarks ?? item?.Remarks,
    feedbackRating: item?.feedbackRating ?? item?.FeedbackRating,
    feedbackComment: item?.feedbackComment ?? item?.FeedbackComment,
  };
}

function AppointmentRow({ item }) {
  const display = getAppointmentDisplay(item);
  return (
    <View style={styles.row}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{(item.doctorName || item.name || 'D').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.doctorName || item.name || 'Doctor'}
        </Text>
        <Text style={styles.rowDate}>
          {display.date} · {display.timeWithZone}
        </Text>
        <View style={styles.rowMetaLine}>
          <StatusBadge status={item.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(item)} />
        </View>
      </View>
    </View>
  );
}

/** Port of ViewPatientPage.jsx's "appointments" tab (SharedAppointmentTable,
 * personColumnType="doctor") - GET /HistoryAppointmentPatient?PatientId=. */
export default function PatientAppointmentsTab({ patientId }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!patientId) return;
    setIsLoading(true);
    getPatientAppointmentHistory(patientId).then((response) => {
      const list = Array.isArray(response.data) ? response.data : response.data?.data;
      setAppointments(response.success && Array.isArray(list) ? list : []);
      setIsLoading(false);
    });
  }, [patientId]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter((item) => (item.appointmentStatus || '').toLowerCase() === statusFilter);
  }, [appointments, statusFilter]);

  return (
    <View>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No appointments found.</Text>
        </View>
      ) : (
        filtered.map((item, index) => <AppointmentRow key={item.appointmentId ?? index} item={item} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  filterChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: adTokens.white,
  },
  rowAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  rowName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  rowDate: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
