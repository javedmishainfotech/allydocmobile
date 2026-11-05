import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { getTreatmentPlanDetails, saveTranscriptData } from '../../services/treatmentPlanService';
import { getPharmacyById, selectMedication } from '../../services/doseSpotClinicalService';
import { getAppointmentDetails as getAppointmentActionMeta } from '../../services/pendingRequestDetailsService';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import { usePatients } from '../../hooks/usePatients';
import { openExternalLink } from '../../utils/openExternalLink';
import { createChatRoom } from '../../services/chatService';
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
  normalizeDoseSpotStatusKey,
  normalizePrescriptionRow,
  parseCompoundIngredients,
} from '../../utils/treatmentPlanFields';
import StatusBadge, { statusAccentColor } from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import ConsultQuestionnaireItem from '../../components/ConsultQuestionnaireItem';
import ConfirmationModal from '../../components/ConfirmationModal';
import RescheduleModal from '../../components/appointments/RescheduleModal';
import PrescriptionDetailModal from '../../components/treatmentPlan/PrescriptionDetailModal';
import CallRecordingPlayerModal from '../../components/treatmentPlan/CallRecordingPlayerModal';
import PrescriptionActionModal from '../../components/treatmentPlan/PrescriptionActionModal';
import { getPrescriptionById, cancelPrescription, deletePrescriptions } from '../../services/prescriptionService';
import { CANCELABLE_PRESCRIPTION_STATUSES, CANCELABLE_MEDICATION_STATUSES } from '../../utils/dispenseUnits';
import { toast } from '../../utils/toast';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

const DETAIL_TABS = [
  { key: 'consultation', label: 'Consultation Details', icon: 'file-document-outline' },
  { key: 'questionnaire', label: 'Questionnaire', icon: 'format-list-checks' },
  { key: 'soap', label: 'SOAP Notes', icon: 'note-text-outline' },
  { key: 'prescription', label: 'Prescription', icon: 'medical-bag' },
  { key: 'notes', label: 'Appointment Notes', icon: 'message-text-outline' },
];

const SOAP_FIELDS = [
  { label: 'Subjective', key: 'subjective' },
  { label: 'Objective', key: 'objective' },
  { label: 'Assessment', key: 'assessment' },
  { label: 'Plan', key: 'plan' },
];

// Read-only display only - a tone per field so the four sections scan at a glance.
const SOAP_TONES = { subjective: 'info', objective: 'primary', assessment: 'warning', plan: 'success' };

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

function Avatar({ name, imageUrl, size = 64, ringColor }) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const ring = ringColor
    ? { borderWidth: 3, borderColor: ringColor, padding: 2, borderRadius: size / 2 + 3 }
    : null;
  const content =
    imageUrl && !failed ? (
      <Image source={{ uri: imageUrl }} style={shape} onError={() => setFailed(true)} />
    ) : (
      <View style={[shape, styles.avatarFallback]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{getInitials(name)}</Text>
      </View>
    );
  return ring ? <View style={ring}>{content}</View> : content;
}

