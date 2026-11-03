import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useDoctorDashboard } from '../../hooks/useDoctorDashboard';
import { getItem } from '../../utils/storage';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { IN_APP_LEGAL_PAGES } from '../../constants/legalLinks';
import { colors, adTokens } from '../../theme/colors';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import PendingRequestDetailsModal from '../../components/PendingRequestDetailsModal';
import DoctorProfileModal from '../../components/settings/DoctorProfileModal';
import { useDockInset } from '../../navigation/DockInsetContext';

// Web reads these with `??` dual-casing fallbacks (see ScheduledAppointmentsTable.jsx)
// since the API inconsistently cases some fields; mirror that here.
function pickField(item, ...keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') return item[key];
  }
  return undefined;
}

function getInfoButtonProps(item) {
  return {
    rescheduleReason: pickField(item, 'rescheduleReason', 'RescheduleReason'),
    cancelReason: pickField(item, 'cancelReason', 'CancelReason'),
    remarks: pickField(item, 'remarks', 'Remarks'),
    feedbackRating: pickField(item, 'feedbackRating', 'FeedbackRating'),
    feedbackComment: pickField(item, 'feedbackComment', 'FeedbackComment'),
  };
}

const UPCOMING_APPOINTMENT_STATUSES = ['scheduled', 'accepted', 'confirmed', 'rescheduled'];
const TODAY_SCHEDULE_STATUSES = ['scheduled', 'rescheduled'];
const RECENT_APPOINTMENTS_PREVIEW_COUNT = 5;

// Exact port of ad-stat-card's per-variant gradient/icon/border colors.
const STAT_VARIANTS = {
  primary: { gradient: ['#EFF6FF', '#DBEAFE'], border: adTokens.primary, iconBg: adTokens.primaryTint, iconColor: adTokens.primary },
  success: { gradient: ['#ECFDF5', '#D1FAE5'], border: adTokens.success, iconBg: adTokens.successTint, iconColor: adTokens.success },
  warning: { gradient: ['#FFFBEB', '#FEF3C7'], border: adTokens.warning, iconBg: adTokens.warningTint, iconColor: adTokens.warning },
  danger: { gradient: ['#FEF2F2', '#FEE2E2'], border: adTokens.danger, iconBg: adTokens.dangerTint, iconColor: adTokens.danger },
};

// Exact port of the status -> badge-variant map used by TodaySchedule/StatusBadge.
const STATUS_BADGE_MAP = {
  scheduled: { bg: adTokens.infoLight, color: adTokens.infoDark, label: 'Scheduled' },
  inprogress: { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'In Progress' },
  rescheduled: { bg: '#EDE9FE', color: '#8B5CF6', label: 'Rescheduled' },
  completed: { bg: adTokens.successLight, color: adTokens.successDark, label: 'Completed' },
  accepted: { bg: adTokens.successLight, color: adTokens.successDark, label: 'Accepted' },
};

