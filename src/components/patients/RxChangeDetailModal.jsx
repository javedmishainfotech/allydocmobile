import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useDoseSpotClinical } from '../../hooks/useDoseSpotClinical';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import ChangePatientModal from './ChangePatientModal';
import ReconcileRxChangeModal from './ReconcileRxChangeModal';
import RxChangeApproveWithChangesModal from './RxChangeApproveWithChangesModal';

const DENIAL_REASONS = [
  { value: 'DeniedPatientUnknown', label: 'Patient Unknown' },
  { value: 'DeniedPatientNotUnderCare', label: 'Patient Not Under Care' },
  { value: 'DeniedNeverPrescribed', label: 'Never Prescribed' },
  { value: 'DeniedChangeInappropriate', label: 'Change Inappropriate' },
  { value: 'DeniedNeedAppointment', label: 'Need Appointment' },
  { value: 'DeniedAtPatientRequest', label: 'At Patient Request' },
  { value: 'DeniedOrderExpired', label: 'Order Expired' },
  { value: 'DeniedPharmacyNotRecognized', label: 'Pharmacy Not Recognized' },
];

// Port of AllyDocReactApp's RxChangeDetailedView.jsx type-check helpers - every RxChangeType
// comparison there is a trimmed, lowercased string match (e.g. "generic substitution"), not a
// PascalCase enum, so these must match that exactly or the type-gated payload shapes below
// silently fall through to the wrong branch.
const rxChangeType = (request) => String(request?.RxChangeType || '').trim().toLowerCase();
const rxChangeSubType = (request) => String(request?.RxChangeSubType || '').trim().toLowerCase();
const isPriorAuthorizationRxChange = (request) => rxChangeType(request) === 'prior authorization' || rxChangeSubType(request) === 'prior authorization';
const isGenericSubstitutionRxChange = (request) => rxChangeType(request) === 'generic substitution';
const isTherapeuticInterchangeRxChange = (request) => rxChangeType(request) === 'therapeutic interchange';
const isDrugUseEvaluationRxChange = (request) => rxChangeType(request) === 'drug use evaluation';
const isOutOfStockRxChange = (request) => rxChangeType(request) === 'out of stock';
const isPrescriberAuthorizationDeaStatus = (request) => rxChangeType(request) === 'prescriber authorization' && rxChangeSubType(request) === 'dea status';

/** Port of rxChangeApproveWithChangesUsesFullPayload: which RxChange types' approve payload
 * carries a full `newPrescription` object (and so can also carry an optional diagnosis) rather
 * than the handful of minimal `{ selectedMedicationId, comment }`-shaped types. */
function approveUsesFullPayload(request) {
  if (isPriorAuthorizationRxChange(request)) return false;
  if (isGenericSubstitutionRxChange(request)) return false;
  if (isPrescriberAuthorizationDeaStatus(request)) return false;
  if (isTherapeuticInterchangeRxChange(request)) return false;
  if (isOutOfStockRxChange(request)) return false;
  return true;
}

function buildDiagnosisFields(diagnosis) {
  const fields = { secondPrescriptionDiagnosis: null };
  if (!diagnosis) return fields;
  const toIdOrNull = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null);
  const primaryDiagnosisId = toIdOrNull(diagnosis.primaryDiagnosisId);
  const secondaryDiagnosisId = toIdOrNull(diagnosis.secondaryDiagnosisId);
  if (primaryDiagnosisId != null || secondaryDiagnosisId != null) {
    fields.firstPrescriptionDiagnosis = { primaryDiagnosisId, secondaryDiagnosisId };
  }
  return fields;
}

/** Port of RxChangeDetailedView.jsx's buildApprovePayload - branches by RxChangeType/SubType,
 * same shape whether approving as proposed or "with changes" (approveWithChanges just swaps in
 * the user-edited `editedMedication` and, for full-payload types, an optional diagnosis). */
