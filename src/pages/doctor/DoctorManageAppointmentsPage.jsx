import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { formatDateLabel } from '../../utils/dateOnly';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import InlineCalendar from '../../components/InlineCalendar';
import AppointmentDetailSheet from '../../components/appointments/AppointmentDetailSheet';
import { getAppointmentSymptom, getInfoButtonProps } from '../../utils/appointmentFields';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

/** Exact port of ManageAppointments.jsx's row - name, symptom badge, date/time,
 * StatusBadge + AppointmentInfoButton, reference. */
function AppointmentRow({ item, isSelected, onPress }) {
  const symptom = getAppointmentSymptom(item);
  const display = getAppointmentDisplay(item);
  return (
    <Pressable style={[styles.row, isSelected && styles.rowSelected]} onPress={onPress}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{(item.name || 'P').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex1}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.doctorName || item.name || 'Patient'}
          </Text>
          {item.reference ? <Text style={styles.rowRef}>#{item.reference}</Text> : null}
        </View>
        <Text style={styles.rowDate}>
          {display.date} · {display.timeWithZone}
        </Text>
        <View style={styles.rowMetaLine}>
          <StatusBadge status={item.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(item)} />
          {symptom ? (
            <View style={styles.symptomBadge}>
              <MaterialCommunityIcons name="thermometer" size={11} color={adTokens.primaryDark} />
              <Text style={styles.symptomBadgeText} numberOfLines={1}>
                {symptom}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

function SectionListCard({ title, subtitle, loading, emptyText, items, selectedId, onSelectItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.cardScroll}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={adTokens.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="information-outline" size={22} color={adTokens.textMuted} />
            <Text style={styles.emptyStateText}>{emptyText}</Text>
          </View>
        ) : (
          items.map((item) => (
            <AppointmentRow
              key={item.appointmentId}
              item={item}
              isSelected={selectedId === item.appointmentId}
              onPress={() => onSelectItem(item.appointmentId)}
            />
          ))
        )}
      </View>
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/ManageAppointments.jsx. The web
 * version is a 3-column desktop layout (date list | in-progress list | detail
 * panel); on mobile the two lists stack vertically and tapping a row opens the
 * detail panel as a bottom sheet instead of a fixed third column - same
 * sections/data/actions, mobile-appropriate layout.
 *
 * Reschedule is intentionally not built: AllyDocReactApp explicitly hides the
 * Reschedule button for the freelancer doctor variant (the only variant this
 * app currently supports), so there is nothing to port for it yet.
 *
 * Chat/Call/Video (same visibility flags as web) are handled by the shared
 * `AppointmentDetailSheet` below - Chat opens the real SignalR chat room, Call/
 * Video push the real Daily.co `VideoCall` screen, same as every other list
 * that reuses this sheet (Dashboard, Appointments, Treatment Plan detail).
 */
export default function DoctorManageAppointmentsPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const { getAppointmentsBasedOnDate, getDoctorAppointments } = useManageAppointments();
  const doctorId = profile?.userId;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateAppointments, setDateAppointments] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);

  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Which appointment's detail sheet is open (null = closed). The sheet loads and owns the rest.
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const fetchDateAppointments = useCallback(
    async (date) => {
      setDateLoading(true);
      try {
        const data = await getAppointmentsBasedOnDate(date);
        setDateAppointments(Array.isArray(data) ? data : []);
      } catch {
        setDateAppointments([]);
      } finally {
        setDateLoading(false);
      }
    },
    [getAppointmentsBasedOnDate],
  );

  const fetchPendingAppointments = useCallback(async () => {
    if (!doctorId) return;
    setPendingLoading(true);
    try {
      const data = await getDoctorAppointments(doctorId, 'pending');
      const list = data?.data || data;
      setPendingAppointments(Array.isArray(list) ? list : []);
    } catch {
      setPendingAppointments([]);
    } finally {
      setPendingLoading(false);
    }
  }, [doctorId, getDoctorAppointments]);

  useEffect(() => {
    fetchDateAppointments(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPendingAppointments();
  }, [fetchPendingAppointments]);

  const handleSelectAppointment = (appointmentId) => setSelectedAppointmentId(appointmentId);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchDateAppointments(date);
  };

  const refreshAll = async () => {
    await Promise.all([fetchDateAppointments(selectedDate), fetchPendingAppointments()]);
  };

  return (
    <View style={styles.flex1}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={dateLoading || pendingLoading} onRefresh={refreshAll} />}
      >
        {/* No repeated "Manage Appointments" title here - the navbar above already shows it. */}
        <Text style={styles.pageSubtitle}>View, manage, and take action on patient appointments</Text>

        <View style={styles.card}>
          <InlineCalendar selectedDate={selectedDate} onSelectDate={handleDateChange} />
          <View style={styles.selectedDateRow}>
            <View style={styles.selectedDateLabel}>
              <MaterialCommunityIcons name="calendar-check-outline" size={14} color={adTokens.primaryDark} />
              <Text style={styles.selectedDateText}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <Pressable style={styles.todayButton} onPress={() => handleDateChange(new Date())}>
              <MaterialCommunityIcons name="calendar-today" size={13} color={adTokens.primaryDark} />
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          </View>
        </View>

        <SectionListCard
          title="Appointments"
          subtitle={`for ${formatDateLabel(selectedDate)}`}
          loading={dateLoading}
          emptyText="No appointments found for selected date."
          items={dateAppointments}
          selectedId={selectedAppointmentId}
          onSelectItem={handleSelectAppointment}
        />

        <SectionListCard
          title="In-Progress Appointments"
          subtitle="Active and pending appointments"
          loading={pendingLoading}
          emptyText="No in-progress appointments found."
          items={pendingAppointments}
          selectedId={selectedAppointmentId}
          onSelectItem={handleSelectAppointment}
        />
      </ScrollView>

      {/* Detail bottom sheet - the mobile equivalent of the web's fixed third column. */}
      <AppointmentDetailSheet
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
        onChanged={fetchPendingAppointments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  pageSubtitle: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 16 },

  card: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 14,
    marginBottom: 14,
    ...adTokens.cardShadow,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  cardSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2, marginBottom: 10 },
  cardScroll: { gap: 8 },

  selectedDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  selectedDateLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedDateText: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: adTokens.primaryTint,
  },
  todayButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.primaryDark },

  emptyState: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyStateText: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },

  // ── Appointment row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  rowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: adTokens.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, flexShrink: 1 },
  rowRef: { fontSize: 10.5, color: adTokens.textMuted },
  rowDate: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  symptomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: adTokens.primaryTint,
    maxWidth: 140,
  },
  symptomBadgeText: { fontSize: 10.5, fontWeight: '600', color: adTokens.primaryDark },

});
