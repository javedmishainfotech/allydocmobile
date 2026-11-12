import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useDoseSpotClinical } from '../../hooks/useDoseSpotClinical';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

// web: reconcileCandidates are fetched from this exact status filter (printed/pharmacy-verified
// prescriptions - the only ones a DoseSpot RxChange could plausibly refer back to).
const CANDIDATE_STATUS = ['Printed', 'PharmacyVerified'];

/** Port of RxChangeDetailedView.jsx's Reconcile flow: when DoseSpot can't auto-match an
 * RxChange request to an existing prescription (`request.UnmatchedChange === true`), the doctor
 * picks which of the patient's existing prescriptions it refers to. Simplified from web's
 * version (which also shows per-candidate prescriber details) to the candidate list itself. */
export default function ReconcileRxChangeModal({ visible, rxChangeId, patientId, onClose, onResolved }) {
  const bottomSafe = useBottomSafeSpacing();
  const { getPatientPrescriptionsByStatus } = usePrescriptions();
  const { reconcileRxChange } = useDoseSpotClinical();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !patientId) return;
    setSelectedId(null);
    setLoading(true);
    getPatientPrescriptionsByStatus(patientId, { status: CANDIDATE_STATUS, limit: 40 }).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.Items || res.data?.items || [];
      setCandidates(res.success ? list : []);
      setLoading(false);
      if (!res.success) toast.error(res.message || 'Unable to load original prescriptions.');
    });
  }, [visible, patientId, getPatientPrescriptionsByStatus]);

  const handleConfirm = async () => {
    if (!selectedId || !rxChangeId || !patientId) return;
    setSubmitting(true);
    const response = await reconcileRxChange(rxChangeId, patientId, selectedId);
    setSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'RxChange reconciled successfully.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to reconcile request.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>Link Original Prescription</Text>
          <Text style={styles.subtitle}>
            Select the prescription this RxChange request refers to.
          </Text>

          <ScrollView contentContainerStyle={styles.body}>
            {loading ? (
              <ActivityIndicator size="large" color={adTokens.primary} style={styles.loader} />
            ) : candidates.length === 0 ? (
              <Text style={styles.emptyText}>No printed or pharmacy-verified prescriptions found for this patient.</Text>
            ) : (
              candidates.map((item, index) => {
                const id = item.PrescriptionId ?? item.prescriptionId ?? item.Id ?? item.id;
                const isSelected = selectedId === id;
                return (
                  <Pressable
                    key={String(id ?? index)}
                    style={[styles.candidateCard, isSelected && styles.candidateCardSelected]}
                    onPress={() => setSelectedId(id)}
                  >
                    <Text style={styles.candidateName}>{item.DisplayName || item.displayName || item.DrugName || `Prescription #${id}`}</Text>
                    <Text style={styles.candidateMeta}>
                      Status: {item.Status || item.status || 'Unknown'} · Written: {item.WrittenDate || item.writtenDate || 'N/A'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, !selectedId && styles.confirmButtonDisabled]} onPress={handleConfirm} disabled={!selectedId || submitting}>
              {submitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.confirmButtonText}>Link Prescription</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 4, marginBottom: 12 },
  body: { paddingBottom: 10, gap: 8 },
  loader: { marginVertical: 24 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 20 },

  candidateCard: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, backgroundColor: adTokens.white },
  candidateCardSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  candidateName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  candidateMeta: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 3 },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  closeButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  confirmButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
