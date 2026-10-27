import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import {
  getPatientAppointmentHistory,
  getPendingBookingAttempt,
  getUserActiveSubscription,
} from '../../services/patientDashboardService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getInfoButtonProps } from '../../utils/appointmentFields';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import { useDoctorMenu } from '../../navigation/DoctorMenuContext';
import PatientProfileModal from '../../components/settings/PatientProfileModal';
import { getItem } from '../../utils/storage';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

// Same as the web dashboard.
const UPCOMING_STATUSES = ['scheduled', 'accepted', 'confirmed', 'rescheduled'];
const REFRESH_INTERVAL_MS = 10000;
const RECENT_PREVIEW_COUNT = 5;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  return 'Good Evening,';
};

const getSubscriptionList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return value ? [value] : [];
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const formatCurrency = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const doctorLabel = (appointment) =>
  String(appointment?.doctorName || appointment?.title || '').trim();

/** Web `QuickActions` items that have a mobile route; shown only when the backend menu has it. */
const QUICK_ACTIONS = [
  { routeKey: 'PatientMessage', label: 'Messages', icon: 'message-text-outline', tint: adTokens.info },
  { routeKey: 'PatientTreatmentPlan', label: 'Treatment Plans', icon: 'clipboard-text-outline', tint: adTokens.success },
  { routeKey: 'PatientPayments', label: 'Payments', icon: 'credit-card-outline', tint: adTokens.warning },
  { routeKey: 'PatientSettings', tab: 'pharmacy', label: 'My Pharmacy', icon: 'pill', tint: adTokens.primary },
  { routeKey: 'PatientSettings', tab: 'security', label: 'Change Password', icon: 'key-outline', tint: adTokens.textSecondary },
];

