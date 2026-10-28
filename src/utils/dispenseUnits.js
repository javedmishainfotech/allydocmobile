// DoseSpot dispense-unit ids (web: dispenseUnitIdToNameMap in PrescriptionDetailModal / AddPrescription).
export const DISPENSE_UNIT_NAMES = {
  4: 'Capsule',
  8: 'Gram',
  11: 'Kit',
  13: 'Lozenge',
  15: 'Milliliter',
  19: 'Unspecified',
  21: 'Packet',
  23: 'Suppository',
  26: 'Tablet',
  28: 'Patch',
  32: 'Each',
  33: 'Gum',
  35: 'Applicator',
  39: 'Blister',
  44: 'Caplet',
  52: 'Film',
  54: 'Implant',
  57: 'Insert',
  64: 'Pad',
  70: 'Ring',
  73: 'Sponge',
  75: 'Stick',
  76: 'Strip',
  77: 'Swab',
  81: 'Troche',
  82: 'Wafer',
  83: 'Pen Needle',
  90: 'Lancet',
};

export const DISPENSE_UNIT_OPTIONS = Object.entries(DISPENSE_UNIT_NAMES)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** null means "show —" (no id at all), same as web's formatDispenseUnitIdToLabel. */
export function formatDispenseUnit(rawId) {
  if (rawId === null || rawId === undefined || (typeof rawId === 'string' && rawId.trim() === '')) return null;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return 'Unspecified';
  return DISPENSE_UNIT_NAMES[id] ?? 'Unspecified';
}

// Web DoctorTreatmentDetail CANCELABLE_* sets: a sent, active prescription can be cancelled (with a reason).
export const CANCELABLE_PRESCRIPTION_STATUSES = new Set(['erxsent', '4', 'pharmacyverified', '13']);
export const CANCELABLE_MEDICATION_STATUSES = new Set(['active', '1']);
