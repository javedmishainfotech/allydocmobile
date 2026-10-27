/**
 * Port of AllyDocReactApp/src/utils/appointmentListApi.js (the doctor-side parts): the query
 * string for `GET /AllDoctorAppointment`, the response parser, and the status-filter helpers.
 * Kept line-for-line in behaviour so the same filters return the same rows as the web.
 */

/**
 * A bare "YYYY-MM-DD" from a date picker is the viewer's own LOCAL calendar day. The backend
 * filters the real AppointmentStartUtc instant, so the day is converted to UTC instants:
 * `fromDate` = local midnight at the start of that day, `toDate` = EXCLUSIVE local midnight at
 * the start of the NEXT day (covers the whole selected day). This makes "today" mean the same
 * thing whatever timezone the viewer is in.
 */
function toUtcDateRangeParams(fromDate, toDate) {
  const toUtcIso = (year, month, day) => new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
  let fromDateUtc = null;
  let toDateUtc = null;

  if (fromDate) {
    const [year, month, day] = String(fromDate).split('-').map(Number);
    if (year && month && day) fromDateUtc = toUtcIso(year, month, day);
  }
  if (toDate) {
    const [year, month, day] = String(toDate).split('-').map(Number);
    if (year && month && day) toDateUtc = toUtcIso(year, month, day + 1);
  }
  return { fromDateUtc, toDateUtc };
}

/** filter.status can be a legacy string or a multi-select array; 'all' / empty means "no filter". */
export function normalizeStatusFilter(value) {
  if (Array.isArray(value)) {
    return value
      .map((status) => String(status ?? '').trim().toLowerCase())
      .filter((status) => status && status !== 'all');
  }
  const single = String(value ?? '').trim().toLowerCase();
  if (!single || single === 'all') return [];
  return [single];
}

export function hasActiveStatusFilter(value) {
  return normalizeStatusFilter(value).length > 0;
}

/** Human-readable label for empty states ("in progress, rescheduled"). */
export function formatStatusFilterLabel(value) {
  return normalizeStatusFilter(value)
    .map((status) => (status === 'inprogress' ? 'in progress' : status))
    .join(', ');
}

/** `GET /PatientAppointments` query: PatientId + repeated AppointmentStatus + UTC date range +
 * doctorId. Not paged by the server - the web slices the full list on the client (see
 * paginateList). Statuses are sent unchanged, "rescheduled" included. */
export function buildPatientAppointmentsQuery(patientId, filter = {}) {
  const params = new URLSearchParams();
  params.append('PatientId', String(patientId));

  normalizeStatusFilter(filter?.status).forEach((status) => params.append('AppointmentStatus', status));

  const fromDate = filter?.fromDate != null ? String(filter.fromDate).trim() : '';
  const toDate = filter?.toDate != null ? String(filter.toDate).trim() : '';
  const doctorId = filter?.doctorId != null ? String(filter.doctorId).trim() : '';
  const { fromDateUtc, toDateUtc } = toUtcDateRangeParams(fromDate, toDate);
  if (fromDateUtc) params.append('fromDate', fromDateUtc);
  if (toDateUtc) params.append('toDate', toDateUtc);
  if (doctorId) params.append('doctorId', doctorId);
  return params.toString();
}

/** `GET /AllTreatmentPlanListV2` query: repeated Status + UTC date range + doctorId + PatientId + paging
 * (web: buildTreatmentPlanListQueryParams). A patient filters by doctor, a doctor by patient. */
export function buildTreatmentPlanListQuery(filter = {}) {
  const params = new URLSearchParams();
  normalizeStatusFilter(filter?.status).forEach((status) => params.append('Status', status));

  const fromDate = filter?.fromDate != null ? String(filter.fromDate).trim() : '';
  const toDate = filter?.toDate != null ? String(filter.toDate).trim() : '';
  const doctorId = filter?.doctorId != null ? String(filter.doctorId).trim() : '';
  const patientId = filter?.patientId != null ? String(filter.patientId).trim() : '';
  const { fromDateUtc, toDateUtc } = toUtcDateRangeParams(fromDate, toDate);
  if (fromDateUtc) params.append('fromDate', fromDateUtc);
  if (toDateUtc) params.append('toDate', toDateUtc);
  if (doctorId) params.append('doctorId', doctorId);
  if (patientId) params.append('PatientId', patientId);

  const page = filter?.page != null && filter.page !== '' ? Number(filter.page) : null;
  const pageSize = filter?.pageSize != null && filter.pageSize !== '' ? Number(filter.pageSize) : null;
  if (page != null && Number.isFinite(page) && page >= 1) params.append('page', String(Math.floor(page)));
  if (pageSize != null && Number.isFinite(pageSize) && pageSize >= 1) {
    params.append('pageSize', String(Math.floor(pageSize)));
  }
  return params.toString();
}

