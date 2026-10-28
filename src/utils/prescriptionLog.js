// Port of web's usePrescriptionLogTimeline (module/Doctor/Pages/Patients/components/modals): turns a raw
// `/prescriptions/{id}/log` entry into a human-readable timeline message, oldest first.

const TECHNICAL_ADDITIONAL_INFO_KEYS = new Set(['type', 'traceid', 'status', 'statuscode', 'instance']);

const PRIORITY_KEYS = [
  'message', 'Message', 'error', 'Error', 'errorMessage', 'ErrorMessage',
  'description', 'Description', 'resultDescription', 'ResultDescription',
  'validationErrors', 'ValidationErrors', 'errors', 'Errors', 'title', 'Title', 'detail', 'Detail',
];

/** Normalises AdditionalInfo (string / JSON string / object / array) into one display string. */
export function parsePrescriptionLogAdditionalInfo(value, { preservePlainText = true } = {}) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'string') {
    if (!value.trim()) return '';
    try {
      return parsePrescriptionLogAdditionalInfo(JSON.parse(value), { preservePlainText: false });
    } catch {
      return preservePlainText ? value : value.trim();
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => parsePrescriptionLogAdditionalInfo(item, { preservePlainText: false })).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    for (const key of PRIORITY_KEYS) {
      if (value[key]) {
        const parsed = parsePrescriptionLogAdditionalInfo(value[key], { preservePlainText: false });
        if (parsed) return parsed;
      }
    }
    return Object.entries(value)
      .filter(([key]) => !TECHNICAL_ADDITIONAL_INFO_KEYS.has(key.toLowerCase()))
      .map(([, entryValue]) => parsePrescriptionLogAdditionalInfo(entryValue, { preservePlainText: false }))
      .filter(Boolean)
      .join(' ');
  }

  return String(value).trim();
}

const getDisplayUser = (user) => String(user || 'System').trim() || 'System';

/** Port of web's getTimelineMessage: a readable sentence for one log entry. */
export function getPrescriptionLogMessage(item) {
  const statusKey = String(item?.Status || 'unknown').toLowerCase();
  const medicationStatusKey = String(item?.MedicationStatus || '').toLowerCase();
  const subject = item?.WasRefillRequest ? 'Refill prescription' : 'Prescription';
  const lowerSubject = subject.toLowerCase();
  const userName = getDisplayUser(item?.User);

  if (statusKey === 'entered') return `${subject} was created by ${userName}.`;
  if (statusKey === 'requested') {
    return item?.WasRefillRequest ? `A refill request was submitted by ${userName}.` : 'Prescription request was received.';
  }
  if (statusKey === 'sending') {
    return item?.WasRefillRequest
      ? `${userName} initiated processing of the refill prescription.`
      : `Prescription transmission was initiated by ${userName}.`;
  }
  if (statusKey === 'erxsent') return `${subject} was successfully transmitted to the pharmacy by ${userName}.`;
  if (statusKey === 'pharmacyverified') {
    return item?.WasRefillRequest
      ? 'Refill prescription was successfully verified by the pharmacy.'
      : 'Prescription was successfully verified by the pharmacy.';
  }
  if (statusKey === 'error') return 'Prescription processing failed.';
  if (statusKey === 'edited') return `${subject} was updated by ${userName}.`;
  if (statusKey === 'epcserror') return 'An error occurred during electronic prescription signing.';
  if (statusKey === 'epcssigned') return `${subject} was electronically signed by ${userName}.`;
  if (statusKey === 'readytosign') return `${subject} is ready for provider signature.`;
  if (statusKey === 'printed') return `${subject} was printed by ${userName}.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'active') return `${subject} was marked as Active by ${userName}.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'inactive') return `${subject} was marked as Inactive by ${userName}.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'completed') return `${subject} was marked as Completed.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'deleted') return `${subject} was deleted by ${userName}.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'cancelrequested') {
    return `A cancellation request was submitted for this ${lowerSubject} by ${userName}.`;
  }
  if (statusKey === 'unknown' && medicationStatusKey === 'cancelpending') return `${subject} cancellation is pending review.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'cancelled') return `${subject} was cancelled.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'canceldenied') return `${subject} cancellation request was denied.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'changed') return `RxChange was approved by ${userName}.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'fullfill') return `${subject} was fully dispensed by the pharmacy.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'partialfill') return `${subject} was partially dispensed by the pharmacy.`;
  if (statusKey === 'unknown' && medicationStatusKey === 'nofill') return `${subject} has not been dispensed by the pharmacy.`;
  if (statusKey === 'deleted') return `${subject} was deleted by ${userName}.`;

  return `${subject} was updated by ${userName}.`;
}

export function formatPrescriptionLogDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} ${month} ${year}, ${time}`;
}

/** Oldest first, same as web's getSortedLogs. */
export function sortPrescriptionLogs(items) {
  return [...items].sort((a, b) => new Date(a?.DateTimeStamp || 0).getTime() - new Date(b?.DateTimeStamp || 0).getTime());
}
