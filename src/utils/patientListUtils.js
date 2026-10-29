/** Port of AllyDocReactApp/src/module/Doctor/Pages/DoctorPatients/utils.js
 * and the parsePagedListResponse helper in
 * src/components/sharedDoctorPatientFilterModal/DoctorPatientFilterModal.jsx. */

function getRowValue(row, keys, fallback = '') {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return fallback;
}

function padTwo(n) {
  return String(n).padStart(2, '0');
}

export function formatListDob(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'N/A';

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${padTwo(d.getDate())}/${padTwo(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  const part = String(raw).split('T')[0].trim();
  const isoMatch = part.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  const slashMatch = part.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) return `${slashMatch[1]}/${slashMatch[2]}/${slashMatch[3]}`;

  return part || 'N/A';
}

export function formatListGender(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'N/A';
  const s = String(raw).trim().toLowerCase();
  if (s === 'male' || s === 'm') return 'Male';
  if (s === 'female' || s === 'f') return 'Female';
  if (s === 'other') return 'Other';
  if (s === 'both') return 'Both';
  return String(raw).trim();
}

function buildFullName(row) {
  const firstName = String(getRowValue(row, ['firstName', 'FirstName'], '')).trim();
  const middleName = String(getRowValue(row, ['middleName', 'MiddleName'], '')).trim();
  const lastName = String(getRowValue(row, ['lastName', 'LastName'], '')).trim();
  return [firstName, middleName, lastName].filter(Boolean).join(' ') || 'N/A';
}

export function normalizeFreelancerPatient(row) {
  const fullName = buildFullName(row);
  const active = row?.isProfileCreated ?? row?.IsProfileCreated ?? row?.active ?? row?.Active;
  const profileStatusLabel =
    getRowValue(row, ['profileStatusLabel', 'ProfileStatusLabel'], '') ||
    (active === true || active === 'true' || active === 1 ? 'Profile Created' : 'Not Registered');

  return {
    userId: getRowValue(row, ['userId', 'UserId', 'patientId', 'PatientId', 'id', 'Id'], ''),
    fullName,
    email: getRowValue(row, ['email', 'Email'], 'N/A'),
    phoneNumber: getRowValue(row, ['phoneNumber', 'PhoneNumber'], 'N/A'),
    profilePicture: getRowValue(row, ['profilePicture', 'ProfilePicture', 'profileImage', 'ProfileImage'], ''),
    gender: formatListGender(getRowValue(row, ['gender', 'Gender'], '')),
    dob: formatListDob(getRowValue(row, ['dob', 'Dob', 'DOB', 'dateOfBirth', 'DateOfBirth'], '')),
    age: getRowValue(row, ['age', 'Age'], 'N/A'),
    doseSpotRefrenceId: getRowValue(
      row,
      ['doseSpotRefrenceId', 'DoseSpotRefrenceId', 'doseSpotReferenceId', 'DoseSpotReferenceId', 'doseSpotId', 'DoseSpotId'],
      'N/A',
    ),
    profileStatusLabel,
    hospitalName: getRowValue(row, ['hospitalName', 'HospitalName'], ''),
  };
}

/** Port of the row shape rendered by AllyDocReactApp's Doctors/index.jsx list
 * (GET /GetListOfDoctors) - a clinic/hospital admin's sub-doctors. */
export function normalizeDoctor(row) {
  const firstName = String(getRowValue(row, ['FirstName', 'firstName'], '')).trim();
  const lastName = String(getRowValue(row, ['LastName', 'lastName'], '')).trim();
  const fullName = `${firstName} ${lastName}`.trim() || getRowValue(row, ['FullName', 'fullName'], 'N/A');
  const roleNameRaw = getRowValue(row, ['roleName', 'RoleName'], '');
  const roleLabel = String(roleNameRaw).toLowerCase().trim() === 'doctor admin' ? 'Clinic Admin' : roleNameRaw || 'Doctor';

  return {
    userId: getRowValue(row, ['userId', 'UserId', 'id', 'Id'], ''),
    fullName,
    email: getRowValue(row, ['email', 'Email'], 'N/A'),
    phoneNumber: getRowValue(row, ['phoneNumber', 'PhoneNumber', 'phoneNo', 'PhoneNo'], 'N/A'),
    profilePicture: getRowValue(row, ['profilePicture', 'ProfilePicture', 'profileImage', 'ProfileImage'], ''),
    gender: formatListGender(getRowValue(row, ['gender', 'Gender'], '')),
    dob: formatListDob(
      getRowValue(row, ['DateOfBirth', 'dateOfBirth', 'Dob', 'dob', 'DOB', 'BirthDate', 'birthDate'], ''),
    ),
    specializationName: getRowValue(row, ['specializationName', 'SpecializationName', 'specialization'], ''),
    roleLabel,
    doseSpotRefrenceId: getRowValue(
      row,
      ['doseSpotRefrenceId', 'DoseSpotRefrenceId', 'doseSpotReferenceId', 'DoseSpotReferenceId'],
      'N/A',
    ),
  };
}

export function formatProfileStatus(patient) {
  const profileStatusLabel = patient.profileStatusLabel?.toLowerCase().trim();
  return profileStatusLabel === 'profile created' ? 'Registered' : 'Not registered';
}

const INNER_LIST_KEYS = ['data', 'items', 'list', 'records', 'patients', 'Patients', 'doctors', 'Doctors', 'subDoctors', 'result', 'results'];

/** `response` here is the already-unwrapped global envelope ({success,data,...}
 * from callApi()), one level shallower than the web's raw axios response. */
export function parsePagedListResponse(response, fallbackPage, fallbackPageSize) {
  const empty = { list: [], totalPages: 0, page: fallbackPage, totalRecords: 0 };
  if (!response.success) return empty;

  const inner = response.data;
  let list = [];
  if (Array.isArray(inner)) list = inner;
  else if (inner && typeof inner === 'object') {
    for (const key of INNER_LIST_KEYS) {
      if (Array.isArray(inner[key])) {
        list = inner[key];
        break;
      }
    }
  }

  const totalRecords = Number(inner?.totalRecords ?? inner?.totalCount ?? list.length) || 0;
  const pageSize = Number(inner?.pageSize ?? fallbackPageSize) || fallbackPageSize || 10;
  const page = Number(inner?.page ?? inner?.pageNumber ?? fallbackPage) || fallbackPage;
  let totalPages = Number(inner?.totalPages) || 0;
  if (pageSize > 0 && totalRecords > 0 && totalPages < 1) {
    totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  }
  return { list, totalPages, page, totalRecords };
}

/** Port of normalizePatientForList in the web's module/Doctor/Pages/Patients/index.jsx - the row
 * shape of GET /GetListOfPatients (hospital/clinic doctors), which uses different keys than
 * /FreelancerDoctorPatients. Returns the same shape as normalizeFreelancerPatient so one list UI
 * renders both. */
export function normalizeClinicPatient(row) {
  const firstName = String(getRowValue(row, ['FirstName', 'firstName', 'firstname'], '')).trim();
  const lastName = String(getRowValue(row, ['LastName', 'lastName', 'lastname'], '')).trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const active = row?.Active ?? row?.active;

  return {
    userId: getRowValue(row, ['PatientId', 'patientId', 'userId', 'id', 'Id'], ''),
    fullName: fullName || getRowValue(row, ['PatientName', 'patientName', 'name'], 'N/A'),
    email: getRowValue(row, ['Email', 'email'], 'N/A'),
    phoneNumber: getRowValue(row, ['PhoneNumber', 'phoneNumber', 'MobileNo', 'mobileNo'], 'N/A'),
    profilePicture: getRowValue(row, ['profileImage', 'ProfileImage', 'profilePicture', 'ProfilePicture'], ''),
    gender: formatListGender(getRowValue(row, ['Gender', 'gender', 'Sex', 'sex'], '')),
    dob: formatListDob(
      getRowValue(row, ['DateOfBirth', 'dateOfBirth', 'Dob', 'dob', 'DOB', 'BirthDate', 'birthDate'], ''),
    ),
    age: getRowValue(row, ['age', 'Age'], 'N/A'),
    doseSpotRefrenceId: getRowValue(row, ['doseSpotRefrenceId', 'DoseSpotRefrenceId', 'DoseSpotReferenceId'], 'N/A'),
    profileStatusLabel:
      getRowValue(row, ['profileStatusLabel', 'ProfileStatusLabel'], '') ||
      (active === true || active === 'true' || active === 1 ? 'Profile Created' : 'Not Registered'),
    hospitalName: getRowValue(row, ['hospitalName', 'HospitalName'], ''),
  };
}
