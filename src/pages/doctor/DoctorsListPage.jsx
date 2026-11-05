import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getListOfDoctors, getDoctorFeedbackAppointments } from '../../services/doctorsListService';
import { normalizeDoctor, parsePagedListResponse } from '../../utils/patientListUtils';
import PatientFilterModal, { EMPTY_FREELANCER_PATIENT_FILTER } from '../../components/patients/PatientFilterModal';
import DoctorDetailModal from '../../components/doctors/DoctorDetailModal';
import AddUserModal from '../../components/nurse/AddUserModal';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

const PAGE_SIZE = 20;

function FeedbackBadge({ doctorId }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    getDoctorFeedbackAppointments(doctorId).then((res) => {
      if (!active) return;
      const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
      const rated = list.filter((item) => item.rating != null || item.feedbackRating != null);
      const count = rated.length;
      const avg =
        count > 0
          ? rated.reduce((sum, item) => {
              const raw = Number(item.rating ?? item.feedbackRating);
              const scaled = raw > 10 ? raw / 20 : raw;
              return sum + (Number.isFinite(scaled) ? scaled : 0);
            }, 0) / count
          : 0;
      setSummary({ count, avg });
    });
    return () => {
      active = false;
    };
  }, [doctorId]);

  if (!summary) return <ActivityIndicator size="small" />;
  if (summary.count === 0) return <Text style={styles.noRatingsText}>No ratings yet</Text>;
  return (
    <Text style={styles.feedbackText}>
      ★ {summary.avg.toFixed(2)} ({summary.count})
    </Text>
  );
}

