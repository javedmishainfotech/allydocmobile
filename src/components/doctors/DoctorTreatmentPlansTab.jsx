import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getDoctorTreatmentPlans } from '../../services/doctorsListService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../StatusBadge';
import AppointmentInfoButton from '../AppointmentInfoButton';
import { adTokens } from '../../theme/colors';

const STATUS_FILTERS = [
  { value: 'inprogress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

/** Port of Nurse/NurseDoctors/DoctorTreatmentPlansList.jsx: a clinic admin's view of one
 * doctor's treatment plans - tapping a row opens the same TreatmentPlanDetail screen used
 * everywhere else in the app. */
export default function DoctorTreatmentPlansTab({ doctorId }) {
  const navigation = useNavigation();
  const [status, setStatus] = useState('inprogress');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const res = await getDoctorTreatmentPlans(doctorId);
    const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
    setPlans(res.success ? list : []);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = plans.filter((item) => {
    const s = String(item.appointmentStatus || item.status || '').toLowerCase().trim();
    return status === 'inprogress' ? s === 'inprogress' || s === 'in progress' : s === 'completed';
  });

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
      ) : filtered.length === 0 ? (
        <Text style={styles.emptyText}>No treatment plans found.</Text>
      ) : (
        filtered.map((item, index) => {
          const name = item.patientName || item.name || 'Patient';
          const display = getAppointmentDisplay(item);
          return (
            <Pressable
              key={item.appointmentId ?? index}
              style={styles.row}
              onPress={() => navigation.navigate('TreatmentPlanDetail', { appointmentId: item.appointmentId })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.meta}>{display.date} · {display.timeWithZone}</Text>
              </View>
              <StatusBadge status={item.appointmentStatus} />
              <AppointmentInfoButton
                rescheduleReason={item.rescheduleReason}
                cancelReason={item.cancelReason}
                remarks={item.remarks}
                feedbackRating={item.feedbackRating}
                feedbackComment={item.feedbackComment}
              />
              <Feather name="chevron-right" size={16} color={adTokens.textMuted} />
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },
  loader: { marginVertical: 20 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, paddingVertical: 20, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: adTokens.textSecondary },
  name: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  meta: { fontSize: 11, color: adTokens.textSecondary, marginTop: 1 },
});
