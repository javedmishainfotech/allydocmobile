import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useNurseDashboard } from '../../hooks/useNurseDashboard';
import { getItem } from '../../utils/storage';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import DoctorProfileModal from '../../components/settings/DoctorProfileModal';
import AddUserModal from '../../components/nurse/AddUserModal';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  return 'Good Evening,';
}

const STAT_VARIANTS = {
  primary: { gradient: ['#EFF6FF', '#DBEAFE'], border: adTokens.primary, iconBg: adTokens.primaryTint, iconColor: adTokens.primary },
  success: { gradient: ['#ECFDF5', '#D1FAE5'], border: adTokens.success, iconBg: adTokens.successTint, iconColor: adTokens.success },
  warning: { gradient: ['#FFFBEB', '#FEF3C7'], border: adTokens.warning, iconBg: adTokens.warningTint, iconColor: adTokens.warning },
  danger: { gradient: ['#FEF2F2', '#FEE2E2'], border: adTokens.danger, iconBg: adTokens.dangerTint, iconColor: adTokens.danger },
};

function StatCard({ icon, label, value, variant = 'primary' }) {
  const v = STAT_VARIANTS[variant] || STAT_VARIANTS.primary;
  return (
    <LinearGradient colors={v.gradient} style={[styles.statCard, { borderLeftColor: v.border }]}>
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

function CardShell({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function CardHeader({ title, subtitle, onViewAll }) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.flex1}>
        <Text style={styles.cardHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAllLink}>View All</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

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

function AppointmentRow({ item }) {
  const name = item.patientName || item.name || item.doctorName || 'Unknown';
  const display = getAppointmentDisplay(item);
  return (
    <View style={styles.apptRow}>
      <View style={styles.apptAvatar}>
        <Text style={styles.apptAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.apptName} numberOfLines={1}>{name}</Text>
        <Text style={styles.apptMeta}>
          {display.date} · {display.timeWithZone}
          {item.reference ? ` · #${item.reference}` : ''}
        </Text>
      </View>
      <StatusBadge status={item.appointmentStatus || item.status} />
      <AppointmentInfoButton {...getInfoButtonProps(item)} />
    </View>
  );
}

function PersonRow({ name, meta, image }) {
  return (
    <View style={styles.personRow}>
      {image ? (
        <Image source={{ uri: image }} style={styles.personAvatarImage} />
      ) : (
        <View style={styles.personAvatar}>
          <Text style={styles.personAvatarText}>{(name || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.flex1}>
        <Text style={styles.personName} numberOfLines={1}>{name}</Text>
        <Text style={styles.personMeta} numberOfLines={1}>{meta}</Text>
      </View>
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Nurse/NurseDashboard/index.jsx: hero banner with
 * Add Doctor/Add Patient, 4 stat cards, Recent Appointments, Doctors/Patients top-5 widgets,
 * plus the first-visit Create Profile gate (built earlier this session).
 */
export default function NurseDashboardPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const { data: payload, status, refresh } = useNurseDashboard();
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [addUserMode, setAddUserMode] = useState(null); // 'doctor' | 'patient' | null
  const [refreshing, setRefreshing] = useState(false);

  const nurseId = profile?.userId;
  const loading = (status === 'idle' || status === 'loading') && Object.keys(payload || {}).length === 0;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!nurseId) return;
      if (isRefresh) setRefreshing(true);
      await refresh(nurseId);
      if (isRefresh) setRefreshing(false);
    },
    [nurseId, refresh],
  );

  useEffect(() => {
    load();
    getItem('isFirstVisit').then((value) => setCreateProfileOpen(value === 'true'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nurseId]);

  const appointmentHistoryList = useMemo(() => {
    const list = payload?.doctorAppointmentHistory || payload?.appointmentHistory || payload?.appointments || [];
    return Array.isArray(list) ? [...list].slice(-8).reverse() : [];
  }, [payload]);

  const doctorsList = useMemo(() => {
    const list = payload?.doctorsList || payload?.doctorList || payload?.recentDoctors || payload?.doctors || [];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  }, [payload]);

  const patientsList = useMemo(() => {
    const list = payload?.patientsList || payload?.patientList || payload?.recentPatients || payload?.patients || [];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  }, [payload]);

  const stats = useMemo(() => {
    const statusOf = (item) => String(item?.appointmentStatus || item?.status || '').toLowerCase();
    const scheduled = appointmentHistoryList.filter((a) =>
      ['scheduled', 'accepted', 'confirmed', 'inprogress', 'rescheduled'].includes(statusOf(a)),
    ).length;
    return {
      totalAppointments: payload?.totalAppointments ?? payload?.totalAppointment ?? appointmentHistoryList.length,
      scheduled: payload?.scheduledAppointments ?? payload?.scheduledCount ?? scheduled,
      doctors: payload?.totalDoctors ?? payload?.doctorCount ?? doctorsList.length,
      patients: payload?.totalPatients ?? payload?.patientCount ?? patientsList.length,
    };
  }, [appointmentHistoryList, payload, doctorsList.length, patientsList.length]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <LinearGradient colors={['#1E3A5F', '#1D4ED8']} style={styles.hero}>
        <Text style={styles.heroEyebrow}>Welcome back</Text>
        <Text style={styles.heroTitle}>
          {getGreeting()} {profile?.fullName || 'Nurse'}!
        </Text>
        <Text style={styles.heroSub}>
          Here&apos;s your care overview for today. Manage doctors, patients, and appointments from one place.
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.heroButton} onPress={() => setAddUserMode('doctor')}>
            <MaterialCommunityIcons name="stethoscope" size={15} color={adTokens.primaryDark} />
            <Text style={styles.heroButtonText}>Add Doctor</Text>
          </Pressable>
          <Pressable style={styles.heroButton} onPress={() => setAddUserMode('patient')}>
            <MaterialCommunityIcons name="account-plus-outline" size={15} color={adTokens.primaryDark} />
            <Text style={styles.heroButtonText}>Add Patient</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        <StatCard icon="clipboard-list-outline" label="Total Appointments" value={loading ? '-' : stats.totalAppointments} variant="primary" />
        <StatCard icon="calendar-check-outline" label="Scheduled / Active" value={loading ? '-' : stats.scheduled} variant="success" />
        <StatCard icon="stethoscope" label="Doctors" value={loading ? '-' : stats.doctors} variant="warning" />
        <StatCard icon="account-group-outline" label="Patients" value={loading ? '-' : stats.patients} variant="danger" />
      </View>

      <CardShell>
        <CardHeader title="Recent Appointments" subtitle="Latest appointment activity" onViewAll={() => navigation.navigate('NurseAppointments')} />
        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : appointmentHistoryList.length === 0 ? (
            <Text style={styles.emptyText}>No appointments found yet.</Text>
          ) : (
            appointmentHistoryList.map((item, index) => <AppointmentRow key={item.appointmentId ?? index} item={item} />)
          )}
        </View>
      </CardShell>

      <CardShell>
        <CardHeader title="Doctors" onViewAll={() => navigation.navigate('NurseDoctors')} />
        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : doctorsList.length === 0 ? (
            <Text style={styles.emptyText}>No doctors to show.</Text>
          ) : (
            doctorsList.map((doc, i) => (
              <PersonRow
                key={doc.userId ?? doc.doctorId ?? i}
                name={doc.name || doc.doctorName || doc.fullName || 'Doctor'}
                meta={doc.specializationName || doc.specialization || doc.consultReason || doc.roleName || 'Doctor'}
                image={doc.profileImage || doc.profilePicture}
              />
            ))
          )}
        </View>
      </CardShell>

      <CardShell>
        <CardHeader title="Patients" onViewAll={() => navigation.navigate('NursePatients')} />
        <View style={styles.cardBody}>
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : patientsList.length === 0 ? (
            <Text style={styles.emptyText}>No patients to show.</Text>
          ) : (
            patientsList.map((patient, i) => {
              const meta = [patient.gender, patient.age ? `${patient.age} yrs` : null, patient.bloodGroup].filter(Boolean).join(' | ') || 'Patient';
              return (
                <PersonRow
                  key={patient.userId ?? patient.patientId ?? i}
                  name={patient.name || patient.patientName || patient.fullName || 'Patient'}
                  meta={meta}
                  image={patient.profileImage || patient.profilePicture}
                />
              );
            })
          )}
        </View>
      </CardShell>

      <DoctorProfileModal visible={createProfileOpen} onClose={() => setCreateProfileOpen(false)} />
      <AddUserModal
        visible={addUserMode != null}
        isDoctor={addUserMode === 'doctor'}
        onClose={() => setAddUserMode(null)}
        onSuccess={() => {
          setAddUserMode(null);
          load();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  flex1: { flex: 1 },

  hero: { borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroTitle: { fontSize: 20, fontWeight: '700', color: adTokens.white, marginTop: 4 },
  heroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 18 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adTokens.white,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },

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
  cardHeaderSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 1 },
  viewAllLink: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },
  cardBody: { padding: 14, gap: 10 },
  loader: { marginVertical: 8 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary },

  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  apptAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  apptAvatarText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  apptName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  apptMeta: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  personAvatarImage: { width: 38, height: 38, borderRadius: 19, backgroundColor: adTokens.gray100 },
  personAvatarText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  personName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  personMeta: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
});
