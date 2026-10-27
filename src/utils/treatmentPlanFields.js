// Field/status helpers for the treatment-plan detail screen - ports of the module-level helpers
// in AllyDocReactApp's module/Doctor/Pages/DoctorTreatmentPlan/DoctorTreatmentDetail.jsx.

const joinNameParts = (...parts) =>
  parts
    .map((part) => (part == null || part === '' ? '' : String(part).trim()))
    .filter(Boolean)
    .join(' ');

/** Prefer the split API name fields; fall back to the legacy single name fields. */
export function getPatientFullNameFromDetail(detail) {
  if (!detail) return '';
  const fromParts = joinNameParts(
    detail.patientFirstName ?? detail.patient_first_name,
    detail.patientMiddleName ?? detail.patient_middle_name,
    detail.patientLastName ?? detail.patient_last_name,
  );
  if (fromParts) return fromParts;
  return String(detail.patientName || detail.name || '').trim();
}

export function getDoctorFullNameFromDetail(detail) {
  if (!detail) return '';
  const doc = detail.doctor || {};
  const fromParts = joinNameParts(
    detail.doctorFirstName ?? detail.doctor_first_name,
    detail.doctorMiddleName ?? detail.doctor_middle_name,
    detail.doctorLastName ?? detail.doctor_last_name,
  );
  if (fromParts) return fromParts;
  return String(
    detail.doctorName || detail.doctor_name || doc.name || doc.fullName || doc.doctorName || '',
  ).trim();
}

