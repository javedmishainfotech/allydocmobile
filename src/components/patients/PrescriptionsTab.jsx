import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getPatientPrescriptions, getPrescriptionById, cancelPrescription } from '../../services/prescriptionService';
import { getPharmacyById } from '../../services/doseSpotClinicalService';
import {
  normalizePrescriptionRow,
  getPrescriptionStatusTone,
  getCancellationStatusLabel,
  getRenewalPrescriptionLabel,
  normalizeDoseSpotStatusKey,
  naText,
} from '../../utils/treatmentPlanFields';
import { CANCELABLE_PRESCRIPTION_STATUSES, CANCELABLE_MEDICATION_STATUSES } from '../../utils/dispenseUnits';
import PrescriptionDetailModal from '../treatmentPlan/PrescriptionDetailModal';
import PrescriptionActionModal from '../treatmentPlan/PrescriptionActionModal';
import PrescriptionHistoryModal from './PrescriptionHistoryModal';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const TONE_COLORS = {
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  primary: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

function StatusPill({ label, tone }) {
  const colors = TONE_COLORS[tone] || TONE_COLORS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

function pharmacyLine(pharmacy) {
  if (!pharmacy) return null;
  const name = pharmacy.StoreName || pharmacy.storeName || pharmacy.Name || 'Unknown Pharmacy';
  const address = [pharmacy.Address1, pharmacy.City, pharmacy.State, pharmacy.ZipCode].filter(Boolean).join(', ');
  const phone = pharmacy.PrimaryPhone || pharmacy.primaryPhone;
  return { name, address, phone };
}

function PrescriptionRow({ rx, pharmacy, pharmacyLoading, showActions, isNurse, onView, onHistory, onCancel }) {
  const status = rx.Status || 'Unknown';
  const cancellationLabel = getCancellationStatusLabel(status);
  const medStatus = rx.MedicationStatus;
  const renewalLabel = getRenewalPrescriptionLabel(rx);
  const canCancel =
    !isNurse &&
    CANCELABLE_PRESCRIPTION_STATUSES.has(normalizeDoseSpotStatusKey(status)) &&
    CANCELABLE_MEDICATION_STATUSES.has(normalizeDoseSpotStatusKey(medStatus));
  const pharmacyInfo = pharmacyLine(pharmacy);
  const writtenDate = rx.WrittenDate ? new Date(rx.WrittenDate) : null;
  const writtenText =
    writtenDate && !Number.isNaN(writtenDate.getTime())
      ? writtenDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
      : 'N/A';

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.flex1}>
          <Text style={styles.drugName} numberOfLines={2}>
            {rx.medicationDisplayName || rx.DrugName || 'N/A'}
          </Text>
          <Text style={styles.metaText}>{writtenText}</Text>
        </View>
        <StatusPill label={cancellationLabel || status} tone={getPrescriptionStatusTone(status)} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>Days supply: {naText(rx.DaysSupply)}</Text>
        <Text style={styles.statText}>Qty: {naText(rx.Quantity)}</Text>
        <Text style={styles.statText}>Refills: {naText(rx.Refills)}</Text>
        <Text style={styles.statText}>Type: {naText(rx.Type)}</Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>Med. status: {medStatus ? String(medStatus) : 'N/A'}</Text>
        {renewalLabel ? <StatusPill label={renewalLabel} tone={renewalLabel === 'Renewal Approved' ? 'success' : 'info'} /> : null}
      </View>

      {rx.Comment ? <Text style={styles.commentText}>Comment: {String(rx.Comment)}</Text> : null}

      {pharmacyLoading ? (
        <Text style={styles.metaText}>Loading pharmacy...</Text>
      ) : pharmacyInfo ? (
        <View style={styles.pharmacyBox}>
          <Text style={styles.pharmacyName}>{pharmacyInfo.name}</Text>
          {pharmacyInfo.address ? <Text style={styles.metaText}>{pharmacyInfo.address}</Text> : null}
          {pharmacyInfo.phone ? <Text style={styles.metaText}>{pharmacyInfo.phone}</Text> : null}
        </View>
      ) : null}

      {showActions ? (
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionButton} onPress={onView}>
            <Feather name="eye" size={14} color={adTokens.primaryDark} />
            <Text style={styles.actionText}>View</Text>
          </Pressable>
          {!isNurse ? (
            <Pressable style={styles.actionButton} onPress={onHistory}>
              <MaterialCommunityIcons name="history" size={15} color={adTokens.infoDark} />
              <Text style={[styles.actionText, { color: adTokens.infoDark }]}>History</Text>
            </Pressable>
          ) : null}
          {canCancel ? (
            <Pressable style={[styles.actionButton, styles.actionButtonDanger]} onPress={onCancel}>
              <Feather name="slash" size={14} color={adTokens.danger} />
              <Text style={[styles.actionText, { color: adTokens.danger }]}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Port of web's patient-profile Prescriptions tab (module/Doctor/Pages/Patients/components/tabs/PrescriptionsTab.jsx):
 * every prescription the patient has ever had (`GET /api/Prescriptions/GetPatientPrescriptions/{doseSpotPatientId}`,
 * no status filter, 20 a page) - not just one appointment's. View opens the full detail sheet, History opens the
 * audit trail, Cancel asks for a reason (same rules as the Treatment Plan screen's). Delete and "Add Prescription"
 * are commented out on web itself right now, so neither is built here either.
 */
export default function PrescriptionsTab({ doseSpotPatientId }) {
  const { profile } = useAuth();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const isNurse = roleName === 'nurse';
  const isDoctorAdmin = roleName === 'doctor admin';
  const showActions = !isDoctorAdmin;

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pharmacies, setPharmacies] = useState({});
  const fetchedPharmacies = useRef(new Set());

  const [detail, setDetail] = useState({ open: false, loading: false, data: null, pharmacy: null, pharmacyLoading: false });
  const [action, setAction] = useState({ open: false, rx: null, comment: '', submitting: false });
  const [history, setHistory] = useState({ open: false, prescriptionId: null });

  const load = useCallback(
    async (nextPage) => {
      if (!doseSpotPatientId) return;
      setIsLoading(true);
      setLoadError('');
      const result = await getPatientPrescriptions(doseSpotPatientId, nextPage);
      if (!result.success) {
        setRows([]);
        setPagination(null);
        setLoadError(result.message || 'Unable to load prescriptions.');
        setIsLoading(false);
        return;
      }
      const node = result.data || {};
      const items = Array.isArray(node.data) ? node.data : Array.isArray(node.Items) ? node.Items : [];
      setRows(items.map(normalizePrescriptionRow));
      setPagination({
        totalPages: node.totalPages ?? node.TotalPages ?? 1,
        totalRecords: node.totalRecords ?? node.TotalRecords ?? node.count ?? node.Count ?? items.length,
      });
      setPage(nextPage);
      setIsLoading(false);
    },
    [doseSpotPatientId],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    const ids = [...new Set(rows.map((rx) => rx.PharmacyId).filter(Boolean).map((id) => String(id).trim()))].filter(
      (id) => !fetchedPharmacies.current.has(id),
    );
    ids.forEach((id) => {
      fetchedPharmacies.current.add(id);
      getPharmacyById(id).then((result) => {
        const item = result.success ? result.data?.Item || result.data?.item || result.data : null;
        setPharmacies((prev) => ({ ...prev, [id]: item }));
      });
    });
  }, [rows]);

  const openDetail = async (rx) => {
    const id = rx.PrescriptionId;
    if (!id) return;
    setDetail({ open: true, loading: true, data: null, pharmacy: null, pharmacyLoading: false });
    const result = await getPrescriptionById(doseSpotPatientId, id);
    const data = result.success ? result.data?.Prescription || result.data : null;
    setDetail((prev) => ({ ...prev, loading: false, data }));
    const pharmacyId = data?.PharmacyId ?? rx.PharmacyId;
    if (pharmacyId) {
      setDetail((prev) => ({ ...prev, pharmacyLoading: true }));
      const pharmacyResult = await getPharmacyById(String(pharmacyId).trim());
      const pharmacy = pharmacyResult.success ? pharmacyResult.data?.Item || pharmacyResult.data?.item || pharmacyResult.data : null;
      setDetail((prev) => ({ ...prev, pharmacy, pharmacyLoading: false }));
    }
  };

  const confirmCancel = async () => {
    const id = action.rx?.PrescriptionId;
    if (!id) return;
    setAction((prev) => ({ ...prev, submitting: true }));
    const result = await cancelPrescription(doseSpotPatientId, id, action.comment.trim(), null);
    if (!result.success || result.raw?.data?.Result?.ResultCode === 'ERROR') {
      setAction((prev) => ({ ...prev, submitting: false }));
      toast.error(result.message || result.raw?.data?.Result?.ResultDescription || 'Unable to cancel this prescription.');
      return;
    }
    toast.success(result.message || 'Cancellation request submitted successfully.');
    setAction({ open: false, rx: null, comment: '', submitting: false });
    load(page);
  };

  if (isLoading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adTokens.primary} />
        <Text style={styles.metaText}>Loading prescriptions...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
        <Text style={styles.metaText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {rows.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="file-document-outline" size={28} color={adTokens.textMuted} />
          <Text style={styles.metaText}>No prescriptions found for this patient.</Text>
        </View>
      ) : (
        rows.map((rx, index) => (
          <PrescriptionRow
            key={String(rx.PrescriptionId ?? index)}
            rx={rx}
            pharmacy={rx.PharmacyId ? pharmacies[String(rx.PharmacyId).trim()] : null}
            pharmacyLoading={Boolean(rx.PharmacyId) && pharmacies[String(rx.PharmacyId).trim()] === undefined}
            showActions={showActions}
            isNurse={isNurse}
            onView={() => openDetail(rx)}
            onHistory={() => setHistory({ open: true, prescriptionId: rx.PrescriptionId })}
            onCancel={() => setAction({ open: true, rx, comment: '', submitting: false })}
          />
        ))
      )}

      {pagination && pagination.totalPages > 1 ? (
        <View style={styles.pager}>
          <Pressable style={[styles.pageButton, page <= 1 && styles.disabled]} disabled={page <= 1 || isLoading} onPress={() => load(page - 1)}>
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageInfo}>
            Page {page} of {pagination.totalPages}
          </Text>
          <Pressable
            style={[styles.pageButton, page >= pagination.totalPages && styles.disabled]}
            disabled={page >= pagination.totalPages || isLoading}
            onPress={() => load(page + 1)}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </Pressable>
        </View>
      ) : null}

      <PrescriptionDetailModal
        visible={detail.open}
        loading={detail.loading}
        data={detail.data}
        pharmacy={detail.pharmacy}
        pharmacyLoading={detail.pharmacyLoading}
        drugNames={{}}
        onClose={() => setDetail({ open: false, loading: false, data: null, pharmacy: null, pharmacyLoading: false })}
      />
      <PrescriptionActionModal
        visible={action.open}
        name={action.rx?.medicationDisplayName || action.rx?.DrugName || ''}
        mode="cancel"
        comment={action.comment}
        onChangeComment={(comment) => setAction((prev) => ({ ...prev, comment }))}
        submitting={action.submitting}
        onConfirm={confirmCancel}
        onClose={() => setAction((prev) => ({ ...prev, open: false }))}
      />
      <PrescriptionHistoryModal
        visible={history.open}
        doseSpotPatientId={doseSpotPatientId}
        prescriptionId={history.prescriptionId}
        onClose={() => setHistory({ open: false, prescriptionId: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex1: { flex: 1 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 40 },

  row: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  drugName: { fontSize: 14.5, fontWeight: '800', color: adTokens.textPrimary },
  metaText: { fontSize: 12.5, color: adTokens.textSecondary },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  statText: { fontSize: 12.5, color: adTokens.textSecondary },
  commentText: { fontSize: 12.5, color: adTokens.textPrimary },

  pill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800' },

  pharmacyBox: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: adTokens.gray50 },
  pharmacyName: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },

  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: adTokens.primary,
    backgroundColor: adTokens.white,
  },
  actionButtonDanger: { borderColor: adTokens.danger },
  actionText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pageButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: adTokens.primary },
  pageButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pageInfo: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  disabled: { opacity: 0.5 },
});
