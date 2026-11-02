import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import {
  applyRescheduledClientFilter,
  formatStatusFilterLabel,
  hasActiveStatusFilter,
  parseAppointmentListResponse,
} from '../../utils/appointmentListApi';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getInfoButtonProps } from '../../utils/appointmentFields';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import AppointmentFilterSheet, { EMPTY_APPOINTMENT_FILTER } from '../../components/appointments/AppointmentFilterSheet';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

const PAGE_SIZE = 20; // same as the web page

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** One row of the web's SharedAppointmentTable: patient (avatar, name, reference), date, time,
 * status badge + info button, and the "view" action - here the whole row opens the details. */
function AppointmentListRow({ appointment, onOpen }) {
  const display = getAppointmentDisplay(appointment);
  const patientName = appointment.patientName || appointment.name || appointment.PatientName || '';
  const reference = appointment.reference || appointment.Reference || '';

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onOpen}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(patientName)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {patientName || '—'}
        </Text>
        {reference ? (
          <Text style={styles.reference} numberOfLines={1}>
            {reference}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={13} color={adTokens.textMuted} />
          <Text style={styles.metaText}>{display.date}</Text>
          <MaterialCommunityIcons name="clock-outline" size={13} color={adTokens.textMuted} style={styles.metaGap} />
          <Text style={styles.metaText}>{display.timeWithZone}</Text>
        </View>
        <View style={styles.statusRow}>
          <StatusBadge status={appointment.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(appointment)} />
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

/**
 * Doctor "Appointments" - port of AllyDocReactApp's module/Doctor/Pages/DoctorAppointments
 * (SharedAppointmentTable + FilterAppointmentsModal): the doctor's own appointments from
 * `GET /AllDoctorAppointment`, server-paginated (20 a page), filterable by status (multi),
 * date range and patient. The web table's "view" icon routes to the merged
 * treatment-plan detail page; here a row opens the same screen (`TreatmentPlanDetail`). "Rescheduled" is not offered to a freelancer doctor, as on the web.
 * (A nurse's version of this page reads `/AllFacilityAppointment` instead - added with the
 * Nurse module.)
 */
export default function DoctorAppointmentsPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const { getDoctorAppointmentsList } = useManageAppointments();
  const doctorId = profile?.userId;
  const userType = String(profile?.userType || '').toLowerCase();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const isFreelancerDoctor = userType === 'freelancer' && roleName === 'doctor';

  const [filter, setFilter] = useState(EMPTY_APPOINTMENT_FILTER);
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const navigation = useNavigation();
  const requestCounter = useRef(0);

  const hasActiveFilters = Object.entries(filter).some(([key, value]) => {
    if (key === 'patientName') return false;
    if (key === 'status') return hasActiveStatusFilter(value);
    return value != null && String(value).trim() !== '';
  });

  const load = useCallback(async () => {
    if (!doctorId) return;
    // Only the newest request may write state - a slow earlier one must not overwrite it.
    const requestId = (requestCounter.current += 1);
    setIsLoading(true);
    setLoadError(null);

    try {
      const raw = await getDoctorAppointmentsList(doctorId, { ...filter, page, pageSize: PAGE_SIZE });
      if (requestId !== requestCounter.current) return;
      const parsed = parseAppointmentListResponse(raw, page, PAGE_SIZE);
      setAppointments(applyRescheduledClientFilter(parsed.list, filter.status));
      setTotalPages(parsed.totalPages);
      // The server may clamp an out-of-range page; follow it, as the web does.
      if (parsed.page !== page && Number.isFinite(parsed.page) && parsed.page >= 1) setPage(parsed.page);
    } catch (message) {
      if (requestId !== requestCounter.current) return;
      setAppointments([]);
      setTotalPages(0);
      setLoadError(message || 'Unable to load appointments.');
    }
    setIsLoading(false);
  }, [doctorId, filter, page, getDoctorAppointmentsList]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const emptyText = hasActiveStatusFilter(filter.status)
    ? `There are no ${formatStatusFilterLabel(filter.status)} appointments to display.`
    : 'There are no appointments to display at the moment.';

  const header = (
    <View style={styles.header}>
      <Text style={styles.subtitle}>All your appointments. Use Filter to narrow them down.</Text>
      <Pressable
        style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
        onPress={() => setFilterOpen(true)}
        accessibilityLabel="Filter appointments"
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={16}
          color={hasActiveFilters ? adTokens.white : adTokens.primaryDark}
        />
        <Text style={[styles.filterText, hasActiveFilters && styles.filterTextActive]}>Filter</Text>
      </Pressable>
    </View>
  );

  const footer =
    !isLoading && !loadError && totalPages > 1 ? (
      <View style={styles.pager}>
        <Pressable
          style={[styles.pagerButton, page <= 1 && styles.pagerButtonDisabled]}
          disabled={page <= 1}
          onPress={() => setPage((current) => Math.max(1, current - 1))}
        >
          <Feather name="chevron-left" size={16} color={page <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
          <Text style={[styles.pagerText, page <= 1 && styles.pagerTextDisabled]}>Previous</Text>
        </Pressable>
        <Text style={styles.pagerInfo}>
          Page {page} of {totalPages}
        </Text>
        <Pressable
          style={[styles.pagerButton, page >= totalPages && styles.pagerButtonDisabled]}
          disabled={page >= totalPages}
          onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          <Text style={[styles.pagerText, page >= totalPages && styles.pagerTextDisabled]}>Next</Text>
          <Feather name="chevron-right" size={16} color={page >= totalPages ? adTokens.textMuted : adTokens.primaryDark} />
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={styles.flex1}>
      <FlatList
        data={isLoading || loadError ? [] : appointments}
        keyExtractor={(appointment, index) => String(appointment.appointmentId ?? index)}
        renderItem={({ item }) => (
          <AppointmentListRow appointment={item} onOpen={() => navigation.navigate('TreatmentPlanDetail', { appointmentId: item.appointmentId })} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading && appointments.length > 0} onRefresh={load} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={adTokens.primary} />
              <Text style={styles.stateText}>Loading appointments...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
              <Text style={styles.stateText}>{loadError}</Text>
              <Pressable style={styles.retryButton} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.state}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={30} color={adTokens.textMuted} />
              <Text style={styles.stateTitle}>No Appointments Found</Text>
              <Text style={styles.stateText}>{emptyText}</Text>
            </View>
          )
        }
      />

      <AppointmentFilterSheet
        visible={filterOpen}
        filter={filter}
        showRescheduledOption={!isFreelancerDoctor}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16 },
  separator: { height: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  subtitle: { flex: 1, fontSize: 13, color: adTokens.textSecondary },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adTokens.primaryLight,
    backgroundColor: adTokens.primaryLight,
  },
  filterButtonActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  filterText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  filterTextActive: { color: adTokens.white },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  rowPressed: { backgroundColor: adTokens.gray50 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: adTokens.white },
  rowBody: { flex: 1, gap: 3 },
  name: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  reference: { fontSize: 11.5, color: adTokens.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' },
  metaGap: { marginLeft: 8 },
  metaText: { fontSize: 12, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 6, paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  pagerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: adTokens.primaryLight },
  pagerButtonDisabled: { backgroundColor: adTokens.gray100 },
  pagerText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pagerTextDisabled: { color: adTokens.textMuted },
  pagerInfo: { fontSize: 12.5, color: adTokens.textSecondary, fontWeight: '600' },
});
