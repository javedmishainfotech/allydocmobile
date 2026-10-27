import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { getTreatmentPlanDetails } from '../../services/treatmentPlanService';
import { getPharmacyById, selectMedication } from '../../services/doseSpotClinicalService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getInfoButtonProps } from '../../utils/appointmentFields';
import {
  getCancellationStatusLabel,
  getDoctorFullNameFromDetail,
  getDrugIdsForRow,
  getMedicationLabel,
  getPatientFullNameFromDetail,
  getPrescriptionStatusTone,
  getRenewalPrescriptionLabel,
  isPatientVisiblePrescriptionStatus,
  naText,
  normalizePrescriptionRow,
  parseCompoundIngredients,
} from '../../utils/treatmentPlanFields';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import ConsultQuestionnaireItem from '../../components/ConsultQuestionnaireItem';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const SOAP_FIELDS = [
  { label: 'Subjective', key: 'subjective' },
  { label: 'Objective', key: 'objective' },
  { label: 'Assessment', key: 'assessment' },
  { label: 'Plan', key: 'plan' },
];

const TONES = {
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  primary: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function Avatar({ name, imageUrl, size = 64 }) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (imageUrl && !failed) {
    return <Image source={{ uri: imageUrl }} style={shape} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[shape, styles.avatarFallback]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{getInitials(name)}</Text>
    </View>
  );
}