/** Pulls the appointment array out of the several shapes the API returns (web: extractAppointmentListArray). */
export function extractAppointmentList(body) {
  const inner = body?.data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === 'object') {
    const list = inner.data ?? inner.items ?? inner.list ?? inner.records ?? inner.appointments ?? inner.Data;
    if (Array.isArray(list)) return list;
  }
  return [];
}

/** Client-side paging, as the web does for the patient list. */
export function paginateList(list, page, pageSize) {
  const rows = Array.isArray(list) ? list : [];
  const size = Number(pageSize) > 0 ? Number(pageSize) : rows.length || 20;
  const totalPages = Math.ceil(rows.length / size);
  const safePage = Math.min(Math.max(1, Number(page) || 1), Math.max(totalPages, 1));
  const start = (safePage - 1) * size;
  return { rows: rows.slice(start, start + size), totalPages, page: safePage };
}

/** `GET /AllDoctorAppointment` query: Doctorid + repeated Status + UTC date range + PatientId + paging. */
export function buildDoctorAppointmentsQuery(doctorId, filter = {}) {
  const params = new URLSearchParams();
  params.append('Doctorid', String(doctorId));

  normalizeStatusFilter(filter?.status).forEach((status) => params.append('Status', status));

  const fromDate = filter?.fromDate != null ? String(filter.fromDate).trim() : '';
  const toDate = filter?.toDate != null ? String(filter.toDate).trim() : '';
  const patientId = filter?.patientId != null ? String(filter.patientId).trim() : '';
  const { fromDateUtc, toDateUtc } = toUtcDateRangeParams(fromDate, toDate);
  if (fromDateUtc) params.append('fromDate', fromDateUtc);
  if (toDateUtc) params.append('toDate', toDateUtc);
  if (patientId) params.append('PatientId', patientId);

  const page = filter?.page != null && filter.page !== '' ? Number(filter.page) : null;
  const pageSize = filter?.pageSize != null && filter.pageSize !== '' ? Number(filter.pageSize) : null;
  if (page != null && Number.isFinite(page) && page >= 1) params.append('page', String(Math.floor(page)));
  if (pageSize != null && Number.isFinite(pageSize) && pageSize >= 1) {
    params.append('pageSize', String(Math.floor(pageSize)));
  }
  return params.toString();
}

/** Reads { list, totalRecords, totalPages, page, pageSize } out of the several shapes the API returns. */
export function parseAppointmentListResponse(body, fallbackPage, fallbackPageSize) {
  const base = { list: [], totalRecords: 0, totalPages: 0, page: fallbackPage, pageSize: fallbackPageSize };
  if (!body?.status) return base;

  const inner = body.data;
  let list = [];
  let totalRecords = 0;
  let totalPages = 0;
  let page = fallbackPage;
  let pageSize = fallbackPageSize;

  if (Array.isArray(inner)) {
    list = inner;
    totalRecords = Number(body.totalRecords ?? body.totalCount ?? list.length) || 0;
    pageSize = Number(body.pageSize ?? fallbackPageSize) || fallbackPageSize;
    page = Number(body.page ?? fallbackPage) || fallbackPage;
    totalPages = Number(body.totalPages) || (pageSize > 0 ? Math.ceil(totalRecords / pageSize) : 0);
  } else if (inner && typeof inner === 'object') {
    list = inner.data ?? inner.items ?? inner.list ?? inner.records ?? inner.appointments ?? [];
    if (!Array.isArray(list)) list = [];
    totalRecords =
      Number(inner.totalRecords ?? inner.totalCount ?? body.totalRecords ?? body.totalCount ?? list.length) || 0;
    pageSize = Number(inner.pageSize ?? body.pageSize ?? fallbackPageSize) || fallbackPageSize;
    page = Number(inner.page ?? body.page ?? fallbackPage) || fallbackPage;
    totalPages = Number(inner.totalPages ?? body.totalPages) || (pageSize > 0 ? Math.ceil(totalRecords / pageSize) : 0);
  }

  if (!Number.isFinite(totalPages) || totalPages < 0) totalPages = 0;
  if (totalRecords > 0 && totalPages < 1 && pageSize > 0) {
    totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  }
  return { list, totalRecords, totalPages, page, pageSize };
}

function normalizeRowStatus(appointment) {
  return String(appointment?.appointmentStatus ?? appointment?.status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

/**
 * "Rescheduled" is refined on the client (as on the web): when it is among the selected statuses
 * the rows are narrowed to the selected statuses; any other selection is left exactly as the
 * server returned it.
 */
export function applyRescheduledClientFilter(list, filterStatus) {
  const statuses = normalizeStatusFilter(filterStatus);
  const rows = Array.isArray(list) ? list : [];
  if (statuses.length === 0 || !statuses.includes('rescheduled')) return rows;
  return rows.filter((appointment) => statuses.includes(normalizeRowStatus(appointment)));
}
