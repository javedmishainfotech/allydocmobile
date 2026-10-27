/**
 * Client-side counterpart of the web's ProtectedRoutes allow-list + OrgRouteHandler
 * rules. The backend remains the real authority (every API checks the token's role);
 * this only stops the app from mounting a role shell for a session it should not trust.
 */

// roleName values the backend hands out, lower-cased (see web routes.jsx allowedRoles).
export const PATIENT_ROLES = ['patient'];
export const CLINICIAN_ROLES = ['doctor', 'doctor sub', 'doctor admin', 'nurse'];
export const ALLOWED_ROLES = [...PATIENT_ROLES, ...CLINICIAN_ROLES];

// userType values the backend hands out (freelancer = platform user, no org).
const ORG_USER_TYPES = ['hospital', 'clinic'];

const norm = (value) => String(value || '').toLowerCase().trim();

export const isRoleAllowed = (roleName) => ALLOWED_ROLES.includes(norm(roleName));

/**
 * @param {{roleName?:string,userType?:string,orgName?:string,loginTab?:'patient'|'doctor'}} session
 * `loginTab` is only known at login time (not when restoring a persisted session).
 * @returns {{ok:boolean,message?:string}}
 */
export function validateSession({ roleName, userType, orgName, loginTab }) {
  const role = norm(roleName);
  if (!isRoleAllowed(role)) {
    return { ok: false, message: 'Unauthorized Access' };
  }
  if (loginTab === 'patient' && !PATIENT_ROLES.includes(role)) {
    return { ok: false, message: 'This account is not a patient account.' };
  }
  if (loginTab === 'doctor' && PATIENT_ROLES.includes(role)) {
    return { ok: false, message: 'This account is not a clinician account.' };
  }
  // Hospital/clinic users must belong to an org (web OrgRouteHandler).
  if (ORG_USER_TYPES.includes(norm(userType)) && !String(orgName || '').trim()) {
    return { ok: false, message: 'Organization code is required for this account.' };
  }
  return { ok: true };
}
