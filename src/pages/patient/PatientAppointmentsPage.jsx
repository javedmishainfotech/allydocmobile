import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, FlatList, Image, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import {
  extractAppointmentList,
  formatStatusFilterLabel,
  hasActiveStatusFilter,
  paginateList,
} from '../../utils/appointmentListApi';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getInfoButtonProps } from '../../utils/appointmentFields';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import AppointmentFilterSheet, { doctorPerson } from '../../components/appointments/AppointmentFilterSheet';
import ReviewSheet from '../../components/feedback/ReviewSheet';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const PAGE_SIZE = 20; // same as the web page
const EMPTY_FILTER = { status: [], fromDate: '', toDate: '', doctorId: '', doctorName: '' };

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Date/time for a row. The web falls back to the legacy date/time fields when the server's
 * UTC start is missing; this shows those raw values the same way. */
function displayFor(appointment) {
  const display = getAppointmentDisplay(appointment);
  if (display.instantMs !== null) return display;
  const rawDate = appointment?.appointmentDate;
  const rawTime = appointment?.appointmentTime ?? appointment?.appointMentTime ?? appointment?.time;
  return { ...display, date: rawDate || '-', timeWithZone: rawTime || '-' };
}

function DoctorAvatar({ name, imageUrl }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return <Image source={{ uri: imageUrl }} style={styles.avatar} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

function FeedbackSummary({ appointment }) {
  if (String(appointment?.appointmentStatus || '').toLowerCase() !== 'completed' || appointment?.isFeedback == null) {
    return null;
  }
  const comment = String(appointment?.comment ?? '').trim();
  return (
    <Pressable
      style={styles.feedbackChip}
      disabled={!comment}
      onPress={() => Alert.alert('Remarks', comment)}
      accessibilityLabel="Your feedback"
    >
      <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
      <Text style={styles.feedbackText}>{appointment.isFeedback}</Text>
      {comment ? <Feather name="info" size={13} color={adTokens.textMuted} /> : null}
    </Pressable>
  );
}

function AppointmentCardRow({ appointment, onOpen, onGiveFeedback }) {
  const display = displayFor(appointment);
  const status = String(appointment?.appointmentStatus || '').toLowerCase();
  const appointmentId = appointment?.appointmentId ?? appointment?.id;
  const specialization = [appointment?.specialization, appointment?.hospital].filter(Boolean).join(' · ');
  const showTreatmentPlan = status === 'completed' || status === 'inprogress';
  const showGiveFeedback = status === 'completed' && appointment?.isFeedback == null && appointmentId != null;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => appointmentId != null && onOpen(appointmentId)}
    >
      <View style={styles.rowTop}>
        <DoctorAvatar name={appointment?.name} imageUrl={appointment?.profileImage} />
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {appointment?.name || '—'}
          </Text>
          {specialization ? (
            <Text style={styles.specialization} numberOfLines={1}>
              {specialization}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-outline" size={13} color={adTokens.textMuted} />
            <Text style={styles.metaText}>{display.date}</Text>
            <MaterialCommunityIcons name="clock-outline" size={13} color={adTokens.textMuted} style={styles.metaGap} />
            <Text style={styles.metaText}>{display.timeWithZone}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rowBottom}>
        <View style={styles.statusRow}>
          <StatusBadge status={appointment?.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(appointment)} />
          <FeedbackSummary appointment={appointment} />
        </View>
        <View style={styles.actions}>
          {showTreatmentPlan ? (
            <Pressable style={styles.actionButton} onPress={() => onOpen(appointmentId)} accessibilityLabel="Treatment plan">
              <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={adTokens.primaryDark} />
              <Text style={styles.actionText}>Treatment Plan</Text>
            </Pressable>
          ) : null}
          {showGiveFeedback ? (
            <Pressable style={styles.actionButton} onPress={() => onGiveFeedback(appointment)} accessibilityLabel="Give feedback">
              <MaterialCommunityIcons name="star-outline" size={16} color={adTokens.primaryDark} />
              <Text style={styles.actionText}>Give Feedback</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Patient "Appointments" - port of AllyDocReactApp's module/Patient/Pages/Appointments:
 * the patient's appointments from `GET /PatientAppointments` (the whole filtered list, paged
 * 20 at a time on the client like the web), filterable by status (multi), date range and doctor
 * (`GET /PatientDoctorDropdown/{id}`), with Give Feedback on completed appointments
 * (`POST /AddFeedback`). "Rescheduled" is offered to clinic patients only, as on the web.
 * A row opens the shared treatment-plan detail screen, as the web's eye icon does.
 * Not yet ported: Book Appointment and the incoming-call banner (needs the real-time layer).
 */
export default function PatientAppointmentsPage() {
  const navigation = useNavigation();
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const patientId = profile?.userId;
  const { getPatientAppointmentsList, getPatientDoctorDropdown } = usePatientAppointments();
  const isClinicPatient =
    String(profile?.userType || '').toLowerCase().trim() === 'clinic' &&
    String(profile?.roleName || '').toLowerCase().trim() === 'patient';

  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [allAppointments, setAllAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const requestCounter = useRef(0);

  const person = useMemo(
    () =>
      doctorPerson(() =>
        getPatientDoctorDropdown(patientId)
          .then((data) => ({ success: true, data }))
          .catch((message) => ({ success: false, message })),
      ),
    [patientId, getPatientDoctorDropdown],
  );

  const hasActiveFilters = Object.entries(filter).some(([key, value]) => {
    if (key === 'doctorName') return false;
    if (key === 'status') return hasActiveStatusFilter(value);
    return value != null && String(value).trim() !== '';
  });

  const load = useCallback(async () => {
    if (!patientId) return;
    // Only the newest request may write state - a slow earlier one must not overwrite it.
    const requestId = (requestCounter.current += 1);
    setIsLoading(true);
    setLoadError(null);

    try {
      const raw = await getPatientAppointmentsList(patientId, filter);
      if (requestId !== requestCounter.current) return;
      setAllAppointments(extractAppointmentList(raw));
    } catch (message) {
      if (requestId !== requestCounter.current) return;
      setAllAppointments([]);
      setLoadError(message || 'Unable to load appointments.');
    }
    setIsLoading(false);
  }, [patientId, filter, getPatientAppointmentsList]);

  useEffect(() => {
    load();
  }, [load]);

  const { rows, totalPages, page: safePage } = useMemo(
    () => paginateList(allAppointments, page, PAGE_SIZE),
    [allAppointments, page],
  );

  const applyFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const openDetail = (appointmentId) => navigation.navigate('TreatmentPlanDetail', { appointmentId });

  const statusLabel = formatStatusFilterLabel(filter.status);
  const emptyText = statusLabel
    ? `You don't have any ${statusLabel} appointments yet`
    : "You don't have any appointments yet";

  const header = (
    <View style={styles.header}>
      <Text style={styles.subtitle}>Manage and view all your appointments in one place.</Text>
      <View style={styles.headerButtons}>
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
        <Pressable style={styles.bookButton} onPress={() => navigation.navigate('BookAppointment')}>
          <MaterialCommunityIcons name="plus" size={16} color={adTokens.white} />
          <Text style={styles.bookText}>Book</Text>
        </Pressable>
      </View>
    </View>
  );

  const footer =
    !isLoading && !loadError && totalPages > 1 ? (
      <View style={styles.pager}>
        <Pressable
          style={[styles.pagerButton, safePage <= 1 && styles.pagerButtonDisabled]}
          disabled={safePage <= 1}
          onPress={() => setPage(safePage - 1)}
        >
          <Feather name="chevron-left" size={16} color={safePage <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
          <Text style={[styles.pagerText, safePage <= 1 && styles.pagerTextDisabled]}>Previous</Text>
        </Pressable>
        <Text style={styles.pagerInfo}>
          Page {safePage} of {totalPages}
        </Text>
        <Pressable
          style={[styles.pagerButton, safePage >= totalPages && styles.pagerButtonDisabled]}
          disabled={safePage >= totalPages}
          onPress={() => setPage(safePage + 1)}
        >
          <Text style={[styles.pagerText, safePage >= totalPages && styles.pagerTextDisabled]}>Next</Text>
          <Feather name="chevron-right" size={16} color={safePage >= totalPages ? adTokens.textMuted : adTokens.primaryDark} />
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={styles.flex1}>
      <FlatList
        data={isLoading || loadError ? [] : rows}
        keyExtractor={(appointment, index) => String(appointment.appointmentId ?? appointment.id ?? index)}
        renderItem={({ item }) => (
          <AppointmentCardRow
            appointment={item}
            onOpen={openDetail}
            onGiveFeedback={setReviewTarget}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading && allAppointments.length > 0} onRefresh={load} />}
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
              <Text style={styles.stateTitle}>No appointments found</Text>
              <Text style={styles.stateText}>{emptyText}</Text>
            </View>
          )
        }
      />

      <AppointmentFilterSheet
        visible={filterOpen}
        filter={filter}
        person={person}
        showRescheduledOption={isClinicPatient}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
      />
      <ReviewSheet
        visible={reviewTarget != null}
        appointment={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSaved={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16 },
  separator: { height: 10 },

  header: { gap: 10, marginBottom: 14 },
  subtitle: { fontSize: 13, color: adTokens.textSecondary },
  headerButtons: { flexDirection: 'row', gap: 10 },
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
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: adTokens.primary,
  },
  bookText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  rowPressed: { backgroundColor: adTokens.gray50 },
  row: {
    padding: 12,
    gap: 10,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBody: { flex: 1, gap: 3 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
  name: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  specialization: { fontSize: 12, color: adTokens.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaGap: { marginLeft: 8 },
  metaText: { fontSize: 12, color: adTokens.textSecondary },
  rowBottom: { gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  feedbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
  },
  feedbackText: { fontSize: 12.5, fontWeight: '700', color: '#B45309' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: adTokens.primaryLight,
  },
  actionText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },

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