function DoctorRow({ doctor, showFeedback, onOpenProfile, onOpenAppointments, onOpenTreatmentPlans }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor.fullName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name} numberOfLines={1}>Dr. {doctor.fullName}</Text>
          <Text style={styles.email} numberOfLines={1}>{doctor.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{doctor.roleLabel}</Text>
            </View>
            {doctor.specializationName ? (
              <View style={styles.specBadge}>
                <Text style={styles.specBadgeText}>{doctor.specializationName}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.rowActions}>
          <Pressable style={styles.viewButton} onPress={() => onOpenProfile(doctor)}>
            <Feather name="eye" size={16} color={adTokens.primaryDark} />
          </Pressable>
          <Pressable style={styles.viewButton} onPress={() => onOpenAppointments(doctor)}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={16} color={adTokens.primaryDark} />
          </Pressable>
          <Pressable style={styles.viewButton} onPress={() => onOpenTreatmentPlans(doctor)}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={adTokens.primaryDark} />
          </Pressable>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>{doctor.phoneNumber}</Text>
        <Text style={styles.metaText} numberOfLines={1}>DOB {doctor.dob}</Text>
        <Text style={styles.metaText} numberOfLines={1}>{doctor.gender}</Text>
      </View>
      {showFeedback ? (
        <View style={styles.feedbackRow}>
          <Text style={styles.metaLabel}>Patient Feedback:</Text>
          <FeedbackBadge doctorId={doctor.userId} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/Doctors/index.jsx (Clinic/Hospital admin's
 * "Doctors" list - sub-doctors in the clinic). Net-new menu item ("Doctors" didn't previously
 * exist on the Doctor side of the app; only a Nurse placeholder existed).
 */
export default function DoctorsListPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const userType = String(profile?.userType || '').toLowerCase().trim();
  // Web's showClinicAdminFeedback: doctor admin at a clinic/hospital.
  const showFeedback = roleName === 'doctor admin' && ['clinic', 'hospital'].includes(userType);

  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filter, setFilter] = useState(EMPTY_FREELANCER_PATIENT_FILTER);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailInitialTab, setDetailInitialTab] = useState('personal');
  const [addDoctorVisible, setAddDoctorVisible] = useState(false);

  const loadDoctors = useCallback(async (pageNumber, activeFilter) => {
    setIsLoading(true);
    const response = await getListOfDoctors({ pageNumber, pageSize: PAGE_SIZE, filters: activeFilter });
    const parsed = parsePagedListResponse(response, pageNumber, PAGE_SIZE);
    setDoctors(parsed.list.map(normalizeDoctor));
    setTotalPages(parsed.totalPages || 1);
    setTotalRecords(parsed.totalRecords);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDoctors(page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilter = (nextFilter) => {
    setFilter(nextFilter);
    setFilterModalVisible(false);
    setPage(1);
    loadDoctors(1, nextFilter);
  };

  const hasActiveFilter = Object.entries(filter).some(
    ([key, value]) => value && !(key === 'gender' && value === 'both'),
  );

  return (
    <View style={styles.flex1}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadDoctors(page, filter)} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.pageTitle}>Doctors</Text>
            <Text style={styles.pageSubtitle}>{totalRecords} doctor{totalRecords === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.addButton} onPress={() => setAddDoctorVisible(true)}>
              <Feather name="plus" size={14} color={adTokens.white} />
              <Text style={styles.addButtonText}>Add Doctor</Text>
            </Pressable>
            <Pressable style={[styles.filterButton, hasActiveFilter && styles.filterButtonActive]} onPress={() => setFilterModalVisible(true)}>
              <MaterialCommunityIcons name="filter-variant" size={16} color={hasActiveFilter ? '#FFFFFF' : adTokens.primaryDark} />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={adTokens.primary} />
          </View>
        ) : doctors.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="doctor" size={28} color={adTokens.textMuted} />
            <Text style={styles.emptyStateText}>No doctors found.</Text>
          </View>
        ) : (
          doctors.map((doctor) => (
            <DoctorRow
              key={doctor.userId}
              doctor={doctor}
              showFeedback={showFeedback}
              onOpenProfile={(d) => {
                setDetailInitialTab('personal');
                setSelectedDoctor(d);
              }}
              onOpenAppointments={(d) => {
                setDetailInitialTab('appointments');
                setSelectedDoctor(d);
              }}
              onOpenTreatmentPlans={(d) => {
                setDetailInitialTab('treatmentPlans');
                setSelectedDoctor(d);
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
            <Text style={styles.pageLabel}>Page {page} of {totalPages}</Text>
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

      <DoctorDetailModal
        key={selectedDoctor?.userId ?? 'none'}
        visible={Boolean(selectedDoctor)}
        doctorId={selectedDoctor?.userId}
        doctorName={selectedDoctor?.fullName}
        showFeedback={showFeedback}
        initialTab={detailInitialTab}
        onClose={() => setSelectedDoctor(null)}
      />

      <AddUserModal
        visible={addDoctorVisible}
        isDoctor
        isDoctorAdmin
        onClose={() => setAddDoctorVisible(false)}
        onSuccess={() => {
          setAddDoctorVisible(false);
          setPage(1);
          loadDoctors(1, filter);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  pageTitle: { fontSize: 19, fontWeight: '700', color: adTokens.textPrimary },
  pageSubtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: adTokens.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  addButtonText: { fontSize: 12, fontWeight: '700', color: adTokens.white },
  filterButton: { padding: 8, borderRadius: 999, backgroundColor: adTokens.primaryTint },
  filterButtonActive: { backgroundColor: adTokens.primary },
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyStateText: { fontSize: 13, color: adTokens.textSecondary },

  row: { backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: adTokens.primaryDark },
  name: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  email: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  roleBadge: { backgroundColor: adTokens.infoLight, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: adTokens.infoDark },
  specBadge: { backgroundColor: adTokens.gray100, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 },
  specBadgeText: { fontSize: 10, fontWeight: '600', color: adTokens.textSecondary },
  rowActions: { flexDirection: 'row', gap: 8 },
  viewButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaText: { fontSize: 11.5, color: adTokens.textSecondary, flexShrink: 1 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: adTokens.gray100 },
  metaLabel: { fontSize: 11, color: adTokens.textMuted },
  feedbackText: { fontSize: 11.5, fontWeight: '700', color: adTokens.warningDark },
  noRatingsText: { fontSize: 11, color: adTokens.textMuted, fontStyle: 'italic' },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  pageButton: { padding: 8, borderRadius: 999, backgroundColor: adTokens.gray100 },
  pageButtonDisabled: { opacity: 0.5 },
  pageLabel: { fontSize: 12.5, color: adTokens.textSecondary },
});
