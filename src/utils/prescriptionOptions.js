// Option lists of web's AddPrescription step (module/Doctor/Pages/Patients/Prescriptions/steps/AddPrescription.jsx).

export const DOSE_DELIVERY_METHODS = [
  'Administer', 'Apply', 'Chew', 'Dilute', 'Discontinue', 'Dissolve', 'Finish', 'Follow', 'Give', 'Implant',
  'Inhale', 'Inject', 'Insert', 'Instill', 'Place', 'Push', 'Shampoo', 'Sniff', 'Spray', 'Sprinkle', 'Suck',
  'Swallow', 'Swish', 'Swish And Swallow', 'Take', 'Use', 'Wash',
];

export const DOSE_FORMS = [
  'Capsule', 'Cartridge', 'Gram', 'Kit', 'Lozenge', 'Milliliter', 'Unspecified', 'Packet', 'Suppository', 'Tablet',
  'Patch', 'Each', 'Gum', 'Disk', 'Film', 'Implant', 'Insert', 'Pad', 'Ring', 'Stick', 'Strip', 'Swab', 'Tampon',
  'Troche', 'Wafer', 'Pen Needle', 'Device', 'Powder', 'Concentrate', 'Solution', 'Liquid',
];

export const ROUTES_OF_ADMINISTRATION = [
  'Otic', 'Epidural', 'Hemodialysis', 'Intramuscular', 'Intratympanic', 'Intraspinal', 'Intravitreal', 'Intraocular',
  'Implant', 'Enteral', 'Periarticular', 'Vaginal', 'Urethral', 'Intra-arterial', 'Extracorporeal', 'Perfusion',
  'Mouth/Throat', 'Oral', 'Rectal', 'Sublingual', 'Subcutaneous', 'Intradermal', 'Buccal', 'Inhalation',
  'Intra-articular', 'Intravenous', 'Intratracheal', 'Iontophoresis', 'Translingual', 'Dental', 'Combination',
  'Irrigation', 'Intrathecal', 'Intralesional', 'Intracavernosal', 'Intrauterine', 'Intraperitoneal',
  'Does Not Apply', 'Obsolete Lexi Route', 'External', 'Intrapleural', 'Nasal', 'Transdermal', 'Injection',
  'Ophthalmic', 'In Vitro', 'Ureteral', 'Intravesical', 'Intraventricular',
];

export const FREQUENCIES = [
  '(1XONLY) 1 Time Only', '(QD) Daily', '(BID2) 2 Times Daily', '(TID) 3 Times Daily', '(QID) 4 Times Daily',
  '(Q4H) Every 4 Hours', '(Q6H) Every 6 Hours', '(Q8H) Every 8 Hours', '(Q12H) Every 12 Hours', '(QOD) Every Other Day',
  '(OTHER) Other', '(Q12D) 1 To 2 Times Daily', '(15MINAC) 15 Minutes Before Meals', '(Q23D) 2 To 3 Times Daily',
  '(TIDPC) 3 Times Daily After Meals', '(TIDP) 3 Times Daily As Needed', '(TIDAC) 3 Times Daily Before Meals',
  '(TIDW) 3 Times Daily With Food', '(TIDWM) 3 Times Daily With Meals',
  '(T4DWM) 3 Times Weekly 4 Times Daily 30 Min Before Meals And Bed', '(QIDP) 4 Times Daily As Needed',
  '(QIDACHS) 4 Times Daily Before Meals And At Bedtime', '(4XWK) 4 Times Weekly', '(Q46D) 4 To 6 Times Daily',
  '(5XD) 5 Times Daily', '(PC&HS) After Meals And At Bedtime', '(ADBP) As Directed By Physician', '(PRN) As Needed',
  '(QHS) At Bedtime', '(QHSP) At Bedtime As Needed', '(ACHS) Before Meals And At Bedtime', '(QDP) Daily As Needed',
  '(QDX5DA) Daily For 5 Days', '(QDE) Daily On Empty Stomach', '(QDW) Daily With Food', '(Q12HP) Every 12 Hours As Needed',
  '(Q12HX2DOSES) Every 12 Hours For 2 Doses', '(Q12HE) Every 12 Hours On Empty Stomach', '(Q12HW) Every 12 Hours With Food',
  '(Q15MINMRX5) Every 15 Min, May Repeat 5 Times', '(GQ2W) Every 2 Weeks', '(Q3D) Every 3 Days', '(Q3H) Every 3 Hours',
  '(Q3HWAX7D) Every 3 Hours While Awake (6 Doses) For 7 Days', '(Q36H) Every 3 To 6 Hours', '(Q36HP) Every 3 To 6 Hours As Needed',
  '(Q30MINP) Every 30 Minutes As Needed', '(Q4HPPC) Every 4 Hours After Meals', '(Q4HP) Every 4 Hours As Needed',
  '(Q4HWA) Every 4 Hours While Awake', '(Q4-6H) Every 4 To 6 Hours', '(Q46HP) Every 4 To 6 Hours As Needed',
  '(Q6HP) Every 6 Hours As Needed', '(Q6HE) Every 6 Hours On Empty Stomach', '(Q6HW) Every 6 Hours With Food',
  '(Q68H) Every 6 To 8 Hours', '(Q68HP) Every 6 To 8 Hours As Needed', '(Q8HP) Every 8 Hours As Needed',
  '(Q8HE) Every 8 Hours On An Empty Stomach', '(Q812H) Every 8 To 12 Hours', '(Q812HP) Every 8 To 12 Hours As Needed',
  '(QAM) Every Morning', '(QAMP) Every Morning As Needed', '(QW) Every Week', '(STATREPEAT) Now And Repeat 1 Time',
  '(NOW1Q24H) Now, Then 1 Every 24 Hours', '(STATR2HP) Now. May Repeat In 2 Hours As Needed', '(ONCEDAILY) Once Daily',
  '(QDHS) Once In The Evening', '(Q12DX23WQOD) Once Or Twice Daily For 2 To 3 Weeks Then Every Other Day Thereafter',
  '(Q12DX7D) Once Or Twice Daily For 7 Days', '(BID) Twice Daily', '(BIDP) Twice Daily As Needed', '(BIDW) Twice Daily With Food',
  '(BIDWATER) Twice Daily With Water', '(2XW) Twice Weekly', '(2XWKX6M) Twice Weekly For 6 Months', '(D) With Dinner',
  '(QMS) With Each Meal Or Snack',
];