function buildApprovePayload(request, { comment = '', priorAuthNumber = '', dea = '', approveWithChanges = false, editedMedication = null, diagnosis = null } = {}) {
  const baseMed = request.RequestedMedications?.[0] || {};
  const med = editedMedication || baseMed;
  const selectedMedicationId = baseMed.PrescriptionId ?? baseMed.PrescribedMedicationId ?? 0;

  if (isPriorAuthorizationRxChange(request)) {
    return { priorAuthNumber: String(priorAuthNumber || '').trim(), selectedMedicationId: Number(selectedMedicationId) || 0 };
  }
  if (isPrescriberAuthorizationDeaStatus(request)) {
    return {
      selectedMedicationId: selectedMedicationId || 0,
      newPrescriptionPatientId: request.Patient?.PatientId || 0,
      prescriberAuthorizationData: String(dea || '').trim(),
      comment: String(comment || '').trim(),
    };
  }
  if (isGenericSubstitutionRxChange(request) || isTherapeuticInterchangeRxChange(request) || isOutOfStockRxChange(request)) {
    return { selectedMedicationId: Number(selectedMedicationId) || 0, comment: String(comment || '').trim() };
  }
  if (isDrugUseEvaluationRxChange(request) && !approveWithChanges) {
    return { selectedMedicationId: Number(selectedMedicationId) || 0, comment: String(comment || '').trim() };
  }

  const diagnosisFields = approveWithChanges && approveUsesFullPayload(request) ? buildDiagnosisFields(diagnosis) : {};
  return {
    priorAuthNumber: med.PriorAuthNumber || '',
    selectedMedicationId: selectedMedicationId || 0,
    newPrescriptionPatientId: request.Patient?.PatientId || 0,
    newPrescription: {
      dispensableDrugId: med.DispensableDrugId || 0,
      refills: parseInt(med.Refills, 10) || 0,
      pharmacyId: med.PharmacyId || 0,
      dispenseUnitId: med.DispenseUnitId || 0,
      noSubstitutions: Boolean(med.NoSubstitutions),
      effectiveDate: med.EffectiveDate || new Date().toISOString(),
      daysSupply: parseInt(med.DaysSupply, 10) || 0,
      pharmacyNotes: med.PharmacyNotes || '',
      isUrgent: Boolean(med.IsUrgent),
      quantity: String(med.Quantity ?? '0'),
      directions: med.Directions || '',
      status: 1,
      ...diagnosisFields,
    },
    comment: String(comment || '').trim(),
  };
}

/** Port of AllyDocReactApp's RxChangeDetailedView.jsx - approve (payload
 * shape branches by RxChangeType) and deny (string-enum reason) parity.
 * Simplified: this always approves the FIRST requested medication exactly
 * as proposed ("approve", not "approve with changes" editing of fields) -
 * the full inline edit-before-approve UI is not ported in this pass. */
