/**
 * Pure status mapping for the Identity Proofing module - a 1:1 port of the
 * display-status logic and badge configs in AllyDocReactAppLatest's
 * IdentityProofing.jsx (getIdentityDisplayStatus / getTfaDisplayStatus /
 * idpStatusConfig / tfaStatusConfig / fullAccessConfig).
 */

export const IDP_MAX_ATTEMPTS = 3;

export const IDP_STATUS_CONFIG = {
  not_started: { label: 'Not Started', bgColor: '#6c757d', textColor: '#fff' },
  in_progress: { label: 'In Progress', bgColor: '#ffc107', textColor: '#212529' },
  completed: { label: 'IDP Completed', bgColor: '#28a745', textColor: '#fff' },
  failed: { label: 'IDP Failed', bgColor: '#dc3545', textColor: '#fff' },
  locked: { label: 'Locked', bgColor: '#adb5bd', textColor: '#fff' },
};

export const TFA_STATUS_CONFIG = {
  locked: { label: 'Locked', bgColor: '#adb5bd', textColor: '#fff' },
  not_started: { label: 'Not Started', bgColor: '#6c757d', textColor: '#fff' },
  in_progress: { label: 'In Progress', bgColor: '#ff9800', textColor: '#fff' },
  completed: { label: 'TFA Completed', bgColor: '#28a745', textColor: '#fff' },
  failed: { label: 'TFA Failed', bgColor: '#dc3545', textColor: '#fff' },
  deactivation_initiated: { label: 'Deactivation Initiated', bgColor: '#ff9800', textColor: '#fff' },
  deactivated: { label: 'Deactivated', bgColor: '#6c757d', textColor: '#fff' },
  deactivation_failed: { label: 'Deactivation Failed', bgColor: '#dc3545', textColor: '#fff' },
};

export const FULL_ACCESS_CONFIG = {
  completed: { label: 'Verification Completed', bgColor: '#28a745', textColor: '#fff' },
  pending: { label: 'Pending', bgColor: '#ffc107', textColor: '#212529' },
};

export function getIdentityDisplayStatus(idpStatus) {
  switch (idpStatus) {
    case 'started':
    case 'pending':
      return 'in_progress';
    case 'idpsuccess':
      return 'completed';
    case 'idperror':
      return 'failed';
    case 'not_started':
    default:
      return 'not_started';
  }
}

export function getTfaDisplayStatus(idpStatus, tfaStatus) {
  if (idpStatus !== 'idpsuccess') return 'locked';

  switch ((tfaStatus || '').toLowerCase()) {
    case 'not_started':
      return 'not_started';
    case 'started':
    case 'pending':
    case 'tfaactivateinit':
      return 'in_progress';
    case 'tfasuccess':
    case 'tfaactivatedsuccess':
      return 'completed';
    case 'tfaerror':
      return 'failed';
    case 'tfadeactivateinit':
      return 'deactivation_initiated';
    case 'tfadeactivatedsuccess':
    case 'tfadectivatedsuccess': // backend typo, kept as-is on the wire
      return 'deactivated';
    case 'tfadeactivatederror':
      return 'deactivation_failed';
    case 'locked':
      return 'locked';
    default:
      return 'not_started';
  }
}

export function isTfaDeactivationLifecycle(tfaStatus) {
  const normalized = (tfaStatus || '').toLowerCase();
  return (
    normalized === 'tfadeactivateinit' ||
    normalized === 'tfadeactivatedsuccess' ||
    normalized === 'tfadectivatedsuccess' ||
    normalized === 'tfadeactivatederror'
  );
}

export function isTfaActivated(tfaStatus) {
  const normalized = (tfaStatus || '').toLowerCase();
  return normalized === 'tfasuccess' || normalized === 'tfaactivatedsuccess';
}

export function getFullAccessStatus(idpStatus, tfaStatus) {
  return idpStatus === 'idpsuccess' && isTfaActivated(tfaStatus) ? 'completed' : 'pending';
}

/** Backend typo: TFADectivatedSuccess (deac -> dec). */
export function resolveTfaStatusFromApi(status) {
  return (status || '').toLowerCase() === 'tfadectivatedsuccess' ? 'TFADeactivatedSuccess' : status;
}

export function isKnownTfaStatus(statusLower) {
  return (
    statusLower === 'tfasuccess' ||
    statusLower === 'tfaactivatedsuccess' ||
    statusLower === 'tfaerror' ||
    statusLower === 'tfadeactivateinit' ||
    statusLower === 'tfadeactivatedsuccess' ||
    statusLower === 'tfadectivatedsuccess' ||
    statusLower === 'tfadeactivatederror'
  );
}
