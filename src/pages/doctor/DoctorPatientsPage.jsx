import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePatients } from '../../hooks/usePatients';
import { useAuth } from '../../hooks/useAuth';
import {
  normalizeFreelancerPatient,
  normalizeClinicPatient,
  formatProfileStatus,
  parsePagedListResponse,
} from '../../utils/patientListUtils';
import PatientFilterModal, { EMPTY_FREELANCER_PATIENT_FILTER } from '../../components/patients/PatientFilterModal';
import PatientDetailModal from '../../components/patients/PatientDetailModal';
import AddUserModal from '../../components/nurse/AddUserModal';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

const PAGE_SIZE = 10;

function PatientRow({ patient, onOpen, onOpenAppointmentHistory, onOpenTreatmentPlans }) {
  const isRegistered = patient.profileStatusLabel?.toLowerCase().trim() === 'profile created';
  return (
    <View style={styles.row}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{(patient.fullName || 'P').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.rowName} numberOfLines={1}>
          {patient.fullName}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {patient.email}
        </Text>
        <View style={styles.metaLine}>
          <Text style={styles.metaText}>{patient.gender}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>DOB {patient.dob}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>DoseSpot {patient.doseSpotRefrenceId}</Text>
        </View>
        <View style={[styles.statusBadge, isRegistered ? styles.statusBadgeSuccess : styles.statusBadgeWarning]}>
          <Text style={[styles.statusBadgeText, { color: isRegistered ? adTokens.successDark : adTokens.warningDark }]}>
            {formatProfileStatus(patient)}
          </Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          style={[styles.viewButton, !isRegistered && styles.viewButtonDisabled]}
          disabled={!isRegistered}
          onPress={() => onOpen(patient)}
        >
          <Feather name="eye" size={16} color={isRegistered ? adTokens.primaryDark : adTokens.textMuted} />
        </Pressable>
        <Pressable
          style={[styles.viewButton, !isRegistered && styles.viewButtonDisabled]}
          disabled={!isRegistered}
          onPress={() => onOpenAppointmentHistory(patient)}
        >
          <MaterialCommunityIcons
            name="calendar-clock-outline"
            size={16}
            color={isRegistered ? adTokens.primaryDark : adTokens.textMuted}
          />
        </Pressable>
        <Pressable
          style={[styles.viewButton, !isRegistered && styles.viewButtonDisabled]}
          disabled={!isRegistered}
          onPress={() => onOpenTreatmentPlans(patient)}
        >
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={16}
            color={isRegistered ? adTokens.primaryDark : adTokens.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/DoctorPatients/index.jsx (freelancer variant)
 * and .../Patients/index.jsx (clinic/hospital variant) - DoctorPatientsRoute.jsx picks between
 * them by userType/roleName, which this page mirrors via `isFreelancerDoctor`.
 * GET /FreelancerDoctorPatients or /GetListOfPatients, server-paginated + filterable, no
 * client-side search/sort.
 *
 * "+ Add Patient": only the clinic/hospital Patients page has this button on web, and only when
 * roleName2 !== 'doctor admin' (module/Doctor/Pages/Patients/index.jsx) - freelancer doctors never
 * see it, matching `canAddPatient` below. Opens AddPatientModal (POST /AddUser, roleId 9).
 *
 * Row actions: web has 3 icons on both variants (profile/appointments/treatment-plans), all
 * disabled until the patient's profile is created - none of the three are role-gated on web (only
 * "Book Appointment", a 4th icon neither web variant's menu this app has reached shows, is gated
 * by roleName2 !== 'doctor admin'). The profile (eye) and appointment-history icons both open
 * PatientDetailModal (on its "Personal Info" vs "Appointments" tab respectively). The
 * treatment-plan icon navigates to a dedicated per-patient list on web
 * (patients/:id/treatment-plans); this app has no such screen/endpoint ported, so it instead opens
 * the shared DoctorTreatmentPlanPage pre-filtered to that patient, which shows the same data.
 */
export default function DoctorPatientsPage() {
  const dockInset = useDockInset();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { getFreelancerPatients, getClinicPatients } = usePatients();
  // Same routing as the web's DoctorPatientsRoute.jsx: only a freelancer "doctor" uses
  // /FreelancerDoctorPatients; every clinic/hospital role (doctor sub, doctor admin, clinic
  // doctors) uses /GetListOfPatients.
  const isFreelancerDoctor =
    String(profile?.userType || '').toLowerCase() === 'freelancer' &&
    String(profile?.roleName || '').toLowerCase().trim() === 'doctor';
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filter, setFilter] = useState(EMPTY_FREELANCER_PATIENT_FILTER);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('personal');
  const [addPatientVisible, setAddPatientVisible] = useState(false);
  // Web's canShowMergePatientLink(): hidden for doctor admin and nurse.
  const roleNameLower = String(profile?.roleName || '').toLowerCase().trim();
  const canShowMergePatientLink = roleNameLower !== 'doctor admin' && roleNameLower !== 'nurse';
  // Web's module/Doctor/Pages/Patients/index.jsx - the clinic/hospital "+ Add Patients" button
  // only renders when roleName2 !== 'doctor admin' (not shown for doctor admin, shown for doctor
  // sub / clinic doctors); it doesn't exist at all on the freelancer DoctorPatients page.
  const canAddPatient = !isFreelancerDoctor && roleNameLower !== 'doctor admin';

  const loadPatients = useCallback(
    async (pageNumber, activeFilter) => {
      setIsLoading(true);
      const fetchPage = isFreelancerDoctor ? getFreelancerPatients : getClinicPatients;
      let parsed;
      try {
        const data = await fetchPage({ pageNumber, pageSize: PAGE_SIZE, filters: activeFilter });
        parsed = parsePagedListResponse({ success: true, data }, pageNumber, PAGE_SIZE);
      } catch {
        parsed = parsePagedListResponse({ success: false }, pageNumber, PAGE_SIZE);
      }
      const normalize = isFreelancerDoctor ? normalizeFreelancerPatient : normalizeClinicPatient;
      setPatients(parsed.list.map(normalize));
      setTotalPages(parsed.totalPages || 1);
      setTotalRecords(parsed.totalRecords);
      setIsLoading(false);
    },
    [isFreelancerDoctor, getFreelancerPatients, getClinicPatients],
  );

  useEffect(() => {
    loadPatients(page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilter = (nextFilter) => {
    setFilter(nextFilter);
    setFilterModalVisible(false);
    setPage(1);
    loadPatients(1, nextFilter);
  };

  const hasActiveFilter = Object.entries(filter).some(
    ([key, value]) => value && !(key === 'gender' && value === 'both'),
  );

  return (
    <View style={styles.flex1}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadPatients(page, filter)} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Patients</Text>
          <Text style={styles.pageSubtitle}>{totalRecords} patient{totalRecords === 1 ? '' : 's'}</Text>
          <View style={styles.headerActions}>
            {canShowMergePatientLink ? (
              <Pressable style={styles.mergeButton} onPress={() => navigation.navigate('MergePatient')}>
                <MaterialCommunityIcons name="account-multiple-plus-outline" size={16} color={adTokens.primaryDark} />
                <Text style={styles.mergeButtonText}>Merge Patient</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.filterButton, hasActiveFilter && styles.filterButtonActive]} onPress={() => setFilterModalVisible(true)}>
              <MaterialCommunityIcons name="filter-variant" size={16} color={hasActiveFilter ? '#FFFFFF' : adTokens.primaryDark} />
              <Text style={[styles.filterButtonText, hasActiveFilter && styles.filterButtonTextActive]}>Filter</Text>
            </Pressable>
            {canAddPatient ? (
              <Pressable style={styles.addPatientButton} onPress={() => setAddPatientVisible(true)}>
                <Feather name="plus" size={15} color={adTokens.white} />
                <Text style={styles.addPatientButtonText}>Add Patient</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={adTokens.primary} />
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={28} color={adTokens.textMuted} />
            <Text style={styles.emptyStateText}>No patients found.</Text>
          </View>
        ) : (
          patients.map((patient) => (
            <PatientRow
              key={patient.userId}
              patient={patient}
              onOpen={(p) => {
                setDetailInitialTab('personal');
                setSelectedPatient(p);
              }}
              onOpenAppointmentHistory={(p) => {
                setDetailInitialTab('appointments');
                setSelectedPatient(p);
              }}
              onOpenTreatmentPlans={(p) =>
                navigation.navigate('DoctorTreatmentPlan', {
                  initialPatientId: p.userId,
                  initialPatientName: p.fullName,
                })
              }
            />
          ))
        )}

        {totalPages > 1 ? (
          <View style={styles.pagination}>
            <Pressable
              style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Feather name="chevron-left" size={16} color={page <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
            </Pressable>
            <Text style={styles.pageLabel}>
              Page {page} of {totalPages}
            </Text>
            <Pressable
              style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Feather name="chevron-right" size={16} color={page >= totalPages ? adTokens.textMuted : adTokens.primaryDark} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <PatientFilterModal
        visible={filterModalVisible}
        initialFilter={filter}
        onApply={handleApplyFilter}
        onClose={() => setFilterModalVisible(false)}
      />

      <PatientDetailModal
        key={selectedPatient?.userId ?? 'none'}
        visible={Boolean(selectedPatient)}
        patientId={selectedPatient?.userId}
        patientName={selectedPatient?.fullName}
        initialTab={detailInitialTab}
        onClose={() => setSelectedPatient(null)}
      />

      <AddUserModal
        visible={addPatientVisible}
        isDoctor={false}
        onClose={() => setAddPatientVisible(false)}
        onSuccess={() => {
          setAddPatientVisible(false);
          setPage(1);
          loadPatients(1, filter);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  headerRow: { marginBottom: 16 },
  pageTitle: { fontSize: 19, fontWeight: '700', color: adTokens.textPrimary },
  pageSubtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 3 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adTokens.primary,
  },
  mergeButtonText: { fontSize: 12, fontWeight: '600', color: adTokens.primaryDark },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: adTokens.primaryTint,
  },
  filterButtonActive: { backgroundColor: adTokens.primary },
  filterButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  filterButtonTextActive: { color: '#FFFFFF' },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: adTokens.primary,
  },
  addPatientButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },

  emptyState: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyStateText: { fontSize: 13, color: adTokens.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 14,
    marginBottom: 10,
  },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontSize: 16, fontWeight: '700', color: adTokens.textSecondary },
  rowName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  rowDetail: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  metaLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: adTokens.textMuted },
  metaDot: { fontSize: 11, color: adTokens.textMuted },
  statusBadge: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  statusBadgeSuccess: { backgroundColor: adTokens.successLight },
  statusBadgeWarning: { backgroundColor: adTokens.warningLight },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
  rowActions: { gap: 8 },
  viewButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  viewButtonDisabled: { backgroundColor: adTokens.gray100, opacity: 0.6 },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 },
  pageButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  pageButtonDisabled: { backgroundColor: adTokens.gray100 },
  pageLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
});