/** DoseSpot statuses arrive as words or numbers, in any casing/spacing - compare on this key. */
export const normalizeDoseSpotStatusKey = (status) =>
  String(status || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .trim();

const PATIENT_VISIBLE_PRESCRIPTION_STATUSES = new Set([
  'erxsent',
  '4',
  'requested',
  '8',
  'epcssigned',
  '11',
  'pharmacyverified',
  '13',
]);

/** A patient only ever sees prescriptions that have actually been sent / requested. */
export const isPatientVisiblePrescriptionStatus = (status) =>
  PATIENT_VISIBLE_PRESCRIPTION_STATUSES.has(normalizeDoseSpotStatusKey(status));

const isTruthyFlag = (value) =>
  value === true || value === 1 || String(value || '').toLowerCase().trim() === 'true' || String(value || '').trim() === '1';

export function getRenewalPrescriptionLabel(rx) {
  if (!isTruthyFlag(rx?.isRxRenewal ?? rx?.IsRxRenewal)) return null;
  switch (normalizeDoseSpotStatusKey(rx?.status ?? rx?.Status)) {
    case 'requested':
    case '7':
      return 'Renewal Request';
    case 'erxsent':
    case '4':
    case 'pharmacyverified':
    case '13':
      return 'Renewal Approved';
    case 'error':
    case '6':
      return 'Renewal Failed';
    case 'deleted':
    case '5':
      return 'Renewal Cancelled';
    default:
      return 'Renewal';
  }
}

export function getCancellationStatusLabel(status) {
  switch (normalizeDoseSpotStatusKey(status)) {
    case '6':
    case 'cancelrequested':
    case 'cancellationrequested':
      return 'CancelRequested';
    case '7':
    case 'cancelpending':
    case 'pendingpharmacyresponse':
      return 'CancelPending';
    case '8':
    case 'cancelled':
      return 'Cancelled';
    case '9':
    case 'canceldenied':
    case 'cancellationdenied':
      return 'CancelDenied';
    default:
      return null;
  }
}

/** Badge tone for a prescription status (web getAppointmentTabStatusButton's bootstrap classes). */
export function getPrescriptionStatusTone(status) {
  switch (normalizeDoseSpotStatusKey(status)) {
    case 'entered':
    case 'sending':
    case 'requested':
      return 'info';
    case 'edited':
      return 'primary';
    case 'readytosign':
    case '6':
    case 'cancelrequested':
    case 'cancellationrequested':
    case '7':
    case 'cancelpending':
    case 'pendingpharmacyresponse':
      return 'warning';
    case 'erxsent':
    case 'sent':
    case 'epcssigned':
    case 'pharmacyverified':
      return 'success';
    case 'error':
    case 'epcserror':
    case 'deleted':
    case '8':
    case 'cancelled':
    case '9':
    case 'canceldenied':
    case 'cancellationdenied':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Normalises one `prescriptions[]` row of /TreatmentPlanDetails (it mixes camel/Pascal casing). */
export function normalizePrescriptionRow(item) {
  return {
    ...item,
    PrescriptionId:
      item.PrescriptionId ??
      item.prescriptionId ??
      item.doseSpotPrescriptionId ??
      item.DoseSpotPrescriptionId ??
      item.id ??
      null,
    WrittenDate: item.WrittenDate ?? item.writtenDate ?? item.EffectiveDate,
    medicationDisplayName:
      item.medicationDisplayName ?? item.MedicationDisplayName ?? item.DisplayName ?? item.DrugName ?? '',
    DispensableDrugId: item.DispensableDrugId ?? item.dispensableDrugId ?? null,
    SupplyId: item.SupplyId ?? item.supplyId ?? null,
    DaysSupply: item.DaysSupply ?? item.daysSupply ?? null,
    Quantity: item.Quantity ?? item.quantity ?? null,
    Refills: item.Refills ?? item.refills ?? '0',
    Type: item.Type ?? item.type ?? 'Coded',
    prescriptionType: item.prescriptionType ?? item.PrescriptionType ?? null,
    compoundDescription: item.compoundDescription ?? item.CompoundDescription ?? null,
    compoundIngredientsJson: item.compoundIngredientsJson ?? item.CompoundIngredientsJson ?? null,
    MedicationStatus: item.MedicationStatus ?? item.medicationStatus,
    DrugName: item.DisplayName || item.DrugName || item.drugName || item.Drug || '',
    Status: item.Status || item.status || 'Unknown',
    PharmacyId: item.PharmacyId ?? item.pharmacyId ?? item.PharmacyID ?? item.pharmacyID ?? null,
  };
}

export function parseCompoundIngredients(rx) {
  const raw = rx?.compoundIngredientsJson ?? rx?.CompoundIngredientsJson ?? null;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** The ids of every dispensable drug a row refers to (its own plus compound ingredients'). */
export function getDrugIdsForRow(rx) {
  const direct = rx?.dispensableDrugId ?? rx?.DispensableDrugId;
  const ingredientIds = parseCompoundIngredients(rx).map((ing) => ing?.DispensableDrugId ?? ing?.dispensableDrugId);
  return [direct, ...ingredientIds].filter((id) => id != null && id !== '' && Number(id) > 0).map(String);
}

/**
 * Display label of a prescription's medication (web getTreatmentPlanMedicationLabel):
 * the resolved drug name when known (`drugNames` is { [drugId]: name|null }), else the row's own
 * display name / compound description. Returns null while a name is still being resolved.
 */
export function getMedicationLabel(rx, drugNames) {
  const prescriptionType = String(rx.prescriptionType ?? rx.PrescriptionType ?? '').toLowerCase().trim();
  const compoundDescription = String(rx.compoundDescription ?? rx.CompoundDescription ?? '').trim();
  const medDisplay = String(rx.medicationDisplayName ?? rx.MedicationDisplayName ?? '').trim();
  const fallback = medDisplay || (prescriptionType === 'compiledcompound' ? compoundDescription : '') || '';
  const drugId = rx.dispensableDrugId ?? rx.DispensableDrugId;
  if (drugId != null && drugId !== '' && Number(drugId) > 0) {
    const key = String(drugId);
    if (!Object.prototype.hasOwnProperty.call(drugNames, key)) return null;
    return drugNames[key] || fallback || 'N/A';
  }
  return fallback || rx.DrugName || 'N/A';
}

export const naText = (value) => (value === null || value === undefined || value === '' ? 'N/A' : String(value));