export default function RxChangeDetailModal({ visible, request, onClose, onResolved }) {
  const bottomSafe = useBottomSafeSpacing();
  const { approveRxChange, denyRxChange, changeRxChangePatient } = useDoseSpotClinical();
  const [comment, setComment] = useState('');
  const [priorAuthNumber, setPriorAuthNumber] = useState('');
  const [denialReason, setDenialReason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deaNumber, setDeaNumber] = useState('');
  const [linkPatientOpen, setLinkPatientOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [approveWithChangesOpen, setApproveWithChangesOpen] = useState(false);

  if (!request) return null;

  const med = request.RequestedMedications?.[0];
  const rxChangeId = request.RxChangeRequestId ?? request.RxChangeId;
  // web: refillRequestIsNewPatient/isNewPatientRxChange - the pharmacy's patient didn't
  // auto-match an existing clinic patient, so approving is blocked until linked.
  const isNewPatient = request.NewPatient === true || String(request.NewPatient).toLowerCase() === 'true';
  // web: UnmatchedChange - DoseSpot couldn't auto-match this change to an existing prescription.
  const isUnmatched = request.UnmatchedChange === true;

  const handleApprove = async () => {
    if (isPrescriberAuthorizationDeaStatus(request) && !deaNumber.trim()) {
      toast.error('Enter a DEA number.');
      return;
    }
    setIsSubmitting(true);
    const payload = buildApprovePayload(request, { comment, priorAuthNumber, dea: deaNumber });
    const response = await approveRxChange(rxChangeId, payload);
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Request approved.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to approve request.');
    }
  };

  const handleOpenApproveWithChanges = () => {
    if (isPriorAuthorizationRxChange(request)) {
      toast.error('Approve with Changes is not available for Prior Authorization requests.');
      return;
    }
    if (isGenericSubstitutionRxChange(request)) {
      toast.error('Approve with Changes is not available for Generic Substitution requests.');
      return;
    }
    if (!med) {
      toast.error('Requested medication is not available.');
      return;
    }
    setApproveWithChangesOpen(true);
  };

  const handleConfirmApproveWithChanges = async (editedMedication, diagnosis) => {
    setIsSubmitting(true);
    const payload = buildApprovePayload(request, {
      comment,
      priorAuthNumber,
      dea: deaNumber,
      approveWithChanges: true,
      editedMedication,
      diagnosis,
    });
    const response = await approveRxChange(rxChangeId, payload);
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Request approved.');
      setApproveWithChangesOpen(false);
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to approve request.');
    }
  };

  const handleDeny = async () => {
    if (!denialReason) {
      toast.error('Select a denial reason.');
      return;
    }
    setIsSubmitting(true);
    const response = await denyRxChange(rxChangeId, {
      reason: denialReason,
      selectedMedicationId: med?.PrescriptionId ?? med?.PrescribedMedicationId,
      comment,
    });
    setIsSubmitting(false);
    if (response.success) {
      toast.success(response.message || 'Request denied.');
      onResolved?.();
    } else {
      toast.error(response.message || 'Unable to deny request.');
    }
  };

  const handleLinkPatientConfirm = async (selectedPatient) => {
    const targetPatientId = selectedPatient.doseSpotId;
    const response = await changeRxChangePatient(rxChangeId, targetPatientId);
    if (response.success) onResolved?.();
    return response;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>RxChange Request</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{request.RxChangeType}</Text>
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue}>
                {[request.Patient?.FirstName, request.Patient?.LastName].filter(Boolean).join(' ')}
              </Text>
              {med ? (
                <>
                  <Text style={styles.infoLabel}>Requested Medication</Text>
                  <Text style={styles.infoValue}>{med.DisplayName}</Text>
                  <Text style={styles.infoValue}>{med.Directions}</Text>
                  <Text style={styles.infoValue}>
                    Qty {med.Quantity} · Refills {med.Refills} · Days Supply {med.DaysSupply}
                  </Text>
                </>
              ) : null}
            </View>

            {isNewPatient ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  This request isn&apos;t linked to a clinic patient yet. Link it before approving - you can still deny it.
                </Text>
                <Pressable style={styles.warningButton} onPress={() => setLinkPatientOpen(true)}>
                  <Text style={styles.warningButtonText}>Link Patient</Text>
                </Pressable>
              </View>
            ) : null}

            {isUnmatched ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  DoseSpot couldn&apos;t automatically match this change to an existing prescription.
                </Text>
                <Pressable style={styles.warningButton} onPress={() => setReconcileOpen(true)}>
                  <Text style={styles.warningButtonText}>Link Original Prescription</Text>
                </Pressable>
              </View>
            ) : null}

            {isPriorAuthorizationRxChange(request) ? (
              <>
                <Text style={styles.fieldLabel}>Prior Auth Number</Text>
                <TextInput style={styles.input} value={priorAuthNumber} onChangeText={setPriorAuthNumber} placeholderTextColor={adTokens.textMuted} />
              </>
            ) : null}

            {isPrescriberAuthorizationDeaStatus(request) ? (
              <>
                <Text style={styles.fieldLabel}>DEA Number</Text>
                <TextInput style={styles.input} value={deaNumber} onChangeText={setDeaNumber} placeholderTextColor={adTokens.textMuted} />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Comment (optional)</Text>
            <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholderTextColor={adTokens.textMuted} />

            <Text style={styles.fieldLabel}>Denial Reason (if denying)</Text>
            <View style={styles.reasonWrap}>
              {DENIAL_REASONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.reasonChip, denialReason === opt.value && styles.reasonChipActive]}
                  onPress={() => setDenialReason(opt.value)}
                >
                  <Text style={[styles.reasonChipText, denialReason === opt.value && styles.reasonChipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
            <Pressable style={styles.denyButton} onPress={handleDeny} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.denyButtonText}>Deny</Text>}
            </Pressable>
            <Pressable style={styles.approveButton} onPress={handleApprove} disabled={isSubmitting || isNewPatient}>
              {isSubmitting ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.approveButtonText}>Approve</Text>}
            </Pressable>
          </View>
          <Pressable
            style={styles.approveWithChangesButton}
            onPress={handleOpenApproveWithChanges}
            disabled={isSubmitting || isNewPatient}
          >
            <Text style={styles.approveWithChangesButtonText}>Approve with Changes</Text>
          </Pressable>
        </View>
      </View>

      <RxChangeApproveWithChangesModal
        visible={approveWithChangesOpen}
        medication={med}
        showDiagnosis={approveUsesFullPayload(request)}
        submitting={isSubmitting}
        onClose={() => setApproveWithChangesOpen(false)}
        onConfirm={handleConfirmApproveWithChanges}
      />
      <ChangePatientModal
        visible={linkPatientOpen}
        requestPatient={request.Patient}
        entityLabel="RxChange request"
        onClose={() => setLinkPatientOpen(false)}
        onConfirm={handleLinkPatientConfirm}
      />
      <ReconcileRxChangeModal
        visible={reconcileOpen}
        rxChangeId={rxChangeId}
        patientId={request.Patient?.PatientId}
        onClose={() => setReconcileOpen(false)}
        onResolved={() => {
          setReconcileOpen(false);
          onResolved?.();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  body: { paddingBottom: 10 },

  infoCard: { backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12, marginBottom: 14, gap: 2 },
  infoLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary, textTransform: 'uppercase', marginTop: 8 },
  infoValue: { fontSize: 13, color: adTokens.textPrimary },

  warningCard: { backgroundColor: adTokens.warningLight, borderRadius: 10, padding: 12, marginBottom: 14, gap: 8 },
  warningText: { fontSize: 12.5, color: adTokens.warningDark, lineHeight: 17 },
  warningButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: adTokens.warningDark },
  warningButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.white },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, marginBottom: 8 },

  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  reasonChipActive: { backgroundColor: adTokens.danger, borderColor: adTokens.danger },
  reasonChipText: { fontSize: 11, fontWeight: '600', color: adTokens.textSecondary },
  reasonChipTextActive: { color: '#FFFFFF' },

  footer: { flexDirection: 'row', gap: 8, marginTop: 10 },
  closeButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  denyButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.danger, alignItems: 'center' },
  denyButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  approveButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.success, alignItems: 'center' },
  approveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  approveWithChangesButton: { alignItems: 'center', paddingVertical: 10, marginTop: 6 },
  approveWithChangesButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark, textDecorationLine: 'underline' },
});