function StatCard({ icon, label, value, tint }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}22` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function DoctorAvatar({ name, size = 44 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{getInitials(name)}</Text>
    </View>
  );
}

function AppointmentRow({ appointment, onOpen }) {
  const display = getAppointmentDisplay(appointment);
  const requested = String(appointment.appointmentStatus || '').toLowerCase() === 'requested';
  const name = doctorLabel(appointment);
  const reason = String(appointment.rescheduleReason ?? appointment.RescheduleReason ?? '').trim();

  const canOpen = !requested && appointment.appointmentId != null;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && canOpen && styles.rowPressed]}
      disabled={!canOpen}
      onPress={() => onOpen(appointment.appointmentId)}
    >
      <DoctorAvatar name={name} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {requested ? '' : 'Dr. '}
          {name || '—'}
        </Text>
        {appointment.reference ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {appointment.reference}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={13} color={adTokens.textMuted} />
          <Text style={styles.metaText}>{display.date}</Text>
          <MaterialCommunityIcons name="clock-outline" size={13} color={adTokens.textMuted} style={styles.metaGap} />
          <Text style={styles.metaText}>{display.timeWithZone}</Text>
        </View>
        {reason ? <Text style={styles.reason}>Reason: {reason}</Text> : null}
        <View style={styles.statusRow}>
          <StatusBadge status={appointment.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(appointment)} />
        </View>
      </View>
      {canOpen ? <Feather name="chevron-right" size={18} color={adTokens.textMuted} /> : null}
    </Pressable>
  );
}

/**
 * Patient dashboard - port of AllyDocReactApp's module/Patient/Pages/Dashboard:
 * greeting + Book Appointment, quick actions, appointment stats, the next appointment, recent
 * appointments (`GET /HistoryAppointmentPatient`, refreshed every 10s like the web), the active
 * subscription card (`GET /GetUserActiveSubscription`) and the staff-initiated "payment pending"
 * banner (`GET /BookingProgress/GetPending`).
 * "Upcoming Appointments" is hidden for a freelancer patient, as on the web. Book Appointment
 * and Pay now open the booking flow; a first-visit patient gets the blocking Create Profile form.
 */
export default function PatientDashboardPage() {
  const navigation = useNavigation();
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const { tabItems, moreItems } = useDoctorMenu();
  const patientId = profile?.userId;
  const fullName = String(profile?.fullName || '').toUpperCase();
  const isFreelancerPatient =
    String(profile?.roleName || '').toLowerCase().trim() === 'patient' &&
    String(profile?.userType || '').toLowerCase() === 'freelancer';

  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Web: `isFirstVisit == "true"` opens the blocking Create Profile form on the dashboard.
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  useEffect(() => {
    getItem('isFirstVisit').then((value) => setCreateProfileOpen(value === 'true'));
  }, []);
  const hasLoadedOnce = useRef(false);

  const availableRoutes = useMemo(
    () => new Set([...tabItems, ...moreItems].map((item) => item.key)),
    [tabItems, moreItems],
  );
  // Settings is always registered (the header's profile menu opens it), so its shortcuts always show.
  const quickActions = QUICK_ACTIONS.filter(
    (action) => action.routeKey === 'PatientSettings' || availableRoutes.has(action.routeKey),
  );

  const loadAppointments = useCallback(
    async ({ silent = false } = {}) => {
      if (!patientId) return;
      if (!silent) setAppointmentsLoading(true);
      const result = await getPatientAppointmentHistory(patientId);
      if (result.success && Array.isArray(result.data)) {
        setAppointments(result.data);
        setAppointmentsError(null);
      } else if (!silent) {
        // A silent background refresh that fails keeps what is already on screen.
        setAppointmentsError(result.success ? null : result.message || 'Unable to load appointments.');
      }
      if (!silent) setAppointmentsLoading(false);
      hasLoadedOnce.current = true;
    },
    [patientId],
  );

  const loadSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    const result = await getUserActiveSubscription();
    setSubscription(result.success ? getSubscriptionList(result.data).find(Boolean) || null : null);
    setSubscriptionLoading(false);
  }, []);

  const loadPendingPayment = useCallback(async () => {
    if (!patientId) return;
    const result = await getPendingBookingAttempt(patientId);
    const attempt = result.success ? result.data : null;
    // Only a staff-initiated attempt that is sitting at the payment step.
    setPendingPayment(
      attempt?.attemptId && attempt?.isStaffInitiated && attempt?.currentStep === 'DateTime' ? attempt : null,
    );
  }, [patientId]);

  // Load everything on focus and poll the appointments while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      loadAppointments({ silent: hasLoadedOnce.current });
      loadSubscription();
      loadPendingPayment();
      const timer = setInterval(() => loadAppointments({ silent: true }), REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadAppointments, loadSubscription, loadPendingPayment]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAppointments({ silent: true }), loadSubscription(), loadPendingPayment()]);
    setRefreshing(false);
  };

  const { nextAppointment, upcomingCount } = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments
      .filter((a) => UPCOMING_STATUSES.includes(String(a.appointmentStatus || '').toLowerCase()))
      .map((a) => ({ a, start: getAppointmentDisplay(a).instantMs }))
      .filter(({ start }) => start !== null && start > now)
      .sort((x, y) => x.start - y.start);
    return { nextAppointment: upcoming[0]?.a ?? null, upcomingCount: upcoming.length };
  }, [appointments]);

  const completedCount = appointments.filter(
    (a) => String(a.appointmentStatus || '').toLowerCase() === 'completed',
  ).length;
  const pendingCount = appointments.filter((a) =>
    ['requested', 'pending'].includes(String(a.appointmentStatus || '').toLowerCase()),
  ).length;

  const recentAppointments = useMemo(
    () =>
      [...appointments].sort(
        (first, second) =>
          (getAppointmentDisplay(second).instantMs || 0) - (getAppointmentDisplay(first).instantMs || 0),
      ),
    [appointments],
  );

  const goTo = (routeKey, params) => navigation.navigate(routeKey, params);
  const openDetail = (appointmentId) => navigation.navigate('TreatmentPlanDetail', { appointmentId });

  const allowed = toNumber(subscription?.allowedAppointments);
  const used = toNumber(subscription?.usedAppointments);
  const remaining = toNumber(subscription?.remainingAppointments, Math.max(allowed - used, 0));
  const usagePercent = allowed > 0 ? Math.min((used / allowed) * 100, 100) : 0;
  const nextDisplay = nextAppointment ? getAppointmentDisplay(nextAppointment) : null;
  const nextDoctor = doctorLabel(nextAppointment);

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {pendingPayment ? (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="credit-card-clock-outline" size={22} color={adTokens.warningDark} />
          <View style={styles.bannerBody}>
            <Text style={styles.bannerTitle}>Payment pending</Text>
            <Text style={styles.bannerText}>
              {pendingPayment.facilityName
                ? `${pendingPayment.facilityName} has scheduled an appointment for you. Complete the payment to confirm it.`
                : 'An appointment has been scheduled for you. Complete the payment to confirm it.'}
            </Text>
          </View>
          <Pressable style={styles.bannerButton} onPress={() => navigation.navigate('BookAppointment', { paymentQuestionnaireId: pendingPayment.patientQuestionnaireId })}>
            <Text style={styles.bannerButtonText}>Pay now</Text>
          </Pressable>
        </View>
      ) : null}

      <PatientProfileModal visible={createProfileOpen} onClose={() => setCreateProfileOpen(false)} />

      <View style={styles.welcome}>
        <Text style={styles.greeting}>
          {getGreeting()} <Text style={styles.greetingName}>{fullName}!</Text>
        </Text>
        <Text style={styles.welcomeText}>
          Manage your health appointments and stay connected with your healthcare providers.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <MaterialCommunityIcons name="calendar-plus" size={18} color={adTokens.white} />
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </Pressable>
      </View>

      {quickActions.length > 0 ? (
        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <Pressable
              key={`${action.routeKey}:${action.tab ?? ''}`}
              style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}
              onPress={() => goTo(action.routeKey, action.tab ? { tab: action.tab } : undefined)}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${action.tint}22` }]}>
                <MaterialCommunityIcons name={action.icon} size={22} color={action.tint} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.statsRow}>
        {!isFreelancerPatient ? (
          <StatCard icon="calendar-month-outline" label="Upcoming Appointments" value={upcomingCount} tint={adTokens.primary} />
        ) : null}
        <StatCard icon="clock-outline" label="Pending Appointments" value={pendingCount} tint={adTokens.warning} />
        <StatCard icon="pulse" label="Completed Appointments" value={completedCount} tint={adTokens.success} />
      </View>

      {nextAppointment ? (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.rowPressed]}
          onPress={() => openDetail(nextAppointment.appointmentId)}
        >
          <Text style={styles.nextEyebrow}>NEXT APPOINTMENT</Text>
          <View style={styles.nextRow}>
            <DoctorAvatar name={nextDoctor} size={52} />
            <View style={styles.rowBody}>
              <Text style={styles.nextName} numberOfLines={1}>
                Dr. {nextDoctor}
              </Text>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color={adTokens.textMuted} />
                <Text style={styles.metaText}>{nextDisplay.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={adTokens.textMuted} />
                <Text style={styles.metaText}>{nextDisplay.timeWithZone}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusBadge status={nextAppointment.appointmentStatus} />
            <AppointmentInfoButton {...getInfoButtonProps(nextAppointment)} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Appointments</Text>
          {availableRoutes.has('PatientAppointments') ? (
            <Pressable style={styles.viewAll} onPress={() => goTo('PatientAppointments')}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={14} color={adTokens.primaryDark} />
            </Pressable>
          ) : null}
        </View>

        {appointmentsLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="small" color={adTokens.primary} />
            <Text style={styles.stateText}>Loading appointments...</Text>
          </View>
        ) : appointmentsError ? (
          <View style={styles.state}>
            <MaterialCommunityIcons name="alert-circle-outline" size={26} color={adTokens.danger} />
            <Text style={styles.stateText}>{appointmentsError}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadAppointments()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : recentAppointments.length === 0 ? (
          <View style={styles.state}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={30} color={adTokens.textMuted} />
            <Text style={styles.stateTitle}>No Recent Appointments Yet</Text>
            <Text style={styles.stateText}>You don&apos;t have any appointments to show right now.</Text>
          </View>
        ) : (
          recentAppointments.slice(0, RECENT_PREVIEW_COUNT).map((appointment, index) => (
            <View key={String(appointment.appointmentId ?? index)}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <AppointmentRow appointment={appointment} onOpen={openDetail} />
            </View>
          ))
        )}
      </View>

      <View style={styles.subscriptionCard}>
        {subscriptionLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="small" color={adTokens.white} />
            <Text style={styles.subscriptionMuted}>Loading subscription details...</Text>
          </View>
        ) : !subscription ? (
          <View style={styles.noSubscription}>
            <Text style={styles.subscriptionTitleSmall}>No Active Subscription</Text>
            <Text style={styles.subscriptionMuted}>You do not have an active subscription plan yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.subscriptionTop}>
              <View style={styles.flex1}>
                <Text style={styles.subscriptionEyebrow}>CURRENT PLAN</Text>
                <Text style={styles.subscriptionName}>{subscription.subscriptionName || '-'}</Text>
              </View>
              <View
                style={[
                  styles.activePill,
                  { backgroundColor: subscription.isValid ? '#D1FAE5' : '#FEF3C7' },
                ]}
              >
                <Text style={[styles.activePillText, { color: subscription.isValid ? '#047857' : '#B45309' }]}>
                  {subscription.isValid ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(subscription.chargesPaid)}</Text>
              <Text style={styles.subscriptionMuted}> / period</Text>
            </View>

            <View style={styles.usageHeader}>
              <Text style={styles.usageLabel}>Appointment Usage</Text>
              <Text style={styles.usageValue}>
                {used} / {allowed} used
              </Text>
            </View>
            <View style={styles.usageTrack}>
              <View style={[styles.usageFill, { width: `${usagePercent}%` }]} />
            </View>
            <Text style={styles.subscriptionMuted}>{remaining} appointments remaining</Text>

            <View style={styles.dateRow}>
              {[
                { label: 'Valid From', value: formatDate(subscription.validFrom) },
                { label: 'Valid Till', value: formatDate(subscription.validTill) },
              ].map((field) => (
                <View key={field.label} style={styles.dateBox}>
                  <Text style={styles.dateLabel}>{field.label}</Text>
                  <Text style={styles.dateValue}>{field.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!subscriptionLoading ? (
          <Pressable
            style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
            onPress={() => goTo('PatientSettings', { tab: 'subscription-plans' })}
          >
            <Text style={styles.manageText}>Manage Subscription</Text>
            <Feather name="chevron-right" size={16} color={adTokens.primary} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.hipaa}>
        Your health information is protected under HIPAA regulations. All data is encrypted and transmitted
        securely.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16, gap: 14 },
  pressed: { opacity: 0.85 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.warning,
    backgroundColor: adTokens.warningLight,
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: adTokens.warningDark },
  bannerText: { fontSize: 12.5, color: adTokens.warningDark, marginTop: 2, lineHeight: 17 },
  bannerButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: adTokens.warningDark },
  bannerButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },

  welcome: {
    padding: 16,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    gap: 6,
    ...adTokens.cardShadow,
  },
  greeting: { fontSize: 18, color: adTokens.textPrimary },
  greetingName: { fontWeight: '800' },
  welcomeText: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: adTokens.primary,
  },
  bookButtonText: { fontSize: 14.5, fontWeight: '700', color: adTokens.white },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  quickIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 12,
    gap: 6,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: adTokens.textPrimary },
  statLabel: { fontSize: 11.5, color: adTokens.textSecondary, lineHeight: 15 },

  card: {
    padding: 14,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },

  nextEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: adTokens.primary, marginBottom: 10 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextName: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowPressed: { backgroundColor: adTokens.gray50 },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  rowSub: { fontSize: 11.5, color: adTokens.textMuted },
  reason: { fontSize: 12, color: adTokens.textSecondary, lineHeight: 16 },
  divider: { height: 1, backgroundColor: adTokens.border, marginVertical: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaGap: { marginLeft: 8 },
  metaText: { fontSize: 12, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  avatar: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: adTokens.white },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  subscriptionCard: {
    padding: 18,
    gap: 14,
    borderRadius: adTokens.cardBorderRadius,
    backgroundColor: adTokens.primary,
    ...adTokens.cardShadow,
  },
  noSubscription: {
    alignItems: 'center',
    padding: 18,
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  subscriptionTitleSmall: { fontSize: 15, fontWeight: '700', color: adTokens.white },
  subscriptionMuted: { fontSize: 13, color: 'rgba(255,255,255,0.78)' },
  subscriptionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subscriptionEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: 'rgba(255,255,255,0.68)' },
  subscriptionName: { fontSize: 24, fontWeight: '800', color: adTokens.white, marginTop: 2 },
  activePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  activePillText: { fontSize: 11.5, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 32, fontWeight: '800', color: adTokens.white },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  usageValue: { fontSize: 13, fontWeight: '800', color: adTokens.white },
  usageTrack: { height: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginTop: -6 },
  usageFill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dateLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.68)', marginBottom: 4 },
  dateValue: { fontSize: 13, fontWeight: '800', color: adTokens.white },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: adTokens.white,
  },
  manageText: { fontSize: 14, fontWeight: '700', color: adTokens.primary },

  hipaa: { fontSize: 11.5, color: adTokens.textMuted, textAlign: 'center', lineHeight: 16 },
});
