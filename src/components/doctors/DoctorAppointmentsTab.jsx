import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../StatusBadge';
import AppointmentInfoButton from '../AppointmentInfoButton';
import { adTokens } from '../../theme/colors';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

/** Port of DoctorProfile.jsx's embedded Appointments tab / the standalone
 * DoctorAppointmentList.jsx (same data, same `DoctorAppointmentsAction`) - display only,
 * no row action in this embedded context. */
export default function DoctorAppointmentsTab({ doctorId }) {
  const { getDoctorAppointments } = useManageAppointments();
  const [status, setStatus] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const data = await getDoctorAppointments(doctorId, status);
      const list = Array.isArray(data) ? data : data?.Items || [];
      setAppointments(list);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, status, getDoctorAppointments]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.chip, status === f.value && styles.chipActive]}
            onPress={() => setStatus(f.value)}
          >
            <Text style={[styles.chipText, status === f.value && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : appointments.length === 0 ? (
        <Text style={styles.emptyText}>No appointments found.</Text>
      ) : (
        appointments.map((item, index) => {
          const name = item.patientName || item.name || 'Patient';
          const display = getAppointmentDisplay(item);
          return (
            <View key={item.appointmentId ?? index} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <StatusBadge status={item.appointmentStatus} />
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.meta}>{display.date} · {display.timeWithZone}</Text>
                <AppointmentInfoButton
                  rescheduleReason={item.rescheduleReason}
                  cancelReason={item.cancelReason}
                  remarks={item.remarks}
                  feedbackRating={item.feedbackRating}
                  feedbackComment={item.feedbackComment}
                />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },
  loader: { marginVertical: 20 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, paddingVertical: 20, textAlign: 'center' },
  row: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 8, gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, flexShrink: 1 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 11.5, color: adTokens.textSecondary },
});
