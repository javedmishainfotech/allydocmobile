import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { usePatients } from '../../hooks/usePatients';
import { getAppointmentDetails } from '../../services/pendingRequestDetailsService';
import { searchMedications, selectMedication, getPharmacyById } from '../../services/doseSpotClinicalService';
import {
  addCodedPrescription,
  editCodedPrescription,
  getPrescriptionById,
  sendPrescriptions,
  deletePrescriptions,
  getPatientPrescriptionsByStatus,
  searchSupplies,
  addSupplyPrescription,
  editSupplyPrescription,
  addSupplyFreeTextPrescription,
  editSupplyFreeTextPrescription,
  createCodedFavorite,
  addCompiledCompoundPrescription,
  editCompiledCompoundPrescription,
  createCompoundFavorite,
  setPrintedPrescriptions,
} from '../../services/prescriptionService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { localDateOnlyToApiString } from '../../utils/dateOnly';
import { DISPENSE_UNIT_NAMES } from '../../utils/dispenseUnits';
import { frequencyMultiplier, buildDirections, normalizeQuantity } from '../../utils/prescriptionOptions';
import { getItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import PharmacyPicker, { getPharmacyId, getPharmacyName } from '../../components/prescriptions/PharmacyPicker';
import OptionPicker from '../../components/prescriptions/OptionPicker';
import ProviderPinModal from '../../components/prescriptions/ProviderPinModal';
import PastDateWarningModal from '../../components/prescriptions/PastDateWarningModal';
import MedicationFormModal, { formatDateOnly, isPastDate } from '../../components/prescriptions/MedicationFormModal';
import SupplyFormModal, { emptySupplyForm, validateSupplyForm } from '../../components/prescriptions/SupplyFormModal';
import CompoundFormModal, { emptyCompoundForm, validateCompoundForm } from '../../components/prescriptions/CompoundFormModal';
import PrescriptionBenefitsModal from '../../components/prescriptions/PrescriptionBenefitsModal';
import EpcsWorkflowModal from '../../components/prescriptions/EpcsWorkflowModal';
import PrescriptionPrintPreviewModal from '../../components/prescriptions/PrescriptionPrintPreviewModal';
import { buildPrescriptionPrintHtml } from '../../utils/prescriptionPrintHtml';
import FavoritesList from '../../components/prescriptions/FavoritesList';
import EPCSAuthorizationRequiredModal from '../../components/prescriptions/EPCSAuthorizationRequiredModal';
import PrescriptionItemCard, { rxField, rxIdOf, rxNameOf, rxTypeOf } from '../../components/prescriptions/PrescriptionItemCard';
import StatusBadge from '../../components/StatusBadge';
import { adTokens, colors } from '../../theme/colors';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const STEPS = [
  { key: 'pharmacy', label: 'Select Pharmacy' },
  { key: 'drug', label: 'Add Prescription' },
  { key: 'review', label: 'Review & Save' },
];

const MIN_SEARCH_LENGTH = 3;
const LIST_STATUSES = ['Entered', 'Edited', 'ReadyToSign', 'EpcsError'];
const SENDABLE = new Set(['entered', 'edited', 'readytosign']);
const EDITABLE = new Set(['entered', 'edited', 'readytosign', 'epcserror']);
const DISPENSE_UNIT_ID_BY_NAME = Object.fromEntries(Object.entries(DISPENSE_UNIT_NAMES).map(([id, name]) => [name, Number(id)]));

const statusKey = (rx) => String(rxField(rx, 'Status', 'status') || '').toLowerCase();

const fullName = (details) =>
  [details?.firstName || details?.FirstName, details?.lastName || details?.LastName].filter(Boolean).join(' ').trim() ||
  String(details?.fullName || details?.FullName || details?.name || '').trim();

const fullAddress = (details) =>
  [
    details?.addressLine1 || details?.address || details?.Address,
    details?.addressLine2 || details?.AddressLine2,
    details?.city || details?.City,
    details?.state || details?.State,
    details?.zipcode || details?.zipCode || details?.zip || details?.Zipcode,
  ]
    .filter((part) => part != null && String(part).trim() !== '')
    .join(', ');

const todayString = () => localDateOnlyToApiString(new Date());

/** Kind of an item in the list: decides which edit modal / endpoint it uses. */
const itemKind = (rx) => {
  const type = rxTypeOf(rx).toLowerCase().replace(/\s/g, '');
  if (type.includes('compound')) return 'compound';
  if (type.includes('freetext') || rxField(rx, 'FreeTextType', 'freeTextType')) return 'custom';
  if (type.includes('supply')) return 'supply';
  return 'coded';
};

// Initial medication form (web handleMedicationSelect): prefilled from a favorite when one is used.
const medicationForm = (drug, prefill = {}) => ({
  buildUsing: prefill.Directions ? 'custom-format' : 'sig-builder',
  doseDeliveryMethod: '',
  doseQuantity: '',
  doseForm: drug?.DoseForm || '',
  routeOfAdministration: drug?.Route || '',
  frequency: '',
  daySupply: prefill.DaysSupply != null ? String(prefill.DaysSupply) : '0',
  patientDirections: prefill.Directions || '',
  totalDispense: prefill.Quantity != null ? String(prefill.Quantity) : '0',
  refills: prefill.Refills != null ? String(prefill.Refills) : '0',
  totalDispenseForm: DISPENSE_UNIT_NAMES[prefill.DispenseUnitTypeId ?? prefill.DispenseUnitTypeID ?? drug?.DispenseUnitId] || 'Each',
  noSubstitutions: Boolean(prefill.NoSubstitutions),
  urgent: false,
  effectiveDate: todayString(),
  pharmacyNotesText: prefill.Notes || prefill.PharmacyNotes || '',
  createAsFavorite: false,
  favoriteName: '',
});

const medicationFormFromDetail = (detail) => ({
  ...medicationForm(null),
  buildUsing: 'custom-format',
  patientDirections: String(detail?.Directions ?? ''),
  totalDispense: String(detail?.Quantity ?? '0'),
  refills: String(detail?.Refills ?? '0'),
  daySupply: String(detail?.DaysSupply ?? '0'),
  totalDispenseForm: DISPENSE_UNIT_NAMES[detail?.DispenseUnitId ?? detail?.DispenseUnitTypeId] || 'Each',
  noSubstitutions: Boolean(detail?.NoSubstitutions),
  urgent: Boolean(detail?.IsUrgent),
  effectiveDate: String(detail?.EffectiveDate ?? todayString()).slice(0, 10),
  pharmacyNotesText: String(detail?.PharmacyNotes ?? ''),
});

const CLOSED_MED = { visible: false, drug: null, form: null, editingId: null, saving: false, tried: false };
const CLOSED_SUPPLY = { visible: false, isCustom: false, item: null, form: null, editingId: null, saving: false, tried: false };
const CLOSED_COMPOUND = { visible: false, form: null, editingId: null, saving: false, tried: false };

function StepBar({ currentIndex }) {
  return (
    <View style={styles.stepBar}>
      {STEPS.map((step, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                {done ? (
                  <Feather name="check" size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]} numberOfLines={2}>
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 ? <View style={[styles.stepConnector, done && styles.stepConnectorDone]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** Web's collapsible "Appointment Details" shell: patient + doctor (with DEA number) + appointment status. */
function ContextHeader({ patient, doctor, appointment, fallbackPatientName }) {
  const [collapsed, setCollapsed] = useState(true);
  const display = appointment ? getAppointmentDisplay(appointment) : null;
  const dateText = display && display.instantMs !== null ? `${display.date} · ${display.timeWithZone}` : '';
  const patientName = fullName(patient) || fallbackPatientName || 'Patient';
  const dea = doctor?.deaNumber || doctor?.deaNumbers?.[0]?.deaNumber || '';

  return (
    <View style={styles.context}>
      <Pressable style={styles.contextHeader} onPress={() => setCollapsed((value) => !value)}>
        <View style={styles.flex1}>
          <Text style={styles.contextTitle}>Appointment Details</Text>
          <Text style={styles.contextSub} numberOfLines={1}>
            {patientName}
            {dateText ? ` · ${dateText}` : ''}
          </Text>
        </View>
        {appointment?.appointmentStatus ? <StatusBadge status={appointment.appointmentStatus} /> : null}
        <Feather name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={adTokens.textPrimary} />
      </Pressable>
      {!collapsed ? (
        <View style={styles.contextBody}>
          <Text style={styles.contextLabel}>Patient</Text>
          <Text style={styles.contextName}>{patientName}</Text>
          <View style={styles.contextBadgeRow}>
            {appointment?.appointmentReason || appointment?.symtom ? (
              <View style={[styles.contextBadge, styles.contextBadgeInfo]}>
                <MaterialCommunityIcons name="pulse" size={13} color={adTokens.infoDark} />
                <Text style={styles.contextBadgeTextInfo}>{appointment.appointmentReason || appointment.symtom}</Text>
              </View>
            ) : null}
            {appointment?.patientAge || appointment?.age ? (
              <View style={[styles.contextBadge, styles.contextBadgeNeutral]}>
                <Text style={styles.contextBadgeTextNeutral}>Age {appointment.patientAge || appointment.age}</Text>
              </View>
            ) : null}
            {dateText ? (
              <View style={[styles.contextBadge, styles.contextBadgeNeutral]}>
                <MaterialCommunityIcons name="calendar-clock-outline" size={13} color={adTokens.textSecondary} />
                <Text style={styles.contextBadgeTextNeutral}>{dateText}</Text>
              </View>
            ) : null}
          </View>
          {patient?.email || patient?.Email ? (
            <View style={styles.contextIconLine}>
              <MaterialCommunityIcons name="email-outline" size={13} color={adTokens.textMuted} />
              <Text style={styles.contextLine}>{patient.email || patient.Email}</Text>
            </View>
          ) : null}
          <View style={styles.contextIconLine}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={adTokens.textMuted} />
            <Text style={styles.contextLine}>{fullAddress(patient) || '—'}</Text>
          </View>

          <Text style={[styles.contextLabel, styles.contextGap]}>Doctor</Text>
          <Text style={styles.contextName}>{fullName(doctor) || '—'}</Text>
          {dea ? (
            <View style={styles.contextBadgeRow}>
              <View style={[styles.contextBadge, styles.contextBadgeWarning]}>
                <MaterialCommunityIcons name="certificate-outline" size={13} color={adTokens.warningDark} />
                <Text style={styles.contextBadgeTextWarning}>DEA {dea}</Text>
              </View>
            </View>
          ) : null}
          {doctor?.email || doctor?.Email ? (
            <View style={styles.contextIconLine}>
              <MaterialCommunityIcons name="email-outline" size={13} color={adTokens.textMuted} />
              <Text style={styles.contextLine}>{doctor.email || doctor.Email}</Text>
            </View>
          ) : null}
          <View style={styles.contextIconLine}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={adTokens.textMuted} />
            <Text style={styles.contextLine}>{fullAddress(doctor) || '—'}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Prescribe wizard - port of AllyDocReactApp's AddPrescriptionFlowWrapper / AddPrescriptionPage / steps:
 *   1. Select Pharmacy  - shared PharmacyPicker (collapsible search, patient pharmacies, select / deselect).
 *   2. Add Prescription - search card (Medication / Supplies, "Add Custom Supply" / "Add Custom Compound"), tabs
 *      Medication & Supplies / Clinic Presets (not for freelancer doctors) / Favorites, and "Items to prescribe"
 *      (`GetPatientPrescriptions?status=Entered,Edited,ReadyToSign,EpcsError`) with edit / delete / delete all /
 *      prescription benefits check.
 *   3. Review & Save    - select and send (`SendPrescriptions`), past-date warning, prescriber PIN, EPCS sign+send
 *      for controlled substances, print/PDF, results banner.
 * Not ported (see docs/PROGRESS.md): Order Sets (an empty tab on web too).
 */
export default function AddPrescriptionPage() {
  const bottomSafe = useBottomSafeSpacing();
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = useAuth();
  const { getUserDetails } = usePatients();
  const { appointmentId, doseSpotPatientId, patientId, patientName, initialStepIndex, initialPharmacyId } = route.params || {};
  const isFreelancerDoctor =
    String(profile?.userType || '').toLowerCase() === 'freelancer' && String(profile?.roleName || '').toLowerCase().trim() === 'doctor';

  // "Continue Prescription" (TreatmentPlanDetailPage, an appointment with a prescription already
  // in flight) lands here past the pharmacy step, since that pharmacy was already chosen earlier.
  const [stepIndex, setStepIndex] = useState(initialStepIndex ?? 0);

  // ---- header context ----
  const [patientDetails, setPatientDetails] = useState(null);
  const [doctorDetails, setDoctorDetails] = useState(null);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    if (patientId) getUserDetails(patientId).then(setPatientDetails).catch(() => {});
    if (profile?.userId) getUserDetails(profile.userId).then(setDoctorDetails).catch(() => {});
    if (appointmentId) getAppointmentDetails(appointmentId).then((result) => result.success && setAppointment(result.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, profile?.userId, appointmentId]);

  // ---- Step 1 ----
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  // Re-resolve the pharmacy used by the in-progress prescription we're continuing, since the
  // wizard was entered straight at the medication-search step and never ran its own picker.
  useEffect(() => {
    if (!initialPharmacyId) return;
    getPharmacyById(String(initialPharmacyId)).then((result) => {
      const pharmacy = result.success ? result.data?.Item || result.data?.item || result.data : null;
      if (pharmacy) setSelectedPharmacy(pharmacy);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPharmacyId]);
  const onPharmaciesLoaded = useCallback((items) => {
    const defaultPharmacy = items.find((p) => p.IsDefault === true || p.isDefault === true);
    if (defaultPharmacy) setSelectedPharmacy((current) => current || defaultPharmacy);
  }, []);

  // ---- Step 2: search + tabs ----
  const [searchType, setSearchType] = useState('Medication');
  const [query, setQuery] = useState('');
  const [medResults, setMedResults] = useState([]);
  const [medPage, setMedPage] = useState({ page: 1, result: null });
  const [supplyResults, setSupplyResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState(isFreelancerDoctor ? 'favorites' : 'clinic-presets');
  const [manualTab, setManualTab] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [blockedDrugName, setBlockedDrugName] = useState('');
  const [favoritesRefresh, setFavoritesRefresh] = useState(0);
  const [epcsModalVisible, setEpcsModalVisible] = useState(false);
  const [epcsTfaCompleted, setEpcsTfaCompleted] = useState(false);
  const [epcsPinSet, setEpcsPinSet] = useState(false);

  const openEpcsModal = async () => {
    const [tfaStatus, pinFlag] = await Promise.all([getItem('tfaStatus'), getItem('hasPinSetForTFA')]);
    setEpcsTfaCompleted((tfaStatus || '').toLowerCase() === 'tfaactivatedsuccess');
    setEpcsPinSet(pinFlag === 'true' || pinFlag === '1');
    setEpcsModalVisible(true);
  };

  const showMedTab = query.trim().length >= MIN_SEARCH_LENGTH || hasSearched;
  const tabs = [
    showMedTab ? { key: 'medication-supplies', label: 'Medication & Supplies' } : null,
    !isFreelancerDoctor ? { key: 'clinic-presets', label: 'Clinic Presets' } : null,
    { key: 'favorites', label: 'Favorites' },
  ].filter(Boolean);
  const visibleTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0].key;

  const runSearch = async (page = 1) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH || isSearching) return;
    setIsSearching(true);
    setBlockedDrugName('');
    if (!manualTab) setActiveTab('medication-supplies');
    if (searchType === 'Supplies') {
      const result = await searchSupplies(trimmed, page);
      setSupplyResults(result.success && Array.isArray(result.data?.Items) ? result.data.Items : []);
      setMedResults([]);
      setMedPage({ page, result: result.data?.PageResult || null });
    } else {
      const result = await searchMedications(trimmed, page);
      const found = result.success && Array.isArray(result.data?.Items) ? result.data.Items : [];
      setMedResults(found.filter((item) => !item.IsObsolete));
      setSupplyResults([]);
      setMedPage({ page, result: result.data?.PageResult || null });
    }
    setHasSearched(true);
    setIsSearching(false);
  };

  // ---- Step 2: items to prescribe (also the Review list) ----
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadItems = useCallback(async () => {
    if (!doseSpotPatientId) return;
    setIsLoadingItems(true);
    const result = await getPatientPrescriptionsByStatus(doseSpotPatientId, { status: LIST_STATUSES, limit: 40 });
    const data = result.data || {};
    // The backend wraps the array as { totalRecords, page, ..., data: [...] } (lowercase `data`,
    // not `Items`) - check that shape first, before the other two this already handled.
    setItems(
      Array.isArray(data.data) ? data.data : Array.isArray(data.Items) ? data.Items : Array.isArray(data) ? data : [],
    );
    setIsLoadingItems(false);
  }, [doseSpotPatientId]);

  useEffect(() => {
    if (stepIndex >= 1) loadItems();
  }, [stepIndex, loadItems]);

  // Web shows the delete / edit controls only on this appointment's prescriptions.
  const isCurrentAppointment = (rx) => {
    const apptId = rxField(rx, 'AppointmentId', 'appointmentId');
    return apptId == null || String(apptId) === String(appointmentId);
  };

  // ---- medication modal ----
  const [med, setMed] = useState(CLOSED_MED);

  const changeMed = (name, value) =>
    setMed((prev) => {
      let val = value;
      if (name === 'doseQuantity' || name === 'totalDispense') val = normalizeQuantity(value);
      const next = { ...prev.form, [name]: val };
      if (name === 'doseQuantity' || name === 'daySupply' || name === 'frequency') {
        const qty = parseFloat(next.doseQuantity) || 0;
        const days = parseInt(next.daySupply, 10) || 0;
        if (qty > 0 && days > 0) next.totalDispense = Math.ceil(qty * frequencyMultiplier(next.frequency) * days).toString();
      }
      const sigFields = ['doseDeliveryMethod', 'doseQuantity', 'doseForm', 'routeOfAdministration', 'frequency', 'daySupply', 'buildUsing'];
      if (next.buildUsing !== 'custom-format' && sigFields.includes(name)) next.patientDirections = buildDirections(next);
      return { ...prev, form: next };
    });

  const medErrors = useMemo(() => {
    const form = med.form;
    if (!form) return {};
    const errors = {};
    if (!form.patientDirections.trim()) errors.patientDirections = 'Patient directions are required';
    if (!String(form.totalDispense).trim()) errors.totalDispense = 'Required';
    if (!String(form.refills).trim()) errors.refills = 'Required';
    if (!String(form.daySupply).trim()) errors.daySupply = 'Day Supply is required';
    if (!form.totalDispenseForm) errors.totalDispenseForm = 'Required';
    if (form.createAsFavorite && !form.favoriteName.trim()) errors.favoriteName = 'Favorite name is required';
    return errors;
  }, [med.form]);

  // Web handleMedicationSelect: SelectMedication for the details, then the EPCS gate, then the modal.
  // Web's checkEPCSAuthorization only blocks a controlled drug from being ADDED when TFA/PIN aren't
  // both complete - once they are, it's added normally like any other medication, and the actual
  // DEA signing happens later at send time (see the "Send (EPCS)" flow / EpcsWorkflowModal).
  const openMedication = async (drug, prefill) => {
    const id = drug.DispensableDrugId;
    setBlockedDrugName('');
    setResolvingId(id);
    const result = await selectMedication(id);
    setResolvingId(null);
    const detail = result.success ? result.data?.Item || result.data?.item : null;
    const merged = { ...drug, ...(detail || {}) };
    const schedule = Number(merged.Schedule ?? drug.Schedule ?? 0);
    if (schedule >= 2 && schedule <= 5) {
      const [tfaStatus, pinFlag] = await Promise.all([getItem('tfaStatus'), getItem('hasPinSetForTFA')]);
      const tfaDone = (tfaStatus || '').toLowerCase() === 'tfaactivatedsuccess';
      const pinDone = pinFlag === 'true' || pinFlag === '1';
      if (!tfaDone || !pinDone) {
        setEpcsTfaCompleted(tfaDone);
        setEpcsPinSet(pinDone);
        setEpcsModalVisible(true);
        setBlockedDrugName(merged.DisplayName || merged.NameWithRouteDoseForm || 'This medication');
        return;
      }
    }
    setMed({ ...CLOSED_MED, visible: true, drug: merged, form: medicationForm(merged, prefill) });
  };

  const saveMedication = async () => {
    setMed((prev) => ({ ...prev, tried: true }));
    const pharmacyId = getPharmacyId(selectedPharmacy);
    if (!pharmacyId) {
      toast.error('Select a pharmacy first.');
      return;
    }
    if (Object.keys(medErrors).length > 0) return;
    const { form, drug, editingId } = med;
    const payload = {
      dispensableDrugId: drug.DispensableDrugId || 0,
      refills: parseInt(form.refills, 10) || 0,
      dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[form.totalDispenseForm] || drug.DispenseUnitId || 1,
      quantity: String(form.totalDispense || '30'),
      directions: form.patientDirections || 'Take as directed',
      isUrgent: form.urgent,
      pharmacyId,
      noSubstitutions: form.noSubstitutions,
      effectiveDate: form.effectiveDate || todayString(),
      daysSupply: parseInt(form.daySupply, 10) || 0,
      pharmacyNotes: form.pharmacyNotesText || '',
    };
    setMed((prev) => ({ ...prev, saving: true }));
    const name = drug.NameWithRouteDoseForm || drug.DisplayName || '';
    const result = editingId
      ? await editCodedPrescription(doseSpotPatientId, editingId, { ...payload, medicationName: name, displayName: drug.DisplayName || name }, appointmentId)
      : await addCodedPrescription(doseSpotPatientId, payload, appointmentId);
    if (!result.success || result.raw?.data?.Result?.ResultCode === 'ERROR') {
      setMed((prev) => ({ ...prev, saving: false }));
      toast.error(result.message || result.raw?.data?.Result?.ResultDescription || 'Failed to save the prescription.');
      return;
    }
    toast.success(result.message || (editingId ? 'Prescription updated successfully' : 'Prescription added successfully'));
    if (!editingId && form.createAsFavorite && form.favoriteName.trim()) {
      const favorite = await createCodedFavorite({
        title: form.favoriteName.trim(),
        dispensableDrugId: payload.dispensableDrugId,
        refills: payload.refills,
        daysSupply: payload.daysSupply,
        quantity: payload.quantity,
        dispenseUnitTypeId: payload.dispenseUnitId,
        noSubstitutions: payload.noSubstitutions,
        notes: payload.pharmacyNotes,
        directions: payload.directions,
        firstPrescriptionDiagnosisPrimaryDiagnosisId: 0,
        firstPrescriptionDiagnosisSecondaryDiagnosisId: 0,
        secondPrescriptionDiagnosisPrimaryDiagnosisId: 0,
        secondPrescriptionDiagnosisSecondaryDiagnosisId: 0,
      });
      if (favorite.success) {
        toast.success('Saved to favorites');
        setFavoritesRefresh((n) => n + 1);
        setActiveTab('favorites');
        setManualTab(true);
      } else {
        toast.error(favorite.message || 'Could not save the favorite.');
      }
    }
    setMed(CLOSED_MED);
    loadItems();
  };

  // ---- supply / custom supply modal ----
  const [supply, setSupply] = useState(CLOSED_SUPPLY);
  const changeSupply = (name, value) =>
    setSupply((prev) => ({ ...prev, form: { ...prev.form, [name]: name === 'quantity' ? normalizeQuantity(value) : value } }));

  const openSupply = (item, prefill = {}) =>
    setSupply({
      ...CLOSED_SUPPLY,
      visible: true,
      item,
      form: emptySupplyForm({
        quantity: prefill.Quantity != null ? String(prefill.Quantity) : '',
        refills: prefill.Refills != null ? String(prefill.Refills) : '0',
        daysSupply: prefill.DaysSupply != null ? String(prefill.DaysSupply) : '',
        patientDirections: prefill.Directions || '',
        dispenseUnit: DISPENSE_UNIT_NAMES[prefill.DispenseUnitTypeId] || 'Each',
      }),
    });

  const openCustomSupply = (prefill = {}) =>
    setSupply({
      ...CLOSED_SUPPLY,
      visible: true,
      isCustom: true,
      form: emptySupplyForm({
        customSupplyName: prefill.Title || prefill.Name || prefill.MedDisplayName || '',
        quantity: prefill.Quantity != null ? String(prefill.Quantity) : '',
        refills: prefill.Refills != null ? String(prefill.Refills) : '0',
        daysSupply: prefill.DaysSupply != null ? String(prefill.DaysSupply) : '',
        patientDirections: prefill.Directions || '',
      }),
    });

  const saveSupply = async () => {
    setSupply((prev) => ({ ...prev, tried: true }));
    const pharmacyId = getPharmacyId(selectedPharmacy);
    if (!pharmacyId) {
      toast.error('Select a pharmacy first.');
      return;
    }
    const { form, isCustom, item, editingId } = supply;
    if (Object.keys(validateSupplyForm(form, isCustom)).length > 0) return;
    const common = {
      refills: parseInt(form.refills, 10) || 0,
      daysSupply: parseInt(form.daysSupply, 10) || 0,
      dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[form.dispenseUnit] || 0,
      quantity: String(form.quantity),
      directions: form.patientDirections,
      isUrgent: form.urgent,
      pharmacyId,
    };
    setSupply((prev) => ({ ...prev, saving: true }));
    let result;
    if (isCustom) {
      const payload = { ...common, displayName: form.customSupplyName.trim(), notControlled: true, status: '1', pharmacyNotes: form.pharmacyNotesText || '' };
      result = editingId
        ? await editSupplyFreeTextPrescription(doseSpotPatientId, editingId, payload, appointmentId)
        : await addSupplyFreeTextPrescription(doseSpotPatientId, payload, appointmentId);
    } else {
      const payload = { ...common, supplyId: item?.SupplyId, status: 1 };
      result = editingId
        ? await editSupplyPrescription(doseSpotPatientId, editingId, payload, appointmentId)
        : await addSupplyPrescription(doseSpotPatientId, payload, appointmentId);
    }
    if (!result.success || result.raw?.data?.Result?.ResultCode === 'ERROR') {
      setSupply((prev) => ({ ...prev, saving: false }));
      toast.error(result.message || result.raw?.data?.Result?.ResultDescription || 'Failed to save the supply prescription.');
      return;
    }
    toast.success(result.message || (editingId ? 'Prescription updated successfully' : 'Prescription added successfully'));
    setSupply(CLOSED_SUPPLY);
    loadItems();
  };

  // ---- compound / custom compound modal ----
  const [compound, setCompound] = useState(CLOSED_COMPOUND);
  const changeCompound = (name, value) => setCompound((prev) => ({ ...prev, form: { ...prev.form, [name]: value } }));

  const compoundIngredientFromFavorite = (ing) => ({
    key: Math.random().toString(36).slice(2),
    query: '',
    results: [],
    searching: false,
    name: ing.FreeText || ing.DrugName || ing.Name || '',
    dispensableDrugId: ing.DispensableDrugId ?? null,
    isCustom: Boolean(ing.FreeText),
    notControlledSubstance: ing.IsFreeTextEPCS === false || !ing.FreeText,
    totalDispense: String(ing.Quantity ?? ''),
    dispenseForm: DISPENSE_UNIT_NAMES[ing.DispenseUnitId] || 'Each',
  });

  const openCustomCompound = (prefill = {}) => {
    // `emptyCompoundForm`'s overrides are spread onto its defaults, so an explicit
    // `ingredients: undefined` here would overwrite (not skip) the default single-empty-
    // ingredient array and crash the modal's `form.ingredients.map(...)` - only include the
    // key at all when there's real prefill data to use.
    const hasIngredients = Array.isArray(prefill.CompoundIngredients) && prefill.CompoundIngredients.length > 0;
    setCompound({
      ...CLOSED_COMPOUND,
      visible: true,
      form: emptyCompoundForm({
        compoundName: prefill.Title || prefill.CompoundDescription || '',
        ...(hasIngredients ? { ingredients: prefill.CompoundIngredients.map(compoundIngredientFromFavorite) } : {}),
        noSubstitutions: Boolean(prefill.NoSubstitutions),
        patientDirections: prefill.Directions || '',
        totalDispense: prefill.Quantity != null ? String(prefill.Quantity) : '',
        totalDispenseForm: DISPENSE_UNIT_NAMES[prefill.DispenseUnitId] || 'Each',
        refills: prefill.Refills != null ? String(prefill.Refills) : '0',
        daySupply: prefill.DaysSupply != null ? String(prefill.DaysSupply) : '',
        pharmacyNotesText: prefill.Notes || '',
      }),
    });
  };

  const saveCompound = async () => {
    setCompound((prev) => ({ ...prev, tried: true }));
    const pharmacyId = getPharmacyId(selectedPharmacy);
    if (!pharmacyId) {
      toast.error('Select a pharmacy first.');
      return;
    }
    const { form, editingId } = compound;
    if (Object.keys(validateCompoundForm(form)).length > 0) return;
    setCompound((prev) => ({ ...prev, saving: true }));
    const payload = {
      compoundDescription: form.compoundName.trim(),
      compoundIngredients: form.ingredients.map((ing) =>
        ing.isCustom
          ? {
              quantity: Number(ing.totalDispense) || 0,
              dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[ing.dispenseForm] || 0,
              freeText: ing.name.trim(),
              isFreeTextEPCS: !ing.notControlledSubstance,
            }
          : {
              quantity: Number(ing.totalDispense) || 0,
              dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[ing.dispenseForm] || 0,
              dispensableDrugId: ing.dispensableDrugId,
            },
      ),
      refills: parseInt(form.refills, 10) || 0,
      dispenseUnitId: DISPENSE_UNIT_ID_BY_NAME[form.totalDispenseForm] || 0,
      quantity: String(form.totalDispense),
      directions: form.patientDirections,
      status: '1',
      pharmacyId,
      pharmacyNotes: form.pharmacyNotesText || '',
      noSubstitutions: form.noSubstitutions,
      effectiveDate: form.effectiveDate || todayString(),
      isUrgent: form.urgent,
    };
    const result = editingId
      ? await editCompiledCompoundPrescription(doseSpotPatientId, editingId, payload, appointmentId)
      : await addCompiledCompoundPrescription(doseSpotPatientId, payload, appointmentId);
    if (!result.success || result.raw?.data?.Result?.ResultCode === 'ERROR') {
      setCompound((prev) => ({ ...prev, saving: false }));
      toast.error(result.message || result.raw?.data?.Result?.ResultDescription || 'Failed to save the compound prescription.');
      return;
    }
    toast.success(result.message || (editingId ? 'Prescription updated successfully' : 'Prescription added successfully'));
    if (!editingId && form.createAsFavorite && form.favoriteName.trim()) {
      // Fire-and-forget, same as web - doesn't block the main success path.
      createCompoundFavorite('clinician', null, {
        compoundDescription: form.compoundName.trim(),
        title: form.favoriteName.trim(),
        compoundIngredients: payload.compoundIngredients,
        notes: payload.pharmacyNotes,
        directions: payload.directions,
        refills: payload.refills,
        daysSupply: parseInt(form.daySupply, 10) || 0,
        quantity: payload.quantity,
        dispenseUnitTypeId: payload.dispenseUnitId,
        noSubstitutions: payload.noSubstitutions,
        firstPrescriptionDiagnosis1: 0,
        firstPrescriptionDiagnosis2: 0,
        firstPrescriptionDiagnosis3: 0,
        firstPrescriptionDiagnosis4: 0,
      }).catch(() => {});
    }
    setCompound(CLOSED_COMPOUND);
    loadItems();
  };

  // ---- prescription benefits (live eligibility/formulary check) ----
  const [benefitsModal, setBenefitsModal] = useState({ visible: false, ndc: null, currentPrescription: null });
  const [benefitsLoading, setBenefitsLoading] = useState(null);

  const openBenefits = async (rx) => {
    const drugId = rxField(rx, 'DispensableDrugId', 'dispensableDrugId');
    if (!drugId) return;
    setBenefitsLoading(rxIdOf(rx));
    const drugResult = await selectMedication(drugId);
    setBenefitsLoading(null);
    const drugItem = drugResult?.success ? drugResult.data?.Item || drugResult.data?.item || {} : {};
    const ndc = drugItem.NDC || drugItem.Ndc;
    setBenefitsModal({ visible: true, ndc, currentPrescription: rx });
  };

  const handleReplaceMedication = async (selectedRow) => {
    const rx = benefitsModal.currentPrescription;
    setBenefitsModal({ visible: false, ndc: null, currentPrescription: null });
    const drugId = selectedRow.dispensableDrugId;
    if (!drugId) return;
    const drugResult = await selectMedication(drugId);
    const drugItem = drugResult?.success ? drugResult.data?.Item || drugResult.data?.item || {} : {};
    const merged = { ...drugItem, DispensableDrugId: drugId, DisplayName: selectedRow.displayName || drugItem.DisplayName };
    const pricing = selectedRow.pricingSet?.PricingCoverage;
    await openMedication(merged, {
      Directions: rxField(rx, 'Directions', 'directions'),
      Refills: rxField(rx, 'Refills', 'refills'),
      IsUrgent: rxField(rx, 'IsUrgent', 'isUrgent'),
      NoSubstitutions: rxField(rx, 'NoSubstitutions', 'noSubstitutions'),
      Quantity: pricing?.QuantityPricedValue || '30',
      DaysSupply: pricing?.DaysSupplyPriced || '30',
      DispenseUnitTypeId: pricing?.DispenseUnitTypeID ?? drugItem.DispenseUnitId,
    });
  };

  // Web ClinicPresetsTab / FavoritesTab "+" routing.
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const applyFavorite = async (fav, id) => {
    if (fav.IsCompound || fav.CompoundId || Array.isArray(fav.CompoundIngredients)) {
      openCustomCompound(fav);
      return;
    }
    if (fav.DispensableDrugId) {
      setPendingFavoriteId(id);
      await openMedication({ DispensableDrugId: fav.DispensableDrugId, DisplayName: fav.MedDisplayName || fav.Title }, fav);
      setPendingFavoriteId(null);
      return;
    }
    if (fav.IsSupply && fav.SupplyId) {
      openSupply({ SupplyId: fav.SupplyId, Name: fav.MedDisplayName || fav.Title || fav.Name }, fav);
      return;
    }
    openCustomSupply(fav);
  };

  // ---- edit / delete from the list ----
  const startEdit = async (rx) => {
    const id = rxIdOf(rx);
    const kind = itemKind(rx);
    setBusyId(id);
    const result = await getPrescriptionById(doseSpotPatientId, id);
    const detail = result.success ? result.data?.Prescription || result.data : null;
    if (!detail) {
      setBusyId(null);
      toast.error(result.message || 'Unable to load this prescription.');
      return;
    }
    if (kind === 'coded') {
      const drugId = detail.DispensableDrugId ?? rxField(rx, 'DispensableDrugId');
      const drugResult = drugId ? await selectMedication(drugId) : null;
      const drugItem = drugResult?.success ? drugResult.data?.Item || drugResult.data?.item || {} : {};
      setBusyId(null);
      setMed({
        ...CLOSED_MED,
        visible: true,
        drug: { ...drugItem, DispensableDrugId: drugId, DisplayName: detail.DisplayName || rxNameOf(rx) || drugItem.DisplayName },
        form: medicationFormFromDetail(detail),
        editingId: id,
      });
      return;
    }
    if (kind === 'compound') {
      const rawIngredients = Array.isArray(detail.CompoundIngredients) ? detail.CompoundIngredients : [];
      const ingredients = await Promise.all(
        rawIngredients.map(async (ing) => {
          let name = ing.FreeText || ing.DrugName || ing.Name || '';
          if (!ing.FreeText && ing.DispensableDrugId && name.length < 5) {
            const drugResult = await selectMedication(ing.DispensableDrugId);
            const drugItem = drugResult?.success ? drugResult.data?.Item || drugResult.data?.item || {} : {};
            name = drugItem.DisplayName || name;
          }
          return {
            key: Math.random().toString(36).slice(2),
            query: '',
            results: [],
            searching: false,
            name,
            dispensableDrugId: ing.DispensableDrugId ?? null,
            isCustom: Boolean(ing.FreeText),
            notControlledSubstance: ing.IsFreeTextEPCS === false || !ing.FreeText,
            totalDispense: String(ing.Quantity ?? ''),
            dispenseForm: DISPENSE_UNIT_NAMES[ing.DispenseUnitId] || 'Each',
          };
        }),
      );
      setBusyId(null);
      setCompound({
        ...CLOSED_COMPOUND,
        visible: true,
        form: emptyCompoundForm({
          compoundName: detail.DisplayName || rxNameOf(rx) || '',
          ...(ingredients.length ? { ingredients } : {}),
          noSubstitutions: Boolean(detail.NoSubstitutions),
          urgent: Boolean(detail.IsUrgent),
          patientDirections: String(detail.Directions ?? ''),
          totalDispense: String(detail.Quantity ?? ''),
          totalDispenseForm: DISPENSE_UNIT_NAMES[detail.DispenseUnitId ?? detail.DispenseUnitTypeId] || 'Each',
          refills: String(detail.Refills ?? '0'),
          effectiveDate: String(detail.EffectiveDate ?? todayString()).slice(0, 10),
          daySupply: String(detail.DaysSupply ?? ''),
          pharmacyNotesText: String(detail.PharmacyNotes ?? ''),
        }),
        editingId: id,
      });
      return;
    }
    setBusyId(null);
    setSupply({
      ...CLOSED_SUPPLY,
      visible: true,
      isCustom: kind === 'custom',
      item: { SupplyId: detail.SupplyId, Name: detail.DisplayName || rxNameOf(rx) },
      form: emptySupplyForm({
        customSupplyName: detail.DisplayName || rxNameOf(rx),
        notControlledSubstance: true,
        quantity: String(detail.Quantity ?? ''),
        refills: String(detail.Refills ?? '0'),
        daysSupply: String(detail.DaysSupply ?? ''),
        patientDirections: String(detail.Directions ?? ''),
        urgent: Boolean(detail.IsUrgent),
        dispenseUnit: DISPENSE_UNIT_NAMES[detail.DispenseUnitId ?? detail.DispenseUnitTypeId] || 'Each',
        pharmacyNotesText: String(detail.PharmacyNotes ?? ''),
      }),
      editingId: id,
    });
  };

  const confirmDelete = (ids, message) =>
    Alert.alert(ids.length > 1 ? 'Delete All Prescriptions' : 'Delete Prescription', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: ids.length > 1 ? 'Confirm Deletion' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(ids.length > 1 ? 'all' : ids[0]);
          const result = await deletePrescriptions(doseSpotPatientId, ids, appointmentId);
          setBusyId(null);
          if (result.success) toast.success(result.message || (ids.length > 1 ? 'All prescriptions deleted successfully' : 'Prescription deleted'));
          else toast.error(result.message || 'Failed to delete prescriptions');
          loadItems();
        },
      },
    ]);

  const deletableIds = items.filter(isCurrentAppointment).map(rxIdOf).filter(Boolean);

  // ---- Step 3: review + send ----
  const reviewItems = items.filter((rx) => SENDABLE.has(statusKey(rx)) && isCurrentAppointment(rx));
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [pinVisible, setPinVisible] = useState(false);
  const [pastDateRows, setPastDateRows] = useState([]);
  const [pendingSendIds, setPendingSendIds] = useState([]);

  useEffect(() => {
    if (stepIndex === 2) setSelectedIds(new Set(reviewItems.map(rxIdOf).filter(Boolean)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, items]);

  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sendNow = async (ids, pin) => {
    setIsSending(true);
    const result = await sendPrescriptions(doseSpotPatientId, { pin, prescriptionIds: ids }, appointmentId);
    setIsSending(false);
    setPinVisible(false);
    if (!result.success && !Array.isArray(result.data)) {
      toast.error(result.message || 'Failed to send prescriptions');
      return;
    }
    const entries = Array.isArray(result.data) ? result.data : [];
    setSendResults(
      ids.map((id) => {
        const entry = entries.find((e) => String(e?.id) === String(id));
        const rx = items.find((r) => String(rxIdOf(r)) === String(id));
        const ok = entry?.result?.resultCode === 'OK';
        return { id, name: rx ? rxNameOf(rx) : `Prescription ${id}`, ok, message: ok ? 'Sent successfully' : entry?.result?.resultDescription || result.message || 'Failed to send' };
      }),
    );
    loadItems();
  };

  const startSend = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.warning('No prescriptions selected');
      return;
    }
    const pastRows = reviewItems.filter((rx) => ids.includes(rxIdOf(rx)) && isPastDate(rxField(rx, 'EffectiveDate', 'effectiveDate')));
    if (pastRows.length > 0) {
      setPastDateRows(pastRows);
      return;
    }
    setSendResults(null);
    const pinFlag = await getItem('hasPinSetForTFA');
    if (pinFlag === 'true' || pinFlag === '1') {
      setPendingSendIds(ids);
      setPinVisible(true);
    } else {
      sendNow(ids, null);
    }
  };

  // ---- EPCS send (controlled substances selected for sending) ----
  const isControlledRx = (rx) => {
    const schedule = Number(rxField(rx, 'Schedule', 'schedule') ?? 0);
    return schedule >= 2 && schedule <= 5;
  };
  const selectedControlledItems = reviewItems.filter((rx) => selectedIds.has(rxIdOf(rx)) && isControlledRx(rx));
  const [epcsWorkflowVisible, setEpcsWorkflowVisible] = useState(false);

  const startEpcsSend = () => {
    const ids = selectedControlledItems.map(rxIdOf);
    if (ids.length === 0) {
      toast.warning('No controlled-substance prescriptions selected');
      return;
    }
    const pastRows = selectedControlledItems.filter((rx) => isPastDate(rxField(rx, 'EffectiveDate', 'effectiveDate')));
    if (pastRows.length > 0) {
      setPastDateRows(pastRows);
      return;
    }
    setEpcsWorkflowVisible(true);
  };

  // ---- print / PDF preview ----
  const [printPinVisible, setPrintPinVisible] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printHtml, setPrintHtml] = useState(null);

  const buildPrintRows = async (selectedRxItems) => {
    return Promise.all(
      selectedRxItems.map(async (rx) => {
        let ingredientsText = '';
        if (itemKind(rx) === 'compound') {
          const detailRes = await getPrescriptionById(doseSpotPatientId, rxIdOf(rx));
          const detail = detailRes.success ? detailRes.data?.Prescription || detailRes.data : null;
          const rawIngredients = Array.isArray(detail?.CompoundIngredients) ? detail.CompoundIngredients : [];
          const names = await Promise.all(
            rawIngredients.map(async (ing) => {
              if (ing.FreeText) return ing.FreeText;
              if (ing.DispensableDrugId) {
                const drugResult = await selectMedication(ing.DispensableDrugId);
                const drugItem = drugResult?.success ? drugResult.data?.Item || drugResult.data?.item || {} : {};
                return drugItem.DisplayName || drugItem.DrugName || drugItem.NameWithRouteDoseForm || '';
              }
              return '';
            }),
          );
          ingredientsText = names.filter(Boolean).join(', ');
        }
        return {
          medicationName: rxNameOf(rx),
          ingredientsText,
          writtenDate: rxField(rx, 'CreatedDate', 'WrittenDate', 'createdDate'),
          effectiveDate: rxField(rx, 'EffectiveDate', 'effectiveDate'),
          directions: rxField(rx, 'Directions', 'directions'),
          quantity: rxField(rx, 'Quantity', 'quantity'),
          refills: rxField(rx, 'Refills', 'refills'),
        };
      }),
    );
  };

  const finalizePrint = async (pin) => {
    const ids = [...selectedIds];
    setPrintLoading(true);
    const result = await setPrintedPrescriptions(doseSpotPatientId, { pin, prescriptionIds: ids, appointmentId });
    if (!result.success) {
      setPrintLoading(false);
      setPrintPinVisible(false);
      toast.error(result.message || 'Unable to mark these prescriptions as printed.');
      return;
    }
    const selectedRxItems = reviewItems.filter((rx) => ids.includes(rxIdOf(rx)));
    const rows = await buildPrintRows(selectedRxItems);
    const html = buildPrescriptionPrintHtml({ patientDetails, doctorDetails, pharmacy: selectedPharmacy, rows });
    setPrintLoading(false);
    setPrintPinVisible(false);
    setPrintHtml(html);
  };

  const startPrint = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.warning('No prescriptions selected');
      return;
    }
    const pinFlag = await getItem('hasPinSetForTFA');
    if (pinFlag === 'true' || pinFlag === '1') {
      setPrintPinVisible(true);
    } else {
      finalizePrint(undefined);
    }
  };

  // ---- renders ----
  const pharmacyName = selectedPharmacy ? getPharmacyName(selectedPharmacy) : '';

  const renderSearchCard = () => (
    <View style={styles.card}>
      <View style={styles.searchTypeRow}>
        <View style={styles.searchTypePicker}>
          <OptionPicker
            value={searchType}
            options={['Medication', 'Supplies']}
            onChange={(value) => {
              if (!value) return;
              setSearchType(value);
              setMedResults([]);
              setSupplyResults([]);
              setHasSearched(false);
            }}
          />
        </View>
        <Pressable style={styles.customButton} onPress={() => openCustomSupply()}>
          <Feather name="plus" size={14} color={colors.white} />
          <Text style={styles.customButtonText}>Add Custom Supply</Text>
        </Pressable>
        <Pressable style={styles.customButton} onPress={() => openCustomCompound()}>
          <Feather name="plus" size={14} color={colors.white} />
          <Text style={styles.customButtonText}>Add Custom Compound</Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={adTokens.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${searchType} by Name`}
            placeholderTextColor={adTokens.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(1)}
          />
        </View>
        <Pressable
          style={[styles.searchButton, (isSearching || query.trim().length < MIN_SEARCH_LENGTH) && styles.disabled]}
          disabled={isSearching || query.trim().length < MIN_SEARCH_LENGTH}
          onPress={() => runSearch(1)}
        >
          <Text style={styles.searchButtonText}>Search</Text>
          {isSearching ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
        </Pressable>
      </View>
      {query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH ? <Text style={styles.hint}>Type at least 3 characters to search</Text> : null}
    </View>
  );

  const renderMedicationTab = () => {
    if (isSearching) return <ActivityIndicator color={adTokens.primary} style={styles.loader} />;
    if (!hasSearched) return <Text style={styles.hint}>Type at least 3 characters and tap Search</Text>;
    const list = searchType === 'Supplies' ? supplyResults : medResults;
    if (list.length === 0) return <Text style={styles.emptyLine}>No {searchType === 'Supplies' ? 'supplies' : 'medications'} found</Text>;
    return (
      <View style={styles.resultList}>
        {searchType === 'Supplies'
          ? supplyResults.map((item) => (
              <Pressable key={String(item.SupplyId)} style={styles.resultRow} onPress={() => openSupply(item)}>
                <View style={styles.resultIcon}>
                  <MaterialCommunityIcons name="package-variant" size={18} color={adTokens.primaryDark} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.resultName}>{item.Name || item.DisplayName}</Text>
                  <Text style={styles.resultMeta}>ID: {item.SupplyId}</Text>
                </View>
                <Feather name="plus-circle" size={22} color={adTokens.primaryDark} />
              </Pressable>
            ))
          : medResults.map((drug) => (
              <Pressable key={String(drug.DispensableDrugId)} style={styles.resultRow} onPress={() => openMedication(drug)} disabled={resolvingId != null}>
                <View style={styles.resultIcon}>
                  {resolvingId === drug.DispensableDrugId ? (
                    <ActivityIndicator size="small" color={adTokens.primary} />
                  ) : (
                    <MaterialCommunityIcons name="pill" size={18} color={adTokens.primaryDark} />
                  )}
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.resultName}>{drug.NameWithRouteDoseForm || drug.name || drug.DisplayName || 'N/A'}</Text>
                  <Text style={styles.resultMeta}>{drug.Strength || 'N/A'}</Text>
                </View>
                <Feather name="plus-circle" size={22} color={adTokens.primaryDark} />
              </Pressable>
            ))}
        {medPage.result && medPage.result.TotalPages > 1 ? (
          <View style={styles.pager}>
            <Pressable style={[styles.pageButton, medPage.page <= 1 && styles.disabled]} disabled={medPage.page <= 1} onPress={() => runSearch(medPage.page - 1)}>
              <Text style={styles.pageText}>Previous</Text>
            </Pressable>
            <Text style={styles.pageInfo}>
              Page {medPage.page} of {medPage.result.TotalPages}
            </Text>
            <Pressable
              style={[styles.pageButton, medPage.page >= medPage.result.TotalPages && styles.disabled]}
              disabled={medPage.page >= medPage.result.TotalPages}
              onPress={() => runSearch(medPage.page + 1)}
            >
              <Text style={styles.pageText}>Next</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderItems = () => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Items to prescribe ({items.length})</Text>
        {deletableIds.length > 0 ? (
          <Pressable
            style={styles.deleteAllButton}
            disabled={busyId === 'all'}
            onPress={() => confirmDelete(deletableIds, 'Are you sure you want to delete ALL prescriptions? This action cannot be undone.')}
          >
            {busyId === 'all' ? <ActivityIndicator size="small" color={colors.white} /> : <Feather name="trash-2" size={14} color={colors.white} />}
            <Text style={styles.deleteAllText}>Delete all items</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoadingItems && items.length === 0 ? (
        <ActivityIndicator color={adTokens.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.readyEmpty}>
          <MaterialCommunityIcons name="hand-pointing-up" size={34} color={adTokens.primaryDark} />
          <Text style={styles.readyTitle}>Ready to prescribe</Text>
          <Text style={styles.readyText}>Search and select medications from the panel above to add them to your prescription</Text>
        </View>
      ) : (
        <View style={styles.itemList}>
          {items.map((rx) => {
            const id = rxIdOf(rx);
            const mine = isCurrentAppointment(rx);
            const editable = mine && EDITABLE.has(statusKey(rx));
            return (
              <PrescriptionItemCard
                key={String(id)}
                rx={rx}
                canModify={mine}
                busy={busyId === id || benefitsLoading === id}
                onEdit={editable ? () => startEdit(rx) : undefined}
                onDelete={() => confirmDelete([id], `Delete ${rxNameOf(rx)}? This cannot be undone.`)}
                onBenefits={() => openBenefits(rx)}
              />
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <ContextHeader patient={patientDetails} doctor={doctorDetails} appointment={appointment} fallbackPatientName={patientName} />
      <StepBar currentIndex={stepIndex} />

      <ScrollView style={styles.flex1} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {stepIndex === 0 ? (
          <PharmacyPicker doseSpotPatientId={doseSpotPatientId} mode="select" selectedPharmacy={selectedPharmacy} onSelect={setSelectedPharmacy} onLoaded={onPharmaciesLoaded} />
        ) : null}

        {stepIndex === 1 ? (
          <>
            <View style={styles.pharmacyBanner}>
              <MaterialCommunityIcons name="store-outline" size={18} color={adTokens.primaryDark} />
              <View style={styles.flex1}>
                <Text style={styles.pharmacyBannerLabel}>Sending to</Text>
                <Text style={styles.pharmacyBannerText} numberOfLines={1}>
                  {pharmacyName}
                </Text>
              </View>
              <Pressable onPress={() => setStepIndex(0)} hitSlop={6}>
                <Text style={styles.linkText}>Change</Text>
              </Pressable>
            </View>

            {renderSearchCard()}

            {blockedDrugName ? (
              <Pressable style={styles.blockedBox} onPress={openEpcsModal}>
                <MaterialCommunityIcons name="shield-alert-outline" size={20} color={adTokens.dangerDark} />
                <Text style={styles.blockedText}>
                  {blockedDrugName} is a controlled substance. Complete your EPCS authorization (TFA + PIN) to add
                  it - tap to view status and finish the remaining steps.
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <SegmentedTabs
                tabs={tabs}
                activeKey={visibleTab}
                onChange={(key) => {
                  setActiveTab(key);
                  setManualTab(key !== 'medication-supplies');
                }}
                scrollable
                style={styles.tabBar}
              />
              <View style={styles.tabBody}>
                {visibleTab === 'medication-supplies' ? renderMedicationTab() : null}
                {visibleTab === 'clinic-presets' ? <FavoritesList source="clinic" pendingId={pendingFavoriteId} onUse={applyFavorite} /> : null}
                {visibleTab === 'favorites' ? (
                  <FavoritesList source="clinician" refreshKey={favoritesRefresh} pendingId={pendingFavoriteId} onUse={applyFavorite} />
                ) : null}
              </View>
            </View>

            {renderItems()}
          </>
        ) : null}

        {stepIndex === 2 ? (
          <>
            {sendResults ? (
              <View style={[styles.card, styles.resultsCard]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Send results</Text>
                  <Pressable onPress={() => setSendResults(null)} hitSlop={8}>
                    <Feather name="x" size={18} color={adTokens.textPrimary} />
                  </Pressable>
                </View>
                {sendResults.map((entry) => (
                  <View key={String(entry.id)} style={styles.resultLine}>
                    <Feather name={entry.ok ? 'check-circle' : 'alert-circle'} size={16} color={entry.ok ? adTokens.successDark : adTokens.danger} />
                    <Text style={[styles.resultLineText, { color: entry.ok ? adTokens.successDark : adTokens.danger }]}>
                      {entry.name}: {entry.message}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Review & Save ({reviewItems.length})</Text>
                {reviewItems.length > 0 ? (
                  <Pressable onPress={() => setSelectedIds(selectedIds.size === reviewItems.length ? new Set() : new Set(reviewItems.map(rxIdOf)))} hitSlop={6}>
                    <Text style={styles.linkText}>{selectedIds.size === reviewItems.length ? 'Clear selection' : 'Select all'}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.pharmacyLine}>
                <MaterialCommunityIcons name="store-outline" size={16} color={adTokens.primaryDark} />
                <Text style={styles.pharmacyLineText}>Pharmacy: {pharmacyName || '—'}</Text>
              </View>
              {isLoadingItems && reviewItems.length === 0 ? (
                <ActivityIndicator color={adTokens.primary} style={styles.loader} />
              ) : reviewItems.length === 0 ? (
                <Text style={styles.emptyLine}>No prescriptions are waiting to be sent.</Text>
              ) : (
                <View style={styles.itemList}>
                  {reviewItems.map((rx) => {
                    const id = rxIdOf(rx);
                    const effective = rxField(rx, 'EffectiveDate', 'effectiveDate');
                    return (
                      <View key={String(id)}>
                        <PrescriptionItemCard
                          rx={rx}
                          selectable
                          selected={selectedIds.has(id)}
                          onToggle={() => toggleSelected(id)}
                          canModify
                          busy={busyId === id || benefitsLoading === id}
                          onEdit={() => startEdit(rx)}
                          onDelete={() => confirmDelete([id], `Delete ${rxNameOf(rx)}? This cannot be undone.`)}
                          onBenefits={() => openBenefits(rx)}
                        />
                        {isPastDate(effective) ? <Text style={styles.pastText}>Effective date {formatDateOnly(effective)} is in the past</Text> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
        {stepIndex === 0 ? (
          <>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, !getPharmacyId(selectedPharmacy) && styles.disabled]} disabled={!getPharmacyId(selectedPharmacy)} onPress={() => setStepIndex(1)}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          </>
        ) : null}
        {stepIndex === 1 ? (
          <>
            <Pressable style={styles.iconButton} onPress={() => setStepIndex(0)}>
              <Feather name="arrow-left" size={18} color={adTokens.textPrimary} />
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, items.length === 0 && styles.disabled]} disabled={items.length === 0} onPress={() => setStepIndex(2)}>
              <Text style={styles.primaryButtonText}>Review Prescription</Text>
            </Pressable>
          </>
        ) : null}
        {stepIndex === 2 ? (
          <>
            <Pressable style={styles.iconButton} onPress={() => setStepIndex(1)}>
              <Feather name="arrow-left" size={18} color={adTokens.textPrimary} />
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Done</Text>
            </Pressable>
            <Pressable
              style={[styles.printButton, (printLoading || selectedIds.size === 0) && styles.disabled]}
              disabled={printLoading || selectedIds.size === 0}
              onPress={startPrint}
            >
              {printLoading ? (
                <ActivityIndicator size="small" color={adTokens.primaryDark} />
              ) : (
                <Feather name="printer" size={14} color={adTokens.primaryDark} />
              )}
              <Text style={styles.printButtonText}>Print</Text>
            </Pressable>
            {selectedControlledItems.length > 0 ? (
              <Pressable style={styles.epcsButton} onPress={startEpcsSend}>
                <Feather name="shield" size={14} color={colors.white} />
                <Text style={styles.primaryButtonText} numberOfLines={1}>
                  EPCS ({selectedControlledItems.length})
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.primaryButton, (isSending || selectedIds.size === 0) && styles.disabled]} disabled={isSending || selectedIds.size === 0} onPress={startSend}>
              <Text style={styles.primaryButtonText}>Send ({selectedIds.size})</Text>
              {isSending ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
            </Pressable>
          </>
        ) : null}
      </View>

      <MedicationFormModal
        visible={med.visible}
        drugName={med.drug?.DisplayName || med.drug?.NameWithRouteDoseForm}
        pharmacyName={pharmacyName}
        form={med.form}
        errors={medErrors}
        triedSubmit={med.tried}
        isEdit={Boolean(med.editingId)}
        saving={med.saving}
        onChange={changeMed}
        onSubmit={saveMedication}
        onClose={() => setMed(CLOSED_MED)}
      />
      <SupplyFormModal
        visible={supply.visible}
        isCustom={supply.isCustom}
        supplyName={supply.item?.Name}
        pharmacyName={pharmacyName}
        form={supply.form}
        triedSubmit={supply.tried}
        isEdit={Boolean(supply.editingId)}
        saving={supply.saving}
        onChange={changeSupply}
        onSubmit={saveSupply}
        onClose={() => setSupply(CLOSED_SUPPLY)}
      />
      <CompoundFormModal
        visible={compound.visible}
        pharmacyName={pharmacyName}
        form={compound.form}
        triedSubmit={compound.tried}
        isEdit={Boolean(compound.editingId)}
        saving={compound.saving}
        onChange={changeCompound}
        onSubmit={saveCompound}
        onClose={() => setCompound(CLOSED_COMPOUND)}
      />
      <PrescriptionBenefitsModal
        visible={benefitsModal.visible}
        patientId={doseSpotPatientId}
        ndc={benefitsModal.ndc}
        currentPrescription={benefitsModal.currentPrescription}
        onClose={() => setBenefitsModal({ visible: false, ndc: null, currentPrescription: null })}
        onReplace={handleReplaceMedication}
      />
      <EpcsWorkflowModal
        visible={epcsWorkflowVisible}
        doseSpotPatientId={doseSpotPatientId}
        appointmentId={appointmentId}
        prescriptions={selectedControlledItems.map((rx) => ({ id: rxIdOf(rx), name: rxNameOf(rx) }))}
        onClose={() => setEpcsWorkflowVisible(false)}
        onSent={() => {
          setEpcsWorkflowVisible(false);
          toast.success('Prescription signed and sent successfully.');
          loadItems();
        }}
      />
      <ProviderPinModal visible={pinVisible} loading={isSending} onConfirm={(pin) => sendNow(pendingSendIds, pin)} onClose={() => setPinVisible(false)} />
      <ProviderPinModal
        visible={printPinVisible}
        loading={printLoading}
        actionLabel="Authorize & Print"
        onConfirm={(pin) => finalizePrint(pin)}
        onClose={() => setPrintPinVisible(false)}
      />
      <PrescriptionPrintPreviewModal visible={Boolean(printHtml)} html={printHtml} onClose={() => setPrintHtml(null)} />
      <PastDateWarningModal
        visible={pastDateRows.length > 0}
        prescriptions={pastDateRows.map((rx) => ({ ...rx, medicationDisplayName: rxNameOf(rx) }))}
        formatDate={formatDateOnly}
        onEdit={(rx) => {
          setPastDateRows([]);
          startEdit(rx);
        }}
        onClose={() => setPastDateRows([])}
      />
      <EPCSAuthorizationRequiredModal
        visible={epcsModalVisible}
        tfaCompleted={epcsTfaCompleted}
        pinSet={epcsPinSet}
        onClose={() => setEpcsModalVisible(false)}
        onPinSet={() => setEpcsPinSet(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FB' },
  flex1: { flex: 1 },
  loader: { paddingVertical: 18 },
  disabled: { opacity: 0.5 },

  context: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  contextTitle: { fontSize: 15, fontWeight: '800', color: adTokens.textPrimary },
  contextSub: { fontSize: 13, color: adTokens.textSecondary, marginTop: 2 },
  contextBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, gap: 3, borderTopWidth: 1, borderTopColor: adTokens.border },
  contextLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, color: adTokens.primaryDark, textTransform: 'uppercase' },
  contextGap: { marginTop: 10 },
  contextName: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
  contextLine: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  contextIconLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  contextBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  contextBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  contextBadgeInfo: { backgroundColor: adTokens.infoLight },
  contextBadgeTextInfo: { fontSize: 11.5, fontWeight: '700', color: adTokens.infoDark },
  contextBadgeNeutral: { backgroundColor: adTokens.gray100 },
  contextBadgeTextNeutral: { fontSize: 11.5, fontWeight: '700', color: adTokens.textSecondary },
  contextBadgeWarning: { backgroundColor: adTokens.warningLight },
  contextBadgeTextWarning: { fontSize: 11.5, fontWeight: '700', color: adTokens.warningDark },

  stepBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  stepItem: { alignItems: 'center', width: 84, gap: 6 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: adTokens.white, borderWidth: 2, borderColor: adTokens.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  stepDotDone: { backgroundColor: adTokens.successDark, borderColor: adTokens.successDark },
  stepDotText: { fontSize: 13, fontWeight: '800', color: adTokens.textSecondary },
  stepDotTextActive: { color: colors.white },
  stepLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, textAlign: 'center' },
  stepLabelActive: { color: adTokens.textPrimary, fontWeight: '800' },
  stepConnector: { flex: 1, height: 2, marginTop: 15, borderRadius: 1, backgroundColor: adTokens.border },
  stepConnectorDone: { backgroundColor: adTokens.successDark },

  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: adTokens.textPrimary },
  hint: { fontSize: 13, color: adTokens.textSecondary },
  emptyLine: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 10 },
  linkText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },

  pharmacyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: adTokens.primaryLight },
  pharmacyBannerLabel: { fontSize: 11.5, fontWeight: '700', color: adTokens.textSecondary },
  pharmacyBannerText: { fontSize: 14, fontWeight: '800', color: adTokens.primaryDark },

  searchTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  searchTypePicker: { flex: 1 },
  customButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: adTokens.primary },
  customButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary },
  searchButton: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: adTokens.primary },
  buttonSpinner: { marginLeft: 8 },
  searchButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },

  blockedBox: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: adTokens.dangerLight, borderWidth: 1, borderColor: '#FECACA' },
  blockedText: { flex: 1, fontSize: 13, color: adTokens.dangerDark, lineHeight: 18 },

  tabBar: { marginBottom: 10 },
  tabBody: { gap: 10 },

  resultList: { gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  resultIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  resultName: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  resultMeta: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: adTokens.primary },
  pageText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pageInfo: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },

  deleteAllButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: adTokens.danger },
  deleteAllText: { fontSize: 12.5, fontWeight: '700', color: colors.white },
  readyEmpty: { alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 16 },
  readyTitle: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  readyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', lineHeight: 18 },
  itemList: { gap: 12 },

  resultsCard: { borderColor: '#BFDBFE' },
  resultLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  resultLineText: { flex: 1, fontSize: 13 },
  pharmacyLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pharmacyLineText: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  pastText: { fontSize: 12.5, color: adTokens.warningDark, marginTop: 4, marginLeft: 4 },

  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border, backgroundColor: adTokens.white },
  iconButton: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  epcsButton: { flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, backgroundColor: adTokens.dangerDark },
  printButton: { flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: adTokens.primary },
  printButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  primaryButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: adTokens.primary },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
  secondaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
});
