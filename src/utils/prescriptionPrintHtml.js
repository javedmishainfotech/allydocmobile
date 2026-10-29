/**
 * Port of AllyDocReactApp's PrintablePrescriptionDocument.jsx layout into a plain HTML string
 * for `expo-print` (no live DOM on mobile, so no html2pdf.js / hidden-iframe trick - the
 * generated string is handed straight to `Print.printAsync`/`Print.printToFileAsync`).
 */

const safeText = (value) => {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || '—';
};

function formatDob(raw) {
  if (!raw) return '—';
  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatDateOnly(raw) {
  return formatDob(raw);
}

function personAddress(p) {
  return [p?.address || p?.addressLine1, p?.city, p?.state, p?.zipcode || p?.zipCode || p?.zip].filter(Boolean).join(', ') || '—';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {object} args
 * @param {object} args.patientDetails - same shape as settingsService.getUserDetails()'s response.
 * @param {object} args.doctorDetails - same shape as settingsService.getUserDetails()'s response.
 * @param {object} args.pharmacy - the selected pharmacy object ({StoreName, Address1, City, State, ZipCode}).
 * @param {Array} args.rows - [{ medicationName, ingredientsText, writtenDate, effectiveDate, directions, quantity, refills }]
 */
export function buildPrescriptionPrintHtml({ patientDetails, doctorDetails, pharmacy, rows }) {
  const hasIngredients = rows.some((r) => r.ingredientsText);
  const doctorName = `${doctorDetails?.firstName || ''} ${doctorDetails?.lastName || ''}`.trim() || doctorDetails?.fullName;
  const patientName = `${patientDetails?.firstName || ''} ${patientDetails?.lastName || ''}`.trim() || patientDetails?.fullName;
  const pharmacyLines = pharmacy
    ? [pharmacy.StoreName, pharmacy.Address1, [pharmacy.City, pharmacy.State, pharmacy.ZipCode].filter(Boolean).join(', ')].filter(Boolean)
    : [];

  const now = new Date();
  const generatedOn = `${formatDateOnly(now.toISOString())} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(safeText(row.medicationName))}</td>
        ${hasIngredients ? `<td>${escapeHtml(safeText(row.ingredientsText))}</td>` : ''}
        <td>${escapeHtml(safeText(row.writtenDate))}</td>
        <td>${escapeHtml(safeText(row.effectiveDate))}</td>
        <td>${escapeHtml(safeText(row.directions))}</td>
        <td>${escapeHtml(safeText(row.quantity))}</td>
        <td>${escapeHtml(safeText(row.refills))}</td>
        <td>${pharmacyLines.map((line) => escapeHtml(line)).join('<br/>') || '—'}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111827; font-size: 12px; background: #ffffff; }
  .header { text-align: center; font-size: 18px; font-weight: 700; color: #1D4ED8; margin-bottom: 16px; }
  .details { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
  .details .col { flex: 1; }
  .details h3 { font-size: 13px; margin: 0 0 6px 0; color: #1D4ED8; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .details p { margin: 2px 0; }
  .rx-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #E2E8F0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F8FAFC; font-weight: 700; }
  .footer { display: flex; justify-content: space-between; margin-top: 24px; font-size: 10.5px; color: #64748B; }
</style>
</head>
<body>
  <div class="header">AllyDoc</div>

  <div class="details">
    <div class="col">
      <h3>Prescriber Details</h3>
      <p>Name: ${escapeHtml(safeText(doctorName))}</p>
      <p>NPI: ${escapeHtml(safeText(doctorDetails?.npiNumber || doctorDetails?.npi))}</p>
      <p>Email: ${escapeHtml(safeText(doctorDetails?.email))}</p>
      <p>Phone: ${escapeHtml(safeText(doctorDetails?.phoneNumber || doctorDetails?.phoneNo))}</p>
      <p>Address: ${escapeHtml(personAddress(doctorDetails))}</p>
    </div>
    <div class="col">
      <h3>Patient Details</h3>
      <p>Name: ${escapeHtml(safeText(patientName))}</p>
      <p>DOB: ${escapeHtml(formatDob(patientDetails?.dateOfBirth))}</p>
      <p>Gender: ${escapeHtml(safeText(patientDetails?.gender))}</p>
      <p>Email: ${escapeHtml(safeText(patientDetails?.email))}</p>
      <p>Phone: ${escapeHtml(safeText(patientDetails?.phoneNumber || patientDetails?.phoneNo))}</p>
      <p>Address: ${escapeHtml(personAddress(patientDetails))}</p>
    </div>
  </div>

  <div class="rx-title">Prescription (Rx)</div>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        ${hasIngredients ? '<th>Ingredients</th>' : ''}
        <th>Written Date</th>
        <th>Effective Date</th>
        <th>Directions</th>
        <th>Qty</th>
        <th>Refills</th>
        <th>Pharmacy</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>Generated On: ${escapeHtml(generatedOn)}</span>
    <span>Powered by AllyDoc</span>
  </div>
</body>
</html>`;
}