function Pill({ tone = 'neutral', children }) {
  const { bg, color } = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

function Card({ title, subtitle, accent, children }) {
  return (
    <View style={[styles.card, accent && { borderColor: accent }]}>
      {title ? (
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function FieldLine({ label, value }) {
  return (
    <View style={styles.fieldLine}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const pharmacyName = (pharmacy) => pharmacy?.StoreName || pharmacy?.storeName || pharmacy?.Name || 'Unknown Pharmacy';

function PrescriptionCard({ rx, drugNames, pharmacies }) {
  const [open, setOpen] = useState(false);
  const label = getMedicationLabel(rx, drugNames);
  const status = rx.Status ?? rx.status;
  const cancellationLabel = getCancellationStatusLabel(status);
  const medStatus = rx.medicationStatus ?? rx.MedicationStatus;
  const renewalLabel = getRenewalPrescriptionLabel(rx);
  const ingredients = parseCompoundIngredients(rx);
  const pharmacyId = rx.PharmacyId ? String(rx.PharmacyId).trim() : null;
  const pharmacy = pharmacyId ? pharmacies[pharmacyId] : null;
  const pharmacyText = !pharmacyId
    ? '—'
    : pharmacyId && pharmacies[pharmacyId] === undefined
      ? 'Loading...'
      : pharmacy
        ? pharmacyName(pharmacy)
        : '—';
  const written = rx.WrittenDate ? new Date(rx.WrittenDate) : null;
  const writtenText =
    written && !Number.isNaN(written.getTime())
      ? written.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
      : '—';

  return (
    <View style={styles.rx}>
      <Pressable style={styles.rxHeader} onPress={() => setOpen((value) => !value)}>
        <View style={styles.rxIcon}>
          <MaterialCommunityIcons name="pill" size={20} color={adTokens.primary} />
        </View>
        <View style={styles.rxBody}>
          <Text style={styles.rxName} numberOfLines={open ? undefined : 2}>
            {label ?? 'Loading…'}
          </Text>
          <View style={styles.rxPills}>
            <Pill tone={getPrescriptionStatusTone(status)}>{cancellationLabel || status || 'Unknown'}</Pill>
            {renewalLabel ? <Pill tone={renewalLabel === 'Renewal Approved' ? 'success' : 'info'}>{renewalLabel}</Pill> : null}
          </View>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={adTokens.textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.rxDetails}>
          <FieldLine label="Written" value={writtenText} />
          <FieldLine label="Pharmacy" value={pharmacyText} />
          <FieldLine label="Days supply" value={naText(rx.DaysSupply)} />
          <FieldLine label="Quantity" value={naText(rx.Quantity)} />
          <FieldLine label="Refills" value={naText(rx.Refills)} />
          <FieldLine label="Type" value={naText(rx.prescriptionType ?? rx.Type)} />
          <FieldLine label="Medication status" value={medStatus ? String(medStatus) : 'N/A'} />
          {ingredients.length > 0 ? (
            <View style={styles.ingredients}>
              <Text style={styles.fieldLabel}>Ingredients</Text>
              {ingredients.map((ingredient, index) => {
                const drugId = ingredient?.DispensableDrugId ?? ingredient?.dispensableDrugId;
                const name = drugId ? drugNames[String(drugId)] || `Drug #${drugId}` : 'N/A';
                return (
                  <Text key={`${drugId ?? index}-${index}`} style={styles.ingredient}>
                    • {name}
                  </Text>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Treatment plan detail - the merged appointment/treatment-plan screen of the web
 * (module/Doctor/Pages/DoctorTreatmentPlan/DoctorTreatmentDetail, shared by the doctor, patient
 * and nurse portals): `GET /TreatmentPlanDetails?AppointmentId=`.
 *
 * Patient view (this build): the doctor's profile, date/time and status, the doctor's remarks, the
 * patient's own feedback, the read-only SOAP notes, the questionnaire answers, and "Your
 * prescriptions" (only sent / requested ones; drug names via `SelectMedication`, pharmacies via
 * `GetPharmacyById`). Staff-only parts - SOAP editing, prescribing, notes, calls, chat,
 * reschedule / cancel / mark complete - arrive with the Doctor and Nurse treatment-plan modules.
 */
export default function TreatmentPlanDetailPage() {
  const dockInset = useDockInset();
  const route = useRoute();
  const { profile } = useAuth();
  const appointmentId = route.params?.appointmentId;
  const isPatient = String(profile?.roleName || '').toLowerCase().trim() === 'patient';

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [drugNames, setDrugNames] = useState({});
  const [pharmacies, setPharmacies] = useState({});
  const fetchedDrugs = useRef(new Set());
  const fetchedPharmacies = useRef(new Set());

  const load = useCallback(async () => {
    if (appointmentId == null) return;
    setLoadError(null);
    const result = await getTreatmentPlanDetails(appointmentId);
    if (!result.success || !result.data) {
      setDetail(null);
      setLoadError(result.message || 'Unable to load the treatment plan.');
    } else {
      setDetail(result.data);
    }
    setIsLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const questionnaire = useMemo(() => detail?.questionAnwerLists ?? [], [detail?.questionAnwerLists]);
  useEffect(() => {
    setOpenQuestions(new Set(questionnaire.map((_, index) => index)));
  }, [questionnaire]);

  // A patient sees only prescriptions that were actually sent / requested.
  const prescriptions = useMemo(() => {
    const rows = (Array.isArray(detail?.prescriptions) ? detail.prescriptions : []).map(normalizePrescriptionRow);
    return isPatient ? rows.filter((rx) => isPatientVisiblePrescriptionStatus(rx.Status ?? rx.status)) : rows;
  }, [detail?.prescriptions, isPatient]);

  // Resolve drug names (SelectMedication) and pharmacy records (GetPharmacyById) once per id.
  useEffect(() => {
    const ids = [...new Set(prescriptions.flatMap(getDrugIdsForRow))].filter((id) => !fetchedDrugs.current.has(id));
    ids.forEach((drugId) => {
      fetchedDrugs.current.add(drugId);
      selectMedication(Number(drugId)).then((result) => {
        const item = result.success ? result.data?.Item || result.data?.item : null;
        setDrugNames((prev) => ({ ...prev, [drugId]: item?.DisplayName ?? null }));
      });
    });

    const pharmacyIds = [
      ...new Set(prescriptions.map((rx) => rx.PharmacyId).filter((id) => id != null && id !== '').map((id) => String(id).trim())),
    ].filter((id) => !fetchedPharmacies.current.has(id));
    pharmacyIds.forEach((pharmacyId) => {
      fetchedPharmacies.current.add(pharmacyId);
      getPharmacyById(pharmacyId).then((result) => {
        const item = result.success ? result.data?.Item || result.data?.item || result.data || null : null;
        setPharmacies((prev) => ({ ...prev, [pharmacyId]: item }));
      });
    });
  }, [prescriptions]);

  const toggleQuestion = (index) =>
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adTokens.primary} />
        <Text style={styles.centerText}>Loading treatment plan...</Text>
      </View>
    );
  }

  if (loadError || !detail) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={30} color={adTokens.danger} />
        <Text style={styles.centerText}>{loadError || 'Treatment plan not found.'}</Text>
        <Pressable style={styles.retryButton} onPress={() => { setIsLoading(true); load(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // The patient sees the treating doctor in the top card; staff see the patient.
  const counterpartName = isPatient ? getDoctorFullNameFromDetail(detail) || 'Doctor' : getPatientFullNameFromDetail(detail);
  const doctorDoc = detail.doctor || {};
  const imageUrl = isPatient
    ? String(detail.doctorImage || detail.doctor_image || doctorDoc.profileImage || doctorDoc.image || doctorDoc.thumbnail || '').trim()
    : String(detail.patientImage || '').trim();
  const email = isPatient
    ? String(detail.doctorEmail || detail.doctor_email || doctorDoc.email || detail.email || detail.patientEmail || '').trim()
    : String(detail.email || detail.patientEmail || '').trim();

  const display = getAppointmentDisplay(detail);
  const dateText = display.instantMs !== null ? display.date : String(detail.appointmentDate || '');
  const timeText = display.instantMs !== null ? display.timeWithZone : '';

  const remarks = String(detail.remarks ?? '').trim();
  const hasFeedback = Boolean(detail.feedbackRating) || String(detail.feedbackComment ?? '').trim();
  const soapEmpty = SOAP_FIELDS.every(({ key }) => !String(detail[key] ?? '').trim());

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <Avatar name={counterpartName} imageUrl={imageUrl} size={68} />
          <View style={styles.profileBody}>
            <Text style={styles.profileLabel}>{isPatient ? 'Doctor' : 'Patient'}</Text>
            <Text style={styles.profileName} numberOfLines={2}>
              {counterpartName || '—'}
            </Text>
            {email ? (
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="email-outline" size={14} color={adTokens.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {email}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.profileMeta}>
          {dateText ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>{dateText}</Text>
            </View>
          ) : null}
          {timeText ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>
          ) : null}
          <View style={styles.statusRow}>
            <StatusBadge status={detail.appointmentStatus} />
            <AppointmentInfoButton {...getInfoButtonProps(detail)} />
          </View>
        </View>
      </View>

      {isPatient && remarks ? (
        <Card title="Doctor's Remarks">
          <Text style={styles.bodyText}>{remarks}</Text>
        </Card>
      ) : null}

      {isPatient && hasFeedback ? (
        <Card
          title={`Patient Feedback${detail.feedbackRating ? ` (${detail.feedbackRating}/5)` : ''}`}
          accent={adTokens.successLight}
        >
          <Text style={styles.bodyText}>{detail.feedbackComment || 'No comment left.'}</Text>
        </Card>
      ) : null}

      <Card title="SOAP Notes">
        {soapEmpty ? (
          <Text style={styles.emptyText}>
            {isPatient
              ? 'No SOAP notes have been submitted for you yet.'
              : 'No SOAP notes have been submitted for this appointment yet.'}
          </Text>
        ) : (
          SOAP_FIELDS.map(({ label, key }) => (
            <View key={key} style={styles.soapBlock}>
              <Text style={styles.soapLabel}>{label}</Text>
              <Text style={styles.bodyText}>{String(detail[key] ?? '').trim() || '—'}</Text>
            </View>
          ))
        )}
      </Card>

      {questionnaire.length > 0 ? (
        <Card title="Questionnaire" subtitle={`${questionnaire.length} question${questionnaire.length === 1 ? '' : 's'}`}>
          <View style={styles.questions}>
            {questionnaire.map((record, index) => (
              <ConsultQuestionnaireItem
                key={index}
                record={record}
                index={index}
                isOpen={openQuestions.has(index)}
                onToggle={() => toggleQuestion(index)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card
        title={isPatient ? 'Your prescriptions' : 'Prescriptions'}
        subtitle={isPatient ? 'View your prescriptions for this visit' : undefined}
      >
        {prescriptions.length === 0 ? (
          <Text style={styles.emptyText}>No prescriptions found.</Text>
        ) : (
          <View style={styles.rxList}>
            {prescriptions.map((rx, index) => (
              <PrescriptionCard
                key={String(rx.PrescriptionId ?? rx.prescriptionRowId ?? index)}
                rx={rx}
                drugNames={drugNames}
                pharmacies={pharmacies}
              />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  centerText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { paddingVertical: 9, paddingHorizontal: 22, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  card: {
    padding: 14,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    gap: 10,
    ...adTokens.cardShadow,
  },
  cardHeader: { gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  cardSubtitle: { fontSize: 12.5, color: adTokens.textSecondary },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileBody: { flex: 1, gap: 3 },
  profileLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: adTokens.primary, textTransform: 'uppercase' },
  profileName: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },
  profileMeta: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: adTokens.border },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flexShrink: 1, fontSize: 12.5, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  avatarFallback: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: adTokens.white },

  bodyText: { fontSize: 14, color: adTokens.textPrimary, lineHeight: 20 },
  emptyText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 10 },
  soapBlock: { gap: 3 },
  soapLabel: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  questions: { gap: 8 },

  rxList: { gap: 10 },
  rx: { borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.gray50, overflow: 'hidden' },
  rxHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  rxIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rxBody: { flex: 1, gap: 6 },
  rxName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  rxPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rxDetails: { paddingHorizontal: 12, paddingBottom: 12, gap: 6, borderTopWidth: 1, borderTopColor: adTokens.border, paddingTop: 10 },
  fieldLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  fieldLabel: { fontSize: 12.5, color: adTokens.textSecondary },
  fieldValue: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'right' },
  ingredients: { gap: 3, marginTop: 4 },
  ingredient: { fontSize: 12.5, color: adTokens.textPrimary },

  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
});
