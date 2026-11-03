import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getTreatmentPlansList } from '../../services/treatmentPlanService';
import { formatStatusFilterLabel, hasActiveStatusFilter, parseAppointmentListResponse } from '../../utils/appointmentListApi';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getInfoButtonProps } from '../../utils/appointmentFields';
import StatusBadge, { statusAccentColor } from '../StatusBadge';
import AppointmentInfoButton from '../AppointmentInfoButton';
import AppointmentFilterSheet, { TREATMENT_PLAN_STATUS_OPTIONS } from '../appointments/AppointmentFilterSheet';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const PAGE_SIZE = 10; // same as the web page
export const TREATMENT_DETAIL_ROUTE = 'TreatmentPlanDetail';

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** The web falls back to the legacy date/time fields when the server's UTC start is missing;
 * the row shows "—" in that case (it only trusts a resolved instant). */
function displayFor(appointment) {
  const display = getAppointmentDisplay({
    appointmentStartUtc: appointment?.appointmentStartUtc,
  });
  return display.instantMs !== null ? display : { date: '—', timeWithZone: '—' };
}

function Avatar({ name, imageUrl }) {
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

function PlanRow({ appointment, onOpen }) {
  const display = displayFor(appointment);
  const appointmentId = appointment?.appointmentId ?? appointment?.id;
  const status = String(appointment?.appointmentStatus || 'completed').toLowerCase();
  const canView = (status === 'completed' || status === 'inprogress') && appointmentId != null;
  const name = appointment?.name || appointment?.doctorName || appointment?.patientName || '—';
  const subLine = [appointment?.specialization, appointment?.hospital].filter(Boolean).join(' · ');
  const accentColor = statusAccentColor(appointment?.appointmentStatus);

  // Remarks (the doctor's completion note) and patient feedback used to be hidden behind the
  // info-button's tap-to-alert - shown directly on the card now so they don't need a click to see.
  const { rescheduleReason, cancelReason, remarks, feedbackRating, feedbackComment } = getInfoButtonProps(appointment);
  const remarksText = String(remarks ?? '').trim();
  const feedbackText = String(feedbackComment ?? '').trim();
  const hasFeedback = Boolean(feedbackRating) || feedbackText.length > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { borderLeftColor: accentColor }, pressed && canView && styles.rowPressed]}
      disabled={!canView}
      onPress={() => onOpen(appointmentId)}
    >
      <View style={styles.rowTopWrap}>
        <Avatar name={name} imageUrl={appointment?.profileImage} />
        <View style={styles.rowBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <StatusBadge status={appointment?.appointmentStatus} />
          </View>
          {subLine ? (
            <Text style={styles.subLine} numberOfLines={1}>
              {subLine}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-outline" size={13} color={adTokens.textMuted} />
            <Text style={styles.metaText}>{display.date}</Text>
            <MaterialCommunityIcons name="clock-outline" size={13} color={adTokens.textMuted} style={styles.metaGap} />
            <Text style={styles.metaText}>{display.timeWithZone}</Text>
            <AppointmentInfoButton rescheduleReason={rescheduleReason} cancelReason={cancelReason} />
          </View>
        </View>
        {canView ? (
          <View style={styles.chevronWrap}>
            <Feather name="chevron-right" size={18} color={adTokens.primaryDark} />
          </View>
        ) : null}
      </View>

      {remarksText ? (
        <View style={styles.remarksBox}>
          <MaterialCommunityIcons name="comment-text-outline" size={13} color={adTokens.primaryDark} />
          <Text style={styles.remarksText}>{remarksText}</Text>
        </View>
      ) : null}

      {hasFeedback ? (
        <View style={styles.feedbackBox}>
          <View style={styles.feedbackHeader}>
            <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
            <Text style={styles.feedbackTitle}>
              Patient Feedback{feedbackRating ? ` · ${feedbackRating}/5` : ''}
            </Text>
          </View>
          {feedbackText ? <Text style={styles.feedbackText}>{feedbackText}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The treatment-plan list shared by the patient and doctor screens - port of the web's
 * module/Patient/Pages/TreatmentPlan (and DoctorTreatmentPlan, same API): `GET /AllTreatmentPlanListV2`,
 * server-paginated (10 a page), filterable by status (Completed / In Progress), date range and
 * the other party (`person`: a patient filters by doctor, a doctor by patient). A row of a
 * completed or in-progress appointment opens the treatment plan detail, as the web's eye icon does.
 *
 * @param {{ person: object, emptyFilter: object, subtitle?: string }} props
 */
export default function TreatmentPlanList({
  person,
  emptyFilter,
  subtitle = 'Manage and view all treatment plans in one place.',
}) {
  const navigation = useNavigation();
  const dockInset = useDockInset();

  const [filter, setFilter] = useState(emptyFilter);
  const [page, setPage] = useState(1);
  const [plans, setPlans] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const requestCounter = useRef(0);

  const hasActiveFilters = Object.entries(filter).some(([key, value]) => {
    if (key === person.nameKey) return false;
    if (key === 'status') return hasActiveStatusFilter(value);
    return value != null && String(value).trim() !== '';
  });

  const load = useCallback(async () => {
    // Only the newest request may write state - a slow earlier one must not overwrite it.
    const requestId = (requestCounter.current += 1);
    setIsLoading(true);
    setLoadError(null);

    const result = await getTreatmentPlansList({ ...filter, page, pageSize: PAGE_SIZE });
    if (requestId !== requestCounter.current) return;

    if (!result.success) {
      setPlans([]);
      setTotalPages(0);
      setLoadError(result.message || 'Unable to load treatment plans.');
    } else {
      const parsed = parseAppointmentListResponse(result.raw, page, PAGE_SIZE);
      setPlans(parsed.list);
      setTotalPages(parsed.totalPages);
      // The server may clamp an out-of-range page; follow it, as the web does.
      if (parsed.page !== page && Number.isFinite(parsed.page) && parsed.page >= 1) setPage(parsed.page);
    }
    setIsLoading(false);
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const openDetail = (appointmentId) => navigation.navigate(TREATMENT_DETAIL_ROUTE, { appointmentId });

  const statusLabel = formatStatusFilterLabel(filter.status);
  const emptyText = hasActiveFilters
    ? `No treatment plans match your filters${statusLabel ? ` (${statusLabel})` : ''}.`
    : 'No treatment plans to display at the moment.';

  const header = (
    <View style={styles.header}>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable
        style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
        onPress={() => setFilterOpen(true)}
        accessibilityLabel="Filter treatment plans"
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
        data={isLoading || loadError ? [] : plans}
        keyExtractor={(appointment, index) => String(appointment.appointmentId ?? appointment.id ?? index)}
        renderItem={({ item }) => <PlanRow appointment={item} onOpen={openDetail} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading && plans.length > 0} onRefresh={load} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={adTokens.primary} />
              <Text style={styles.stateText}>Loading treatment plans...</Text>
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
              <MaterialCommunityIcons name="clipboard-text-off-outline" size={30} color={adTokens.textMuted} />
              <Text style={styles.stateTitle}>No records found</Text>
              <Text style={styles.stateText}>{emptyText}</Text>
            </View>
          )
        }
      />

      <AppointmentFilterSheet
        visible={filterOpen}
        filter={filter}
        person={person}
        title="Filter treatment plans"
        statusOptions={TREATMENT_PLAN_STATUS_OPTIONS}
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
    gap: 10,
    padding: 14,
    paddingLeft: 12,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  rowPressed: { backgroundColor: adTokens.gray50 },
  rowTopWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remarksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: adTokens.primaryLight,
  },
  remarksText: { flex: 1, fontSize: 12.5, color: adTokens.primaryDark, lineHeight: 17 },
  feedbackBox: {
    gap: 3,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedbackTitle: { fontSize: 12, fontWeight: '700', color: '#B45309' },
  feedbackText: { fontSize: 12.5, color: '#92400E', lineHeight: 17 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: adTokens.white },
  rowBody: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  subLine: { fontSize: 11.5, color: adTokens.textMuted, textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 },
  metaGap: { marginLeft: 8 },
  metaText: { fontSize: 12, color: adTokens.textSecondary, fontWeight: '500' },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: adTokens.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
