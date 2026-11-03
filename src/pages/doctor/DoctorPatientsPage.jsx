import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
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
import MergePatientTab from '../../components/settings/MergePatientTab';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 10;

function PatientRow({ patient, onOpen, onOpenAppointmentHistory }) {
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
      </View>
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/DoctorPatients/index.jsx
 * (freelancer variant, confirmed via DoctorPatientsRoute.jsx's
 * userType==='freelancer' branch) - GET /FreelancerDoctorPatients,
 * server-paginated + filterable, no client-side search/sort, no "Add
 * Patient" button (web doesn't have one on this page either). Row actions:
 * web has 3 icons (profile/appointments/treatment-plans); the profile (eye)
 * and appointment-history icons both open PatientDetailModal (on its
 * "Personal Info" vs "Appointments" tab respectively) - the treatment-plan
 * icon routes to a Nurse-shared screen on web that this app hasn't ported
 * yet, so it's left out rather than linking to nothing.
 */
export default function DoctorPatientsPage() {
  const dockInset = useDockInset();
  const insets = useSafeAreaInsets();
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
  const [mergePatientVisible, setMergePatientVisible] = useState(false);
  // Web's canShowMergePatientLink(): hidden for doctor admin and nurse.
  const roleNameLower = String(profile?.roleName || '').toLowerCase().trim();
  const canShowMergePatientLink = roleNameLower !== 'doctor admin' && roleNameLower !== 'nurse';

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
          <View>
            <Text style={styles.pageTitle}>Patients</Text>
            <Text style={styles.pageSubtitle}>{totalRecords} patient{totalRecords === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.headerActions}>
            {canShowMergePatientLink ? (
              <Pressable style={styles.mergeButton} onPress={() => setMergePatientVisible(true)}>
                <MaterialCommunityIcons name="account-multiple-plus-outline" size={16} color={adTokens.primaryDark} />
                <Text style={styles.mergeButtonText}>Merge Patient</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.filterButton, hasActiveFilter && styles.filterButtonActive]} onPress={() => setFilterModalVisible(true)}>
              <MaterialCommunityIcons name="filter-variant" size={16} color={hasActiveFilter ? '#FFFFFF' : adTokens.primaryDark} />
              <Text style={[styles.filterButtonText, hasActiveFilter && styles.filterButtonTextActive]}>Filter</Text>
            </Pressable>
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

      <Modal visible={mergePatientVisible} animationType="slide" onRequestClose={() => setMergePatientVisible(false)}>
        <View style={styles.flex1}>
          <Toast />
          <View style={[styles.mergeModalHeader, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => setMergePatientVisible(false)} hitSlop={8}>
              <Feather name="chevron-left" size={22} color={adTokens.textPrimary} />
            </Pressable>
            <View>
              <Text style={styles.mergeModalTitle}>Merge Patient</Text>
              <Text style={styles.mergeModalSubtitle}>Search and merge duplicate patient records</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.mergeModalBody}>
            <MergePatientTab />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontSize: 19, fontWeight: '700', color: adTokens.textPrimary },
  pageSubtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
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
  mergeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  mergeModalTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  mergeModalSubtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  mergeModalBody: { padding: 16 },
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