function Pill({ tone = 'neutral', children }) {
  const { bg, color } = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

function Card({ title, subtitle, icon, accent, children }) {
  return (
    <View style={[styles.card, accent && { borderLeftWidth: 4, borderLeftColor: accent }]}>
      {title ? (
        <View style={styles.cardHeaderRow}>
          {icon ? (
            <View style={[styles.cardHeaderIcon, accent && { backgroundColor: `${accent}1F` }]}>
              <MaterialCommunityIcons name={icon} size={16} color={accent || adTokens.primaryDark} />
            </View>
          ) : null}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
          </View>
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

function PrescriptionCard({ rx, drugNames, pharmacies, actions }) {
  const label = getMedicationLabel(rx, drugNames);
  const status = rx.Status ?? rx.status;
  const rxToneColor = (TONES[getPrescriptionStatusTone(status)] || TONES.neutral).color;
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
    <View style={[styles.rx, { borderLeftWidth: 3, borderLeftColor: rxToneColor }]}>
      <View style={styles.rxHeader}>
        <View style={[styles.rxIcon, { backgroundColor: `${rxToneColor}1F` }]}>
          <MaterialCommunityIcons name="pill" size={20} color={rxToneColor} />
        </View>
        <View style={styles.rxBody}>
          <Text style={styles.rxName}>{label ?? 'Loading…'}</Text>
          <View style={styles.rxPills}>
            <Pill tone={getPrescriptionStatusTone(status)}>{cancellationLabel || status || 'Unknown'}</Pill>
            {renewalLabel ? <Pill tone={renewalLabel === 'Renewal Approved' ? 'success' : 'info'}>{renewalLabel}</Pill> : null}
          </View>
        </View>
      </View>

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
      {actions && (actions.canView || actions.canDelete || actions.canCancel) ? (
        <View style={styles.rxActions}>
          {actions.canView ? (
            <Pressable style={styles.rxActionButton} onPress={actions.onView}>
              <Feather name="eye" size={14} color={adTokens.primaryDark} />
              <Text style={styles.rxActionText}>View</Text>
            </Pressable>
          ) : null}
          {actions.canDelete ? (
            <Pressable style={[styles.rxActionButton, styles.rxActionDanger]} onPress={actions.onDelete}>
              <Feather name="trash-2" size={14} color={adTokens.danger} />
              <Text style={[styles.rxActionText, { color: adTokens.danger }]}>Delete</Text>
            </Pressable>
          ) : null}
          {actions.canCancel ? (
            <Pressable style={[styles.rxActionButton, styles.rxActionDanger]} onPress={actions.onCancel}>
              <Feather name="slash" size={14} color={adTokens.danger} />
              <Text style={[styles.rxActionText, { color: adTokens.danger }]}>Cancel</Text>
            </Pressable>
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
 * Patient view: the doctor's profile, date/time and status, the doctor's remarks, the patient's own
 * feedback, the read-only SOAP notes, the questionnaire answers, and "Your prescriptions" (only
 * sent / requested ones; drug names via `SelectMedication`, pharmacies via `GetPharmacyById`).
 *
 * Staff view (doctor / doctor sub / nurse; doctor admin gets the same but read-only): also fetches
 * the staff-only `AppointmentDetailsVM` (`GET /AppointmentDetails`, same call the appointment-list
 * detail sheet uses) for its visibility flags, and adds: Mark as Complete / Cancel, Notes, Chat
 * (opens the shared chat room), editable SOAP (`POST /SaveTranscriptData`, gated on
 * `allowedEditTranscript` and not doctor admin / nurse), every status's prescriptions (unfiltered),
 * and Reschedule (`PUT /UpdateAppointment`, gated the same as web: not patient/nurse, and not a
 * freelancer doctor or a clinic doctor admin, even when the backend flag is on). Not yet built:
 * audio / video calls, and prescribing itself (adding / cancelling a prescription - that belongs to
 * the Patients prescription flows module).
 */
export default function TreatmentPlanDetailPage() {
  const dockInset = useDockInset();
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = useAuth();
  const { getPatientPharmacies } = usePatients();
  const {
    markAppointmentComplete,
    cancelAppointment,
    getAppointmentRecordingLink,
    getAppointmentNotes,
    saveAppointmentNotes,
  } = useManageAppointments();
  const appointmentId = route.params?.appointmentId;
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const isPatient = roleName === 'patient';
  const isNurse = roleName === 'nurse';
  const isDoctorAdmin = roleName === 'doctor admin';
  const userType = String(profile?.userType || '').toLowerCase().trim();
  // Web: showRescheduleButton excludes a freelancer "doctor" and a clinic "doctor admin" even when
  // the backend flag is on - only doctor-sub / clinic doctor / hospital roles see this button.
  const canSeeReschedule =
    !isPatient &&
    !isNurse &&
    !((roleName === 'doctor admin' && userType === 'clinic') || (roleName === 'doctor' && userType === 'freelancer'));
  // Prescribing (the "core flow" - see docs/PROGRESS.md) is doctor / doctor-sub only, same as who can
  // edit SOAP notes - doctor admin and nurse are read-only for clinical actions on this screen.
  const canPrescribe = !isPatient && !isDoctorAdmin && !isNurse;

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [drugNames, setDrugNames] = useState({});
  const [pharmacies, setPharmacies] = useState({});
  const fetchedDrugs = useRef(new Set());
  const fetchedPharmacies = useRef(new Set());

  // Staff-only: the AppointmentDetailsVM carries the action-visibility flags (isMarkAsCompleteVisible,
  // isCancelVisible, isMessageVisible, ...) - a separate call from the TreatmentPlanVM (`detail`)
  // above, same as the web.
  const [actionMeta, setActionMeta] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // 'completed' | 'cancelled' | null
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [soapDraft, setSoapDraft] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [isSavingSoap, setIsSavingSoap] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rxDetail, setRxDetail] = useState({ open: false, loading: false, data: null, pharmacy: null, pharmacyLoading: false });
  const [rxAction, setRxAction] = useState({ open: false, mode: 'delete', rx: null, comment: '', submitting: false });
  const [locallyCancelled, setLocallyCancelled] = useState(() => new Set());
  // Web's tp-detail-tabs (staff only): consultation | questionnaire | soap | prescription | notes.
  const [activeTab, setActiveTab] = useState('consultation');
  const [recordingLink, setRecordingLink] = useState(null);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [recordingPlayerOpen, setRecordingPlayerOpen] = useState(false);
  const [defaultPharmacy, setDefaultPharmacy] = useState(null);
  const [patientPharmacies, setPatientPharmacies] = useState([]);
  const [showPreferred, setShowPreferred] = useState(false);
  const [showDefaultPharmacy, setShowDefaultPharmacy] = useState(true);
  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const noteLoaded = useRef(false);

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

  // Refresh the prescriptions list on return from the Add Prescription screen.
  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce.current) load();
      hasLoadedOnce.current = true;
    }, [load]),
  );

  useEffect(() => {
    if (isPatient || appointmentId == null) return;
    getAppointmentActionMeta(appointmentId).then((result) => {
      if (result.success) setActionMeta(result.data);
    });
  }, [isPatient, appointmentId]);

  const loadRecording = useCallback(
    async (forceSync = false) => {
      setIsRecordingLoading(true);
      try {
        const data = await getAppointmentRecordingLink(appointmentId, forceSync);
        setRecordingLink(data?.link || null);
      } catch {
        // keep whatever was already shown on failure, same as before
      } finally {
        setIsRecordingLoading(false);
      }
    },
    [appointmentId, getAppointmentRecordingLink],
  );

  useEffect(() => {
    if (isPatient || appointmentId == null) return;
    loadRecording(false);
  }, [isPatient, appointmentId, loadRecording]);

  const doseSpotPatientId = actionMeta?.doseSpotId;
  const [pharmacyReload, setPharmacyReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setPharmacyReload((n) => n + 1);
    }, []),
  );
  useEffect(() => {
    if (isPatient || !doseSpotPatientId) return;
    setIsPharmacyLoading(true);
    getPatientPharmacies(doseSpotPatientId)
      .then((data) => {
        const items = Array.isArray(data?.Items) ? data.Items : Array.isArray(data) ? data : [];
        setPatientPharmacies(items);
        setDefaultPharmacy(items.find((p) => p.isDefault || p.IsDefault === true) || null);
      })
      .catch(() => {
        setPatientPharmacies([]);
        setDefaultPharmacy(null);
      })
      .finally(() => setIsPharmacyLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient, doseSpotPatientId, pharmacyReload]);

  // Notes load the first time the tab opens (web: activeDetailTab === "notes" && !noteLoaded).
  useEffect(() => {
    if (activeTab !== 'notes' || isPatient || noteLoaded.current) return;
    noteLoaded.current = true;
    setNoteLoading(true);
    getAppointmentNotes(appointmentId)
      .then((data) => setNoteText(data?.notes || ''))
      .catch(() => {})
      .finally(() => setNoteLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isPatient, appointmentId]);

  const saveNote = async () => {
    if (!noteText) return;
    setNoteSaving(true);
    try {
      const result = await saveAppointmentNotes(appointmentId, profile?.userId, noteText);
      toast.success(result.message || 'Note saved.');
    } catch (message) {
      toast.error(message || 'Unable to save the note.');
    } finally {
      setNoteSaving(false);
    }
  };

  // Keeps the SOAP editor in sync with the server's own values on every (re)load - including right
  // after a save, so the editor reflects what was actually stored.
  useEffect(() => {
    if (!detail) return;
    setSoapDraft({
      subjective: detail.subjective || '',
      objective: detail.objective || '',
      assessment: detail.assessment || '',
      plan: detail.plan || '',
    });
  }, [detail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleMarkComplete = async () => {
    setIsConfirmSubmitting(true);
    try {
      const result = await markAppointmentComplete(appointmentId, completeRemarks || undefined);
      setConfirmType(null);
      setCompleteRemarks('');
      toast.success(result.message || 'Appointment marked as complete.');
      load();
    } catch (message) {
      toast.error(message || 'Unable to mark this appointment complete.');
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsConfirmSubmitting(true);
    try {
      const result = await cancelAppointment(appointmentId, cancelReason);
      setConfirmType(null);
      setCancelReason('');
      toast.success(result.message || 'Appointment cancelled.');
      load();
    } catch (message) {
      toast.error(message || 'Unable to cancel this appointment.');
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleRescheduled = () => {
    setIsRescheduleOpen(false);
    load();
    getAppointmentActionMeta(appointmentId).then((result) => {
      if (result.success) setActionMeta(result.data);
    });
  };

  // Web: handleMessageClick -> CreateChatRoom. Opens (creating if needed) this appointment's chat
  // room with the patient, then shows it in the chat screen.
  const openChat = async () => {
    if (!actionMeta || isChatLoading) return;
    const senderId = parseInt(profile?.userId, 10);
    setIsChatLoading(true);
    const result = await createChatRoom({ appointmentId, senderId, recieverId: actionMeta.userId });
    setIsChatLoading(false);
    const chatRoomId = result.raw?.senderChatRoomId;
    if (!result.success || !chatRoomId) {
      toast.error(result.message || 'Unable to open the chat.');
      return;
    }
    navigation.navigate('ChatWindow', {
      chat: {
        chatRoomId,
        appointmentId,
        senderId,
        receiverId: actionMeta.userId,
        lastMessage: '',
        recieverName: actionMeta.patientName,
        profileImage: actionMeta.patientImage,
      },
    });
  };

  // Same early-join rule as the appointment-list detail sheet: calls/chat unlock 5 minutes before start.
  const isRealtimeDisabled = useMemo(() => {
    const raw = detail?.appointmentStartUtc;
    const startMs = raw ? new Date(raw).getTime() : NaN;
    if (Number.isNaN(startMs)) return false;
    return Date.now() < startMs - 5 * 60 * 1000;
  }, [detail?.appointmentStartUtc]);

  // Web: allowedEditTranscript, AND not a doctor admin / nurse (view-only for them).
  const canEditSoap = Boolean(detail?.allowedEditTranscript) && !isDoctorAdmin && !isNurse;

  const rxId = (rx) => rx?.PrescriptionId ?? rx?.prescriptionId ?? rx?.doseSpotPrescriptionId ?? null;

  const openRxDetail = async (rx) => {
    const id = rxId(rx);
    if (!id || !doseSpotPatientId) return;
    setRxDetail({ open: true, loading: true, data: null, pharmacy: null, pharmacyLoading: false });
    const result = await getPrescriptionById(doseSpotPatientId, id);
    const data = result.success ? result.data?.Prescription || result.data || null : null;
    setRxDetail((prev) => ({ ...prev, loading: false, data }));
    const pharmacyId = data?.PharmacyId ?? rx?.PharmacyId;
    if (pharmacyId) {
      setRxDetail((prev) => ({ ...prev, pharmacyLoading: true }));
      const pharmacyResult = await getPharmacyById(String(pharmacyId).trim());
      const pharmacy = pharmacyResult.success ? pharmacyResult.data?.Item || pharmacyResult.data?.item || pharmacyResult.data || null : null;
      setRxDetail((prev) => ({ ...prev, pharmacy, pharmacyLoading: false }));
    }
  };

  const canCancelRx = (rx) => {
    const id = rxId(rx);
    if (id && locallyCancelled.has(String(id))) return false;
    return (
      CANCELABLE_PRESCRIPTION_STATUSES.has(normalizeDoseSpotStatusKey(rx?.Status ?? rx?.status)) &&
      CANCELABLE_MEDICATION_STATUSES.has(normalizeDoseSpotStatusKey(rx?.MedicationStatus ?? rx?.medicationStatus))
    );
  };

  const canDeleteRx = (rx) => {
    const status = String(rx?.Status ?? rx?.status ?? '').toLowerCase();
    return status === 'entered' || status === 'edited';
  };

  const confirmRxAction = async () => {
    const id = rxId(rxAction.rx);
    if (!id || !doseSpotPatientId) return;
    setRxAction((prev) => ({ ...prev, submitting: true }));
    const result =
      rxAction.mode === 'cancel'
        ? await cancelPrescription(doseSpotPatientId, id, rxAction.comment.trim(), appointmentId)
        : await deletePrescriptions(doseSpotPatientId, [id], appointmentId);
    if (!result.success || result.raw?.data?.Result?.ResultCode === 'ERROR') {
      setRxAction((prev) => ({ ...prev, submitting: false }));
      toast.error(result.message || result.raw?.data?.Result?.ResultDescription || 'Unable to complete this action.');
      return;
    }
    if (rxAction.mode === 'cancel') setLocallyCancelled((prev) => new Set(prev).add(String(id)));
    toast.success(result.message || (rxAction.mode === 'cancel' ? 'Cancellation request submitted.' : 'Prescription deleted.'));
    setRxAction({ open: false, mode: 'delete', rx: null, comment: '', submitting: false });
    load();
  };

  const saveSoap = async (isSubmitted) => {
    setIsSavingSoap(true);
    const result = await saveTranscriptData({ appointmentId, ...soapDraft, isSubmitted, isCompleted: false });
    setIsSavingSoap(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to save the SOAP notes.');
      return;
    }
    toast.success(isSubmitted ? 'SOAP notes submitted.' : 'Saved as draft.');
    load();
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

  // Web (DoctorTreatmentDetail.jsx): the "Add/Continue a prescription" CTA only shows for an
  // InProgress appointment - not Scheduled, Completed, or Cancelled. "Continue" (and skipping
  // straight to the medication-search step) instead of "Add" is shown when this appointment
  // already has an Entered/Edited prescription in flight.
  const isInProgressAppointment = normalizeDoseSpotStatusKey(detail?.appointmentStatus) === 'inprogress';
  const inProgressPrescription = useMemo(
    () => prescriptions.find((rx) => ['entered', 'edited'].includes(normalizeDoseSpotStatusKey(rx.Status ?? rx.status))),
    [prescriptions],
  );
  const canContinuePrescription = Boolean(inProgressPrescription);

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
  const symptomText = String(detail.symtom || actionMeta?.appointmentReason || '').trim();
  const ageText = String(detail.age || detail.patientAge || actionMeta?.patientAge || '').trim();
  const soapEmpty = SOAP_FIELDS.every(({ key }) => !String(detail[key] ?? '').trim());

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.card, styles.profileCard]}>
        <View style={styles.profileCenter}>
          <Avatar name={counterpartName} imageUrl={imageUrl} size={76} ringColor={statusAccentColor(detail.appointmentStatus)} />
          <Text style={styles.profileLabel}>{isPatient ? 'Doctor' : 'Patient'}</Text>
          <Text style={styles.profileName}>{counterpartName || '—'}</Text>
          {email ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="email-outline" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>{email}</Text>
            </View>
          ) : null}
          {!isPatient && symptomText ? (
            <View style={styles.symptomPill}>
              <MaterialCommunityIcons name="pulse" size={13} color="#4F46E5" />
              <Text style={styles.symptomText}>{symptomText}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoList}>
          {!isPatient ? (
            <>
              <FieldLine label="Age" value={ageText || '—'} />
              {detail.patientGender ? <FieldLine label="Gender" value={detail.patientGender} /> : null}
              {detail.patientPhone ? <FieldLine label="Phone" value={detail.patientPhone} /> : null}
            </>
          ) : null}
          {dateText ? <FieldLine label="Date" value={dateText} /> : null}
          {timeText ? <FieldLine label="Time" value={timeText} /> : null}
        </View>

        <View style={styles.statusRow}>
          <StatusBadge status={detail.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(detail)} />
        </View>
      </View>

      {!isPatient && doseSpotPatientId ? (
        <Card>
          <Pressable style={styles.pharmacyCollapseHeader} onPress={() => setShowDefaultPharmacy((value) => !value)}>
            <MaterialCommunityIcons name="pill" size={16} color={adTokens.primaryDark} />
            <Text style={styles.pharmacyCollapseTitle}>Pharmacy</Text>
            <Feather name={showDefaultPharmacy ? 'chevron-up' : 'chevron-down'} size={18} color={adTokens.textSecondary} />
          </Pressable>

          {showDefaultPharmacy ? (
            <>
              <LinearGradient
                colors={['#0B1E4D', '#1E3A8A', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pharmacyDefaultBox}
              >
                {isPharmacyLoading ? (
                  <View style={styles.pharmacyDefaultLoadingRow}>
                    <ActivityIndicator size="small" color={adTokens.white} />
                    <Text style={styles.pharmacyDefaultLoadingText}>Loading default pharmacy...</Text>
                  </View>
                ) : defaultPharmacy ? (
                  <>
                    <View style={styles.pharmacyDefaultHeader}>
                      <MaterialCommunityIcons name="pill" size={13} color={adTokens.white} />
                      <Text style={styles.pharmacyDefaultLabel}>DEFAULT PHARMACY</Text>
                    </View>
                    <Text style={styles.pharmacyDefaultName}>{defaultPharmacy.StoreName || defaultPharmacy.storeName}</Text>
                    {defaultPharmacy.Address1 || defaultPharmacy.address1 ? (
                      <Text style={styles.pharmacyDefaultMeta}>{defaultPharmacy.Address1 || defaultPharmacy.address1}</Text>
                    ) : null}
                    {defaultPharmacy.PrimaryPhone || defaultPharmacy.primaryPhone ? (
                      <Text style={styles.pharmacyDefaultMeta}>{defaultPharmacy.PrimaryPhone || defaultPharmacy.primaryPhone}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.pharmacyDefaultEmpty}>No default pharmacy set for this patient.</Text>
                )}
              </LinearGradient>

              {!isPharmacyLoading ? (
                <View style={styles.pharmacyActionsRow}>
                  {!isDoctorAdmin ? (
                    <Pressable
                      style={styles.pharmacyManageButton}
                      onPress={() => navigation.navigate('ManagePharmacies', { doseSpotPatientId, patientName: counterpartName, email })}
                    >
                      <Feather name="settings" size={13} color={adTokens.primaryDark} />
                      <Text style={styles.pharmacyManageButtonText}>Manage Pharmacy</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.pharmacyToggle, showPreferred && styles.pharmacyToggleActive]}
                    onPress={() => setShowPreferred((value) => !value)}
                  >
                    <MaterialCommunityIcons name="star" size={14} color={showPreferred ? adTokens.white : adTokens.primaryDark} />
                    <Text style={[styles.pharmacyToggleText, showPreferred && styles.pharmacyToggleTextActive]}>
                      Preferred Pharmacy{patientPharmacies.length > 0 ? ` (${patientPharmacies.length})` : ''}
                    </Text>
                    <Feather name={showPreferred ? 'chevron-up' : 'chevron-down'} size={14} color={showPreferred ? adTokens.white : adTokens.primaryDark} />
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {showDefaultPharmacy && showPreferred ? (
            <View style={styles.preferredList}>
              {patientPharmacies.length === 0 ? (
                <Text style={styles.emptyText}>No preferred pharmacies saved.</Text>
              ) : (
                patientPharmacies.map((pharmacy, index) => {
                  const isDefaultRow = Boolean(pharmacy.IsDefault || pharmacy.isDefault);
                  const addressLine = [pharmacy.Address1, pharmacy.City, pharmacy.State, pharmacy.ZipCode].filter(Boolean).join(', ');
                  const phone = pharmacy.PrimaryPhone || pharmacy.primaryPhone;
                  const fax = pharmacy.PrimaryFax || pharmacy.primaryFax;
                  return (
                    <View
                      key={String(pharmacy.PharmacyId ?? pharmacy.pharmacyId ?? index)}
                      style={[styles.preferredRow, isDefaultRow && styles.preferredRowDefault]}
                    >
                      <MaterialCommunityIcons
                        name={isDefaultRow ? 'check-decagram' : 'map-marker-outline'}
                        size={18}
                        color={isDefaultRow ? adTokens.primaryDark : adTokens.textMuted}
                        style={styles.preferredIcon}
                      />
                      <View style={styles.flex1}>
                        <View style={styles.preferredNameRow}>
                          <Text style={styles.preferredName}>{pharmacy.StoreName || pharmacy.storeName}</Text>
                          {isDefaultRow ? (
                            <View style={styles.preferredDefaultBadge}>
                              <Text style={styles.preferredDefaultBadgeText}>DEFAULT</Text>
                            </View>
                          ) : null}
                        </View>
                        {addressLine ? (
                          <View style={styles.preferredDetailRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={13} color={adTokens.textMuted} />
                            <Text style={styles.preferredMeta}>{addressLine}</Text>
                          </View>
                        ) : null}
                        {phone ? (
                          <View style={styles.preferredDetailRow}>
                            <MaterialCommunityIcons name="phone-outline" size={13} color={adTokens.textMuted} />
                            <Text style={styles.preferredMeta}>{phone}</Text>
                          </View>
                        ) : null}
                        {fax ? (
                          <View style={styles.preferredDetailRow}>
                            <MaterialCommunityIcons name="fax" size={13} color={adTokens.textMuted} />
                            <Text style={styles.preferredMeta}>{fax}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </Card>
      ) : null}

      {isPatient && remarks ? (
        <Card title="Doctor's Remarks" icon="comment-text-outline" accent={adTokens.primary}>
          <Text style={styles.bodyText}>{remarks}</Text>
        </Card>
      ) : null}

      {isPatient && hasFeedback ? (
        <Card
          title={`Patient Feedback${detail.feedbackRating ? ` (${detail.feedbackRating}/5)` : ''}`}
          icon="star"
          accent={adTokens.successDark}
        >
          <Text style={styles.bodyText}>{detail.feedbackComment || 'No comment left.'}</Text>
        </Card>
      ) : null}

      {!isPatient && actionMeta ? (
        <>
          {actionMeta.isMarkAsCompleteVisible || actionMeta.isCancelVisible ? (
            <View style={styles.actionsRow}>
              {actionMeta.isMarkAsCompleteVisible ? (
                <Pressable style={styles.successButton} onPress={() => setConfirmType('completed')}>
                  <Feather name="check" size={14} color={adTokens.white} />
                  <Text style={styles.actionButtonText}>Mark as Complete</Text>
                </Pressable>
              ) : null}
              {actionMeta.isCancelVisible ? (
                <Pressable style={styles.dangerButton} onPress={() => setConfirmType('cancelled')}>
                  <Feather name="x" size={14} color={adTokens.white} />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </Pressable>
              ) : null}
              {actionMeta.isRescheduleVisible && canSeeReschedule ? (
                <Pressable style={styles.secondaryButton} onPress={() => setIsRescheduleOpen(true)}>
                  <MaterialCommunityIcons name="calendar-sync-outline" size={14} color={adTokens.primaryDark} />
                  <Text style={styles.secondaryButtonText}>Reschedule</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

        </>
      ) : null}

      {!isPatient ? (
        <SegmentedTabs tabs={DETAIL_TABS} activeKey={activeTab} onChange={setActiveTab} scrollable style={styles.tabBar} />
      ) : null}

      {!isPatient && activeTab === 'consultation' ? (
        <>
          <Card title="Appointment Information">
            {actionMeta?.isMessageVisible || actionMeta?.isAudioVisible || actionMeta?.isVideoVisible ? (
            <View style={styles.commGrid}>
              {actionMeta?.isMessageVisible ? (
                <Pressable
                  style={[styles.commButton, isRealtimeDisabled && styles.commButtonDisabled]}
                  disabled={isRealtimeDisabled || isChatLoading}
                  onPress={openChat}
                >
                  {isChatLoading ? (
                    <ActivityIndicator size="small" color={adTokens.primary} />
                  ) : (
                    <MaterialCommunityIcons name="message-text-outline" size={18} color={adTokens.textPrimary} />
                  )}
                  <Text style={styles.commButtonText}>Chat</Text>
                </Pressable>
              ) : null}
              {!isNurse && actionMeta?.isAudioVisible ? (
                <Pressable
                  style={[styles.commButton, isRealtimeDisabled && styles.commButtonDisabled]}
                  disabled={isRealtimeDisabled}
                  onPress={() => navigation.navigate('VideoCall', { appointmentId, isAudio: true, counterpartName })}
                >
                  <MaterialCommunityIcons name="phone-outline" size={18} color={adTokens.textPrimary} />
                  <Text style={styles.commButtonText}>Call</Text>
                </Pressable>
              ) : null}
              {!isNurse && actionMeta?.isVideoVisible ? (
                <Pressable
                  style={[styles.commButton, isRealtimeDisabled && styles.commButtonDisabled]}
                  disabled={isRealtimeDisabled}
                  onPress={() => navigation.navigate('VideoCall', { appointmentId, isAudio: false, counterpartName })}
                >
                  <MaterialCommunityIcons name="video-outline" size={18} color={adTokens.textPrimary} />
                  <Text style={styles.commButtonText}>Video</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
            <FieldLine label="Date & Time" value={`${dateText} ${timeText}`.trim() || '—'} />
            {actionMeta?.reference ? <FieldLine label="Appointment ID" value={actionMeta.reference} /> : null}
            <View style={styles.fieldLine}>
              <Text style={styles.fieldLabel}>Status</Text>
              <StatusBadge status={detail.appointmentStatus ?? actionMeta?.appointmentStatus} />
            </View>
            {symptomText ? <FieldLine label="Condition" value={symptomText} /> : null}
          </Card>

          <Card title="Call Recording">
            <Pressable
              style={[styles.secondaryButton, styles.checkNowButton, isRecordingLoading && styles.buttonDisabled]}
              disabled={isRecordingLoading}
              onPress={() => loadRecording(true)}
            >
              {isRecordingLoading ? (
                <ActivityIndicator size="small" color={adTokens.primary} />
              ) : (
                <Feather name="refresh-cw" size={13} color={adTokens.primaryDark} />
              )}
              <Text style={styles.secondaryButtonText}>{isRecordingLoading ? 'Checking...' : 'Check now'}</Text>
            </Pressable>
            {recordingLink ? (
              <Pressable style={styles.successButton} onPress={() => setRecordingPlayerOpen(true)}>
                <Feather name="play" size={14} color={adTokens.white} />
                <Text style={styles.actionButtonText}>Play recording</Text>
              </Pressable>
            ) : (
              <Text style={styles.emptyText}>
                {isRecordingLoading
                  ? 'Checking Daily.co for your recording - this can take up to a minute...'
                  : 'No call recording available for this appointment yet. It can take a few minutes after the call ends - use "Check now" to look again right away.'}
              </Text>
            )}
          </Card>

          <Card title="Video Call Transcript">
            {detail.callTranscript ? (
              <Text style={styles.bodyText}>{detail.callTranscript}</Text>
            ) : (
              <Text style={styles.emptyText}>No call transcript available for this appointment yet.</Text>
            )}
          </Card>
        </>
      ) : null}

      {isPatient || activeTab === 'soap' ? (
      <Card title="SOAP Notes">
        {canEditSoap ? (
          <>
            {SOAP_FIELDS.map(({ label, key }) => (
              <View key={key} style={styles.soapBlock}>
                <Text style={styles.soapLabel}>{label}</Text>
                <TextInput
                  style={styles.soapInput}
                  value={soapDraft[key]}
                  onChangeText={(text) => setSoapDraft((prev) => ({ ...prev, [key]: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  placeholderTextColor={adTokens.textMuted}
                />
              </View>
            ))}
            <View style={styles.soapButtonRow}>
              <Pressable
                style={[styles.secondaryButton, isSavingSoap && styles.buttonDisabled]}
                disabled={isSavingSoap}
                onPress={() => saveSoap(false)}
              >
                <Text style={styles.secondaryButtonText}>Save as Draft</Text>
              </Pressable>
              <Pressable
                style={[styles.successButton, isSavingSoap && styles.buttonDisabled]}
                disabled={isSavingSoap}
                onPress={() => saveSoap(true)}
              >
                {isSavingSoap ? (
                  <ActivityIndicator size="small" color={adTokens.white} />
                ) : (
                  <Text style={styles.actionButtonText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : soapEmpty ? (
          <View style={styles.soapEmptyState}>
            <MaterialCommunityIcons name="note-text-outline" size={26} color={adTokens.textMuted} />
            <Text style={styles.emptyText}>
              {isPatient
                ? 'No SOAP notes have been submitted for you yet.'
                : 'No SOAP notes have been submitted for this appointment yet.'}
            </Text>
          </View>
        ) : (
          SOAP_FIELDS.map(({ label, key }) => {
            const tone = TONES[SOAP_TONES[key]] || TONES.neutral;
            return (
              <View key={key} style={[styles.soapBlockReadOnly, { borderLeftColor: tone.color }]}>
                <Pill tone={SOAP_TONES[key]}>{label}</Pill>
                <Text style={styles.bodyText}>{String(detail[key] ?? '').trim() || '—'}</Text>
              </View>
            );
          })
        )}
      </Card>
      ) : null}

      {(isPatient ? questionnaire.length > 0 : activeTab === 'questionnaire') ? (
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
          {questionnaire.length === 0 ? (
            <Text style={styles.emptyText}>No questionnaire responses recorded for this appointment.</Text>
          ) : null}
        </Card>
      ) : null}

      {isPatient || activeTab === 'prescription' ? (
      <Card
        title={isPatient ? 'Your prescriptions' : 'Prescriptions'}
        subtitle={isPatient ? 'View your prescriptions for this visit' : undefined}
      >
        {canPrescribe && actionMeta?.doseSpotId && isInProgressAppointment ? (
          <Pressable
            style={styles.addPrescriptionButton}
            onPress={() =>
              navigation.navigate('AddPrescription', {
                appointmentId,
                doseSpotPatientId: actionMeta?.doseSpotId,
                patientId: actionMeta?.userId,
                patientName: counterpartName,
                ...(canContinuePrescription
                  ? { initialStepIndex: 1, initialPharmacyId: inProgressPrescription?.PharmacyId ?? null }
                  : null),
              })
            }
          >
            <Feather name={canContinuePrescription ? 'arrow-right' : 'plus'} size={14} color={adTokens.primaryDark} />
            <Text style={styles.addPrescriptionButtonText}>
              {canContinuePrescription ? 'Continue Prescription' : 'Add Prescription'}
            </Text>
          </Pressable>
        ) : null}
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
                actions={
                  isPatient
                    ? null
                    : {
                        canView: Boolean(rxId(rx)) && Boolean(doseSpotPatientId),
                        canDelete: canPrescribe && canDeleteRx(rx),
                        canCancel: canPrescribe && canCancelRx(rx),
                        onView: () => openRxDetail(rx),
                        onDelete: () => setRxAction({ open: true, mode: 'delete', rx, comment: '', submitting: false }),
                        onCancel: () => setRxAction({ open: true, mode: 'cancel', rx, comment: '', submitting: false }),
                      }
                }
              />
            ))}
          </View>
        )}
      </Card>
      ) : null}

      {!isPatient && activeTab === 'notes' ? (
        <Card title="Appointment Notes">
          {noteLoading ? (
            <ActivityIndicator color={adTokens.primary} />
          ) : (
            <>
              <TextInput
                style={[styles.soapInput, styles.noteInput]}
                value={noteText}
                onChangeText={setNoteText}
                editable={Boolean(actionMeta?.isNoteEditVisible)}
                multiline
                textAlignVertical="top"
                placeholder="Add a private note about this appointment..."
                placeholderTextColor={adTokens.textMuted}
              />
              <Text style={styles.noteHint}>Private note for this appointment - only you can see this.</Text>
              {actionMeta?.isNoteEditVisible ? (
                <Pressable
                  style={[styles.successButton, styles.noteSave, (!noteText || noteSaving) && styles.buttonDisabled]}
                  disabled={!noteText || noteSaving}
                  onPress={saveNote}
                >
                  {noteSaving ? <ActivityIndicator size="small" color={adTokens.white} /> : <Text style={styles.actionButtonText}>Save</Text>}
                </Pressable>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {!isPatient ? (
        <>
          <ConfirmationModal
            visible={confirmType != null}
            type={confirmType}
            cancelReason={cancelReason}
            onChangeCancelReason={setCancelReason}
            remarks={completeRemarks}
            onChangeRemarks={setCompleteRemarks}
            isSubmitting={isConfirmSubmitting}
            onClose={() => setConfirmType(null)}
            onConfirm={confirmType === 'cancelled' ? handleCancel : handleMarkComplete}
          />
          <PrescriptionDetailModal
            visible={rxDetail.open}
            loading={rxDetail.loading}
            data={rxDetail.data}
            pharmacy={rxDetail.pharmacy}
            pharmacyLoading={rxDetail.pharmacyLoading}
            drugNames={drugNames}
            onClose={() => setRxDetail({ open: false, loading: false, data: null, pharmacy: null, pharmacyLoading: false })}
          />
          <PrescriptionActionModal
            visible={rxAction.open}
            name={rxAction.rx ? getMedicationLabel(rxAction.rx, drugNames) : ''}
            mode={rxAction.mode}
            comment={rxAction.comment}
            onChangeComment={(comment) => setRxAction((prev) => ({ ...prev, comment }))}
            submitting={rxAction.submitting}
            onConfirm={confirmRxAction}
            onClose={() => setRxAction((prev) => ({ ...prev, open: false }))}
          />
          <RescheduleModal
            visible={isRescheduleOpen}
            appointmentId={appointmentId}
            patientId={actionMeta?.patitentId ?? actionMeta?.patientId}
            initialDate={
              (() => {
                const source = detail?.appointmentDate ?? actionMeta?.appointmentDate;
                const date = source ? new Date(source) : null;
                return date && !Number.isNaN(date.getTime()) ? date : null;
              })()
            }
            onClose={() => setIsRescheduleOpen(false)}
            onRescheduled={handleRescheduled}
          />
          <CallRecordingPlayerModal
            visible={recordingPlayerOpen}
            url={recordingLink}
            onClose={() => setRecordingPlayerOpen(false)}
          />
        </>
      ) : null}
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  cardSubtitle: { fontSize: 12.5, color: adTokens.textSecondary },

  profileCard: {},
  profileCenter: { alignItems: 'center', gap: 6 },
  profileLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: adTokens.primary, textTransform: 'uppercase', marginTop: 8 },
  profileName: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  metaText: { flexShrink: 1, fontSize: 12.5, color: adTokens.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  avatarFallback: { backgroundColor: '#279EFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: adTokens.white },

  infoList: {
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
  },

  bodyText: { fontSize: 14, color: adTokens.textPrimary, lineHeight: 20 },
  emptyText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 10 },
  soapBlock: { gap: 3 },
  soapBlockReadOnly: { gap: 6, paddingLeft: 10, paddingVertical: 2, borderLeftWidth: 3 },
  soapEmptyState: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  soapLabel: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  soapInput: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
  },
  soapButtonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  questions: { gap: 8 },

  // ── Staff-only actions (Mark Complete / Cancel / Reschedule, Notes / Chat / Call / Video) -
  // same visual language as the shared appointment-detail sheet. ──
  buttonDisabled: { opacity: 0.6 },
  actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: adTokens.success,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adTokens.danger,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  actionButtonText: { color: adTokens.white, fontWeight: '700', fontSize: 12.5 },
  secondaryButtonText: { color: adTokens.textSecondary, fontWeight: '700', fontSize: 12.5 },

  commGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  commButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
    minWidth: 72,
  },
  commButtonDisabled: { opacity: 0.5 },
  commButtonText: { fontSize: 11, fontWeight: '600', color: adTokens.textPrimary },

  addPrescriptionButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.primary,
    backgroundColor: adTokens.primaryLight,
  },
  addPrescriptionButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  tabBar: { marginVertical: 2 },
  checkNowButton: { alignSelf: 'flex-start' },
  symptomPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, marginTop: 2 },
  symptomText: { fontSize: 12.5, fontWeight: '600', color: '#4F46E5' },
  // ── Pharmacy card (Default + Preferred unified) ──
  pharmacyDefaultBox: {
    padding: 14,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 3,
  },
  pharmacyDefaultLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pharmacyDefaultLoadingText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  pharmacyDefaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pharmacyDefaultLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)' },
  pharmacyDefaultName: { fontSize: 15, fontWeight: '800', color: adTokens.white },
  pharmacyDefaultMeta: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  pharmacyDefaultEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  pharmacyCollapseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pharmacyCollapseTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  pharmacyActionsRow: { gap: 10, marginTop: 10 },
  pharmacyManageButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  pharmacyManageButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pharmacyToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: adTokens.primary,
    backgroundColor: adTokens.white,
  },
  pharmacyToggleActive: { backgroundColor: adTokens.primary },
  pharmacyToggleText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pharmacyToggleTextActive: { color: adTokens.white },
  preferredList: { gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: adTokens.border },
  preferredRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  preferredRowDefault: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  preferredIcon: { marginTop: 2 },
  preferredNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  preferredName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  preferredDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
  preferredMeta: { flex: 1, fontSize: 12, color: adTokens.textSecondary, lineHeight: 16 },
  preferredDefaultBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.primary },
  preferredDefaultBadgeText: { fontSize: 10, fontWeight: '800', color: adTokens.white, letterSpacing: 0.4 },
  noteInput: { minHeight: 180 },
  noteHint: { fontSize: 12, fontStyle: 'italic', color: adTokens.textSecondary },
  noteSave: { alignSelf: 'flex-end' },
  rxActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, flexWrap: 'wrap' },
  rxActionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: adTokens.primary, backgroundColor: adTokens.white },
  rxActionDanger: { borderColor: adTokens.danger },
  rxActionText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },
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