export const PHARMACY_NOTE_OPTIONS = ['Acute Pain', 'Hospice', 'Non-Acute Pain', 'PDMP Reviewed', 'Shipping'];

// Web PRESCRIPTION_FIELD_LIMITS (components/ui/CharacterCount.jsx).
export const FIELD_LIMITS = { directions: 1000, pharmacyNotes: 210 };

const FREQUENCY_MULTIPLIER = {
  '1XONLY': 1, QD: 1, ONCEDAILY: 1, QAM: 1, QHS: 1, QDP: 1, QDE: 1, QDW: 1, QDHS: 1,
  BID: 2, BID2: 2, BIDP: 2, BIDW: 2, BIDWATER: 2,
  TID: 3, TIDPC: 3, TIDP: 3, TIDAC: 3, TIDW: 3, TIDWM: 3,
  QID: 4, QIDP: 4, QIDACHS: 4, '5XD': 5,
  Q4H: 6, Q4HP: 6, Q4HWA: 6, Q4HPPC: 6, Q6H: 4, Q6HP: 4, Q6HE: 4, Q6HW: 4,
  Q8H: 3, Q8HP: 3, Q8HE: 3, Q12H: 2, Q12D: 1.5, Q12HP: 2, Q12HE: 2, Q12HW: 2,
  QOD: 0.5, QDX5DA: 1, PRN: 1, Q3D: 1 / 3, Q3H: 8, QW: 1 / 7, '2XW': 2 / 7, '4XWK': 4 / 7, GQ2W: 1 / 14,
  STATREPEAT: 2, NOW1Q24H: 1, D: 1, QMS: 3,
};

/** Web mapFrequencyToMultiplier: how many doses a day a frequency means (for the total-dispense calculation). */
export function frequencyMultiplier(frequency) {
  if (!frequency) return 1;
  const code = frequency.match(/\(([^)]+)\)/)?.[1] || '';
  return FREQUENCY_MULTIPLIER[code] || 1;
}

/** Web "SIG builder": directions text generated from the delivery method / quantity / form / route / frequency / days. */
export function buildDirections({ doseDeliveryMethod, doseQuantity, doseForm, routeOfAdministration, frequency, daySupply }) {
  let directions = '';
  if (doseDeliveryMethod) directions += `${doseDeliveryMethod} `;
  if (doseQuantity) directions += `${doseQuantity} `;
  if (doseForm) directions += `${doseForm.toLowerCase()} `;
  if (routeOfAdministration) directions += `${routeOfAdministration.toLowerCase()}, `;
  if (frequency) directions += `${frequency.includes(')') ? frequency.split(')')[1].trim() : frequency} `;
  if (daySupply) directions += `for ${daySupply} days`;
  return directions.trim().slice(0, FIELD_LIMITS.directions);
}

/** Web normalizeQuantityLeadingDecimal: ".5" -> "0.5". */
export const normalizeQuantity = (value) => (String(value).startsWith('.') ? `0${value}` : value);