function getStatusBadge(status) {
  const key = String(status || '').toLowerCase();
  return (
    STATUS_BADGE_MAP[key] || { bg: adTokens.gray100, color: adTokens.textSecondary, label: status || 'Unknown' }
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  return 'Good Evening,';
}

function CardShell({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CardHeader({ title, right }) {
  return (
    <LinearGradient colors={['#EDF1F7', '#F4F7FB']} style={styles.cardHeader}>
      <Text style={styles.cardHeaderTitle}>{title}</Text>
      {right}
    </LinearGradient>
  );
}

function GhostIconButton({ icon, onPress, loading }) {
  return (
    <Pressable style={styles.ghostIconButton} onPress={onPress} disabled={loading} hitSlop={8}>
      {loading ? (
        <ActivityIndicator size={14} color={adTokens.textSecondary} />
      ) : (
        <MaterialCommunityIcons name={icon} size={16} color={adTokens.textSecondary} />
      )}
    </Pressable>
  );
}

// Exact port of .ad-stat-card.
function StatCard({ icon, label, value, variant = 'primary' }) {
  const v = STAT_VARIANTS[variant] || STAT_VARIANTS.primary;
  return (
    <LinearGradient
      colors={v.gradient}
      style={[styles.statCard, { borderLeftColor: v.border }]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: v.iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={v.iconColor} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value ?? '-'}</Text>
      </View>
    </LinearGradient>
  );
}

// Exact port of .ad-schedule-item in Today's Schedule. A row tap opens the Treatment Plan detail
// screen for that appointment, same as web's `/<role>/treatment-plan/<appointmentId>`.
function ScheduleRow({ item, onPress }) {
  const badge = getStatusBadge(item.appointmentStatus);
  return (
    <Pressable style={({ pressed }) => [styles.scheduleRow, pressed && styles.scheduleRowPressed]} onPress={onPress}>
      <View style={styles.scheduleAvatar}>
        <Text style={styles.scheduleAvatarText}>
          {(item.name || item.patientName || 'P').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flex1}>
        <View style={styles.scheduleNameRow}>
          <Text style={styles.scheduleName} numberOfLines={1}>
            {item.name?.trim() || item.patientName?.trim() || 'Patient'}
          </Text>
          {item.reference ? <Text style={styles.scheduleRef}>#{item.reference}</Text> : null}
        </View>
        <View style={styles.scheduleMetaRow}>
          <Text style={styles.scheduleTime}>{getAppointmentDisplay(item).timeWithZone}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {item.isVideoCall ? (
            <View style={styles.videoPill}>
              <MaterialCommunityIcons name="video-outline" size={11} color={adTokens.primaryDark} />
              <Text style={styles.videoPillText}>Video</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

// Exact port of ScheduledAppointment.jsx's row (gray-50 background, 36px avatar, Accept pill).
function PendingRequestRow({ item, isAccepting, onAccept, onShowDetails }) {
  return (
    <View style={styles.pendingRow}>
      <View style={styles.pendingAvatar}>
        <Text style={styles.pendingAvatarText}>
          {(item.name || item.patientName || 'P').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.pendingName} numberOfLines={1}>
          {item.name?.trim() || item.patientName?.trim() || 'Patient'}
        </Text>
        <Text style={styles.pendingSubtitle}>
          {getAppointmentDisplay(item).date} | {getAppointmentDisplay(item).timeWithZone}
        </Text>
        {item.consultReason?.trim() ? (
          <View style={styles.consultReasonRow}>
            <Text style={styles.consultReasonLabel}>Consult Reason:</Text>
            <View style={styles.consultReasonBadge}>
              <Text style={styles.consultReasonBadgeText} numberOfLines={1}>
                {item.consultReason.trim()}
              </Text>
            </View>
            <Pressable
              style={styles.consultInfoButton}
              onPress={onShowDetails}
              hitSlop={8}
              accessibilityLabel="View patient details & questionnaire"
            >
              <Feather name="info" size={12} color={adTokens.primaryDark} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <Pressable style={styles.acceptButton} disabled={isAccepting} onPress={onAccept}>
        {isAccepting ? (
          <ActivityIndicator size={14} color={colors.white} />
        ) : (
          <Text style={styles.acceptButtonText}>Accept</Text>
        )}
      </Pressable>
    </View>
  );
}

// Exact port of .ad-quick-action's per-variant tint/gradient.
const QUICK_LINK_VARIANTS = {
  success: { gradient: ['#FFFFFF', '#ECFDF5'], border: 'rgba(16, 185, 129, 0.2)', iconBg: adTokens.successTint, iconColor: adTokens.success },
  warning: { gradient: ['#FFFFFF', '#FFFBEB'], border: 'rgba(245, 158, 11, 0.2)', iconBg: adTokens.warningTint, iconColor: adTokens.warning },
};

function QuickLinkButton({ icon, label, variant, onPress }) {
  const v = QUICK_LINK_VARIANTS[variant];
  return (
    <Pressable onPress={onPress} style={styles.quickLinkPressable}>
      <LinearGradient colors={v.gradient} style={[styles.quickLinkButton, { borderColor: v.border }]}>
        <View style={[styles.quickLinkIconWrap, { backgroundColor: v.iconBg }]}>
          <MaterialCommunityIcons name={icon} size={20} color={v.iconColor} />
        </View>
        <Text style={styles.quickLinkLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// Mobile list row for Recent Appointments - the web version is a literal
// HTML table (#, Patient, Status, View columns), which doesn't read well on a
// narrow phone screen (cramped columns, tiny text). Same data, laid out as a
// row card instead, matching every other list on this screen (avatar, name,
// date/time, status badge, chevron) rather than forcing a desktop grid.
function RecentAppointmentRow({ item, onView }) {
  const badge = getStatusBadge(item.appointmentStatus);
  const display = getAppointmentDisplay(item);
  return (
    <Pressable style={styles.recentRow} onPress={onView}>
      <View style={styles.scheduleAvatar}>
        <Text style={styles.scheduleAvatarText}>
          {(item.name || item.patientName || 'P').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.scheduleName} numberOfLines={1}>
          {item.name?.trim() || item.patientName?.trim() || 'Patient'}
        </Text>
        <View style={styles.scheduleMetaRow}>
          <Text style={styles.tableCellSubtext}>
            {display.date} · {display.time}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
      </View>
      <AppointmentInfoButton {...getInfoButtonProps(item)} />
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/DoctorDashboard/index.jsx,
 * with its exact visual design (see src/theme/colors.js's `adTokens`, ported
 * 1:1 from src/styles/components.css's "ad-" token set) rather than a
 * generic approximation.
 */
export default function DoctorDashboardPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const {
    scheduledRequestList,
    appointmentHistoryList,
    todayScheduleList,
    analytics,
    acceptingAppointmentId,
    status,
    refresh,
    acceptRequest,
  } = useDoctorDashboard();
  const [tfaStatus, setTfaStatus] = useState('');
  const [detailsAppointmentId, setDetailsAppointmentId] = useState(null);
  // Web: `isFirstVisit == "true"` opens the blocking Create Profile form on the dashboard.
  const [createProfileOpen, setCreateProfileOpen] = useState(false);

  const doctorId = profile?.userId;

  useEffect(() => {
    if (doctorId) refresh(doctorId);
    getItem('tfaStatus').then((value) => setTfaStatus((value || '').toLowerCase()));
    getItem('isFirstVisit').then((value) => setCreateProfileOpen(value === 'true'));
  }, [doctorId, refresh]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const upcoming = appointmentHistoryList
      .filter((appointment) =>
        UPCOMING_APPOINTMENT_STATUSES.includes(
          (appointment?.appointmentStatus || '').toLowerCase(),
        ),
      )
      .map((appointment) => ({ appointment, startMs: getAppointmentDisplay(appointment).instantMs }))
      .filter(({ startMs }) => startMs && startMs > now)
      .sort((a, b) => a.startMs - b.startMs);
    return upcoming[0]?.appointment || null;
  }, [appointmentHistoryList]);

  const filteredTodaySchedule = useMemo(
    () =>
      todayScheduleList.filter((item) =>
        TODAY_SCHEDULE_STATUSES.includes((item?.appointmentStatus || '').toLowerCase()),
      ),
    [todayScheduleList],
  );

  const recentAppointmentsPreview = appointmentHistoryList.slice(0, RECENT_APPOINTMENTS_PREVIEW_COUNT);

  const isIdpComplete = (profile?.idpStatus || '').toLowerCase() === 'idpsuccess';
  const isTfaComplete = tfaStatus === 'tfaactivatedsuccess';

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={() => refresh(doctorId)} />}
    >
      <Text style={styles.greeting}>
        {getGreeting()} <Text style={styles.greetingName}>Dr. {profile?.fullName || 'Doctor'}</Text>
      </Text>
      <Text style={styles.subtitle}>Manage your practice, patients, and appointments securely.</Text>

      <View style={styles.badgeRow}>
        <Pressable
          style={[styles.idpBadge, isIdpComplete ? styles.idpBadgeSuccess : styles.idpBadgeWarning]}
          disabled={isIdpComplete}
          onPress={() => navigation.navigate('IdentityProofing')}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={13} color={isIdpComplete ? adTokens.successDark : adTokens.warningDark} />
          <Text style={[styles.idpBadgeText, { color: isIdpComplete ? adTokens.successDark : adTokens.warningDark }]}>
            {isIdpComplete ? 'IDP Verified' : 'IDP Pending'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.idpBadge, isTfaComplete ? styles.idpBadgeSuccess : styles.idpBadgeWarning]}
          disabled={isTfaComplete}
          onPress={() => navigation.navigate('IdentityProofing')}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={13} color={isTfaComplete ? adTokens.successDark : adTokens.warningDark} />
          <Text style={[styles.idpBadgeText, { color: isTfaComplete ? adTokens.successDark : adTokens.warningDark }]}>
            {isTfaComplete ? 'TFA Verified' : 'TFA Pending'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="calendar-check-outline" label="Visits for Today" value={analytics.totalVisit} variant="primary" />
        <StatCard icon="account-plus-outline" label="New Patients" value={analytics.scheduledAppointments} variant="success" />
        <StatCard icon="account-group-outline" label="Returning Patients" value={analytics.completedAppointments} variant="warning" />
        <StatCard icon="bell-outline" label="Pending Requests" value={scheduledRequestList.length} variant="danger" />
        <StatCard icon="star-outline" label="Average Rating" value={analytics.averageRating ?? '-'} variant="warning" />
      </View>

      {nextAppointment && (
        <CardShell style={styles.nextAppointmentCard}>
          <View style={styles.nextHeaderRow}>
            <Text style={styles.sectionLabel}>NEXT APPOINTMENT</Text>
            <View style={styles.inlineRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadge(nextAppointment.appointmentStatus).bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getStatusBadge(nextAppointment.appointmentStatus).color },
                  ]}
                >
                  {getStatusBadge(nextAppointment.appointmentStatus).label}
                </Text>
              </View>
              <AppointmentInfoButton {...getInfoButtonProps(nextAppointment)} size={16} />
            </View>
          </View>
          <Text style={styles.nextPatientName}>
            {nextAppointment.name?.trim() || nextAppointment.patientName?.trim() || 'Patient'}
          </Text>
          <View style={styles.rowGap}>
            <View style={styles.inlineRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={adTokens.textSecondary} />
              <Text style={styles.inlineText}>{getAppointmentDisplay(nextAppointment).date}</Text>
            </View>
            <View style={styles.inlineRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={adTokens.textSecondary} />
              <Text style={styles.inlineText}>{getAppointmentDisplay(nextAppointment).timeWithZone}</Text>
            </View>
          </View>
          <Pressable
            style={styles.viewDetailsLink}
            onPress={() => navigation.navigate('ManageAppointments')}
          >
            <Text style={styles.viewAllLink}>View Details</Text>
          </Pressable>
        </CardShell>
      )}

      <CardShell>
        <CardHeader
          title="Today's Schedule"
          right={
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          }
        />
        <View style={styles.cardBody}>
          {filteredTodaySchedule.length === 0 ? (
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          ) : (
            // Rendered inline in the page's own scroll, not a fixed-height inner
            // ScrollView - a scroll area nested inside another one fights it for
            // the same swipe gesture on Android instead of just scrolling through.
            filteredTodaySchedule.map((item, index) => (
              <ScheduleRow
                key={item.appointmentId ?? index}
                item={item}
                onPress={() => navigation.navigate('TreatmentPlanDetail', { appointmentId: item.appointmentId })}
              />
            ))
          )}
        </View>
      </CardShell>

      <CardShell>
        <CardHeader
          title="Pending Requests"
          right={<GhostIconButton icon="refresh" loading={status === 'loading'} onPress={() => refresh(doctorId)} />}
        />
        {status === 'loading' ? (
          <View style={[styles.cardBody, styles.pendingRequestsLoading]}>
            <ActivityIndicator size="small" color={adTokens.primary} />
          </View>
        ) : scheduledRequestList.length === 0 ? (
          <View style={styles.cardBody}>
            <Text style={styles.emptyText}>No pending appointment requests.</Text>
          </View>
        ) : (
          // Fixed-height inner scroll, unlike Today's Schedule above - this list can run into
          // the hundreds (a busy clinic's whole request queue), which would otherwise push the
          // rest of the dashboard off-screen. nestedScrollEnabled lets Android's nested-scrolling
          // model hand the gesture to this inner list while the finger is over it.
          <ScrollView
            style={[styles.cardBody, styles.pendingRequestsScroll]}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {scheduledRequestList.map((item) => (
              <PendingRequestRow
                key={item.appointmentId}
                item={item}
                isAccepting={acceptingAppointmentId === item.appointmentId}
                onAccept={() => acceptRequest(item.appointmentId, doctorId)}
                onShowDetails={() => setDetailsAppointmentId(item.appointmentId)}
              />
            ))}
          </ScrollView>
        )}
      </CardShell>

      <CardShell>
        <CardHeader title="Quick Links" />
        <View style={[styles.cardBody, styles.quickLinksRow]}>
          <QuickLinkButton
            icon="clipboard-list-outline"
            label="Appointments"
            variant="success"
            onPress={() => navigation.navigate('ManageAppointments')}
          />
          <QuickLinkButton
            icon="message-text-outline"
            label="Messages"
            variant="warning"
            onPress={() => navigation.navigate('DoctorMessage')}
          />
        </View>
      </CardShell>

      <CardShell>
        <CardHeader
          title="Recent Appointments"
          right={
            <Pressable onPress={() => navigation.navigate('ManageAppointments')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          }
        />
        {recentAppointmentsPreview.length === 0 ? (
          <View style={styles.cardBody}>
            <Text style={styles.emptyText}>No recent appointments.</Text>
          </View>
        ) : (
          <View style={styles.cardBody}>
            {recentAppointmentsPreview.map((item, index) => (
              <RecentAppointmentRow
                key={item.appointmentId ?? index}
                item={item}
                onView={() => navigation.navigate('ManageAppointments')}
              />
            ))}
          </View>
        )}
      </CardShell>

      <Text style={styles.hipaaNotice}>
        All patient data is handled in accordance with HIPAA regulations. Ensure you access
        patient records only as necessary for treatment.{' '}
        <Text
          style={styles.hipaaLink}
          onPress={() => navigation.navigate('LegalWebView', IN_APP_LEGAL_PAGES.privacyPolicy)}
        >
          Privacy Policy
        </Text>
      </Text>

      <PendingRequestDetailsModal
        visible={detailsAppointmentId != null}
        appointmentId={detailsAppointmentId}
        onClose={() => setDetailsAppointmentId(null)}
        onAccept={(appointmentId) => acceptRequest(appointmentId, doctorId)}
        isAccepting={acceptingAppointmentId === detailsAppointmentId}
        acceptDisabled={acceptingAppointmentId != null}
      />

      <DoctorProfileModal visible={createProfileOpen} onClose={() => setCreateProfileOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  flex1: { flex: 1 },
  greeting: { fontSize: 20, fontWeight: '600', color: adTokens.textPrimary },
  greetingName: { fontWeight: '700' },
  subtitle: { fontSize: 13.5, color: adTokens.textSecondary, marginTop: 4 },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16, flexWrap: 'wrap' },
  idpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  idpBadgeSuccess: { backgroundColor: adTokens.successLight },
  idpBadgeWarning: { backgroundColor: adTokens.warningLight },
  idpBadgeText: { fontSize: 12, fontWeight: '600' },

  // ── Stat cards (.ad-stat-card) ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: adTokens.cardBorderRadius,
    borderLeftWidth: 3,
    padding: 14,
    ...adTokens.cardShadow,
  },
  statIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12.5, color: adTokens.textSecondary, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: adTokens.textPrimary, letterSpacing: -0.3 },

  // ── Generic ad-card ──
  card: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    marginBottom: 16,
    overflow: 'hidden',
    ...adTokens.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  cardHeaderTitle: { fontSize: 15.5, fontWeight: '700', color: adTokens.textPrimary },
  cardBody: { padding: 14 },
  pendingRequestsScroll: { maxHeight: 360 },
  pendingRequestsLoading: { alignItems: 'center', paddingVertical: 24 },
  ghostIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adTokens.gray100,
  },
  datePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: adTokens.gray100,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  datePillText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  viewAllLink: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },

  // ── Next appointment ──
  nextAppointmentCard: { padding: 16 },
  nextHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: adTokens.primaryDark, letterSpacing: 0.5 },
  nextPatientName: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary, marginTop: 4 },
  rowGap: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineText: { fontSize: 13, color: adTokens.textSecondary },
  emptyText: { fontSize: 13.5, color: adTokens.textSecondary },
  viewDetailsLink: { marginTop: 10, alignSelf: 'flex-start' },

  // ── Today's Schedule rows (.ad-schedule-item) ──
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    backgroundColor: adTokens.white,
    marginBottom: 8,
  },
  scheduleRowPressed: { backgroundColor: adTokens.gray50 },
  scheduleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: adTokens.gray100,
    borderWidth: 2,
    borderColor: adTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleAvatarText: { fontSize: 15, fontWeight: '700', color: adTokens.textSecondary },
  scheduleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  scheduleRef: { fontSize: 10.5, color: adTokens.textMuted },
  scheduleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  scheduleTime: { fontSize: 11.5, fontWeight: '700', color: adTokens.textSecondary },
  videoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: adTokens.primaryLight,
  },
  videoPillText: { fontSize: 10, fontWeight: '700', color: adTokens.primaryDark },

  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },

  // ── Pending Requests rows ──
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: adTokens.cardBorderRadius,
    backgroundColor: adTokens.gray50,
    marginBottom: 8,
  },
  pendingAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: adTokens.white,
    borderWidth: 2,
    borderColor: adTokens.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAvatarText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pendingName: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  pendingSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  consultReasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  consultReasonLabel: { fontSize: 10.5, fontWeight: '600', color: adTokens.textSecondary },
  consultReasonBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: adTokens.primary,
    maxWidth: 160,
  },
  consultReasonBadgeText: { fontSize: 10.5, fontWeight: '600', color: adTokens.white },
  consultInfoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: adTokens.success,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  acceptButtonText: { color: adTokens.white, fontWeight: '600', fontSize: 12 },

  // ── Quick Links (.ad-quick-action) ──
  quickLinksRow: { flexDirection: 'row', gap: 12 },
  quickLinkPressable: { flex: 1 },
  quickLinkButton: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
  },
  quickLinkIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLinkLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textPrimary },

  // ── Recent Appointments (list row, not the web's HTML table) ──
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  tableCellSubtext: { fontSize: 11, color: adTokens.textSecondary },

  hipaaNotice: { fontSize: 11.5, color: adTokens.textMuted, textAlign: 'center', marginTop: 4 },
  hipaaLink: { color: adTokens.primaryDark, fontWeight: '600' },
});
