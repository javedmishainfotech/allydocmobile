import React from 'react';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import DoctorManageAppointmentsPage from '../pages/doctor/DoctorManageAppointmentsPage';
import DoctorAppointmentsPage from '../pages/doctor/DoctorAppointmentsPage';
import DoctorSettingsPage from '../pages/doctor/DoctorSettingsPage';
import DoctorPatientsPage from '../pages/doctor/DoctorPatientsPage';
import DoctorTreatmentPlanPage from '../pages/doctor/DoctorTreatmentPlanPage';
import DoctorsListPage from '../pages/doctor/DoctorsListPage';
import FavoritesPage from '../pages/doctor/FavoritesPage';
import PatientDashboardPage from '../pages/patient/PatientDashboardPage';
import PatientAppointmentsPage from '../pages/patient/PatientAppointmentsPage';
import PatientTreatmentPlanPage from '../pages/patient/PatientTreatmentPlanPage';
import PatientPaymentsPage from '../pages/patient/PatientPaymentsPage';
import PatientFeedbackPage from '../pages/patient/PatientFeedbackPage';
import PatientSettingsPage from '../pages/patient/PatientSettingsPage';
import ChatRoomsPage from '../pages/chat/ChatRoomsPage';
import DoctorSupportPage from '../pages/doctor/DoctorSupportPage';
import DoctorIdentityProofingPage from '../pages/doctor/DoctorIdentityProofingPage';
import DoctorNotificationPage from '../pages/doctor/DoctorNotificationPage';
import DoctorRequestsPage from '../pages/doctor/DoctorRequestsPage';
import DoctorFeedbackPage from '../pages/doctor/DoctorFeedbackPage';
import NurseDashboardPage from '../pages/nurse/NurseDashboardPage';
import NursePendingAppointmentsPage from '../pages/nurse/NursePendingAppointmentsPage';
import PlaceholderScreen from '../components/PlaceholderScreen';
import { requiresIdpGate, withIdpGate } from './IdpGate';

// Stable component identities (an inline arrow passed as a navigator `component` would remount
// its screen on every render) for the two Favorites scopes - clinician-wide vs clinic-wide.
function ClinicianFavoritesPage() {
  return <FavoritesPage scope="clinician" />;
}
function ClinicFavoritesPage() {
  return <FavoritesPage scope="clinic" />;
}

/**
 * Menu/page inventory per role. The real sidebar of the web app
 * (AllyDocReactApp/src/components/DefaultLayout/SideBar.jsx) is backend-driven via
 * `GET /AllMenus?userId=...` (RoleRightsMappings rows for the user's role, so each
 * role already gets only its own menus) - NOT a hardcoded list. Each entry below is
 * a KNOWN SCREEN our app can render for that role, matched against the live menu
 * response by its route `path` (see `matchKnownScreen`). The array also serves as a
 * fallback menu if the API call fails or returns nothing, so the app is never left empty.
 *
 * Route keys are prefixed per role (Doctor* / Nurse* / Patient*) so one role's
 * screens can never collide with another's, even where they share a component.
 * `component` is null for items not yet implemented - they render PlaceholderScreen
 * via `resolveMenuScreenComponent` instead.
 *
 * Order matters inside each array: the first entry whose keyword is found in the
 * API path wins, so more specific keywords (e.g. 'pending-appointment') sit before
 * more general ones ('appointment').
 */

// ── Doctor (roleName: Doctor, Doctor Sub, Doctor Admin) ──
export const DOCTOR_MENU_ITEMS = [
  { key: 'DoctorDashboard', title: 'Dashboard', icon: 'view-dashboard-outline', component: DoctorDashboardPage, pathKeywords: ['dashboard'] },
  { key: 'ManageAppointments', title: 'Manage Appointments', icon: 'calendar-edit', component: DoctorManageAppointmentsPage, pathKeywords: ['manageappointment'] },
  // Web's /doctor/pending-appointments uses the exact same PendingAppointments component as Nurse's
  // (module/Nurse/PendingAppointments/index.jsx) - same reuse here. Keyword ordered before the more
  // general 'appointment' below.
  { key: 'DoctorPendingAppointments', title: 'Pending Appointments', icon: 'calendar-clock-outline', component: NursePendingAppointmentsPage, pathKeywords: ['pending-appointment'] },
  { key: 'DoctorAppointments', title: 'Appointments', icon: 'calendar-month-outline', component: DoctorAppointmentsPage, pathKeywords: ['appointment'] },
  { key: 'DoctorPatients', title: 'Patients', icon: 'account-multiple-outline', component: DoctorPatientsPage, pathKeywords: ['patient'] },
  { key: 'DoctorTreatmentPlan', title: 'Treatment Plan', icon: 'clipboard-text-outline', component: DoctorTreatmentPlanPage, pathKeywords: ['treatment-plan', 'treatmentplan'] },
  { key: 'DoctorsList', title: 'Doctors', icon: 'doctor', component: DoctorsListPage, pathKeywords: ['doctors'] },
  { key: 'ClinicFavorites', title: 'Clinic Favorites', icon: 'star-check-outline', component: ClinicFavoritesPage, pathKeywords: ['clinic-favorite', 'clinicfavorite'] },
  { key: 'Favorites', title: 'Favorites', icon: 'star-outline', component: ClinicianFavoritesPage, pathKeywords: ['favorite'] },
  { key: 'DoctorMessage', title: 'Messages', icon: 'message-text-outline', component: ChatRoomsPage, pathKeywords: ['message'] },
  { key: 'DoctorPayments', title: 'Payments', icon: 'credit-card-outline', component: null, pathKeywords: ['payment'] },
  // Web's sidebar labels this single route "Pharmacy Requests" (sidebarBlueprint.js); it's the
  // same Refill/Rx-Change tabs as the per-patient Requests page, just clinic-wide in scope.
  { key: 'DoctorRequests', title: 'Pharmacy Requests', icon: 'pill', component: DoctorRequestsPage, pathKeywords: ['pharmacy-request', 'pharmacyrequest', 'rxrequest', 'rx-request', 'request'] },
  { key: 'DoctorNotification', title: 'Notifications', icon: 'bell-outline', component: DoctorNotificationPage, pathKeywords: ['notification'] },
  { key: 'DoctorFeedback', title: 'Feedback', icon: 'comment-text-outline', component: DoctorFeedbackPage, pathKeywords: ['feedback'] },
  // Not in the old sidebar - added for the "More" grid (not built yet, so they render PlaceholderScreen).
  { key: 'DoctorScanDocument', title: 'Scan Document', icon: 'scan-helper', component: null, pathKeywords: ['scan-document', 'scandocument'] },
  { key: 'DoctorPrescriptions', title: 'Prescriptions', icon: 'prescription', component: null, pathKeywords: ['prescription'] },
  { key: 'DoctorReports', title: 'Reports', icon: 'chart-bar', component: null, pathKeywords: ['report'] },
  { key: 'AboutAllyDoc', title: 'About AllyDoc', icon: 'information-outline', component: null, pathKeywords: ['about'] },
  { key: 'IdentityProofing', title: 'Identity Proofing', icon: 'shield-account-outline', component: DoctorIdentityProofingPage, pathKeywords: ['identity-proofing', 'identityproofing'] },
  { key: 'DoctorSettings', title: 'Settings', icon: 'cog-outline', component: DoctorSettingsPage, pathKeywords: ['setting'] },
  { key: 'DoctorSupport', title: 'Support', icon: 'lifebuoy', component: DoctorSupportPage, pathKeywords: ['support'] },
];

// ── Nurse (roleName: Nurse) - web: module/Nurse/*, portal /nurse/* ──
// Settings reuses the doctor Settings screen, which hides the tabs a nurse doesn't get
// (as the web's Settings/index.jsx does). Notifications are the same API for every role.
export const NURSE_MENU_ITEMS = [
  { key: 'NurseDashboard', title: 'Home', icon: 'view-dashboard-outline', component: NurseDashboardPage, pathKeywords: ['dashboard'] },
  { key: 'NursePendingAppointments', title: 'Pending Appointments', icon: 'calendar-clock-outline', component: NursePendingAppointmentsPage, pathKeywords: ['pending-appointment'] },
  // Web's NurseAppointments/NursePatients/NurseTreatmentPlan are literal re-exports of the Doctor
  // component (no nurse-specific code) - same here.
  { key: 'NurseAppointments', title: 'Appointments', icon: 'calendar-month-outline', component: DoctorAppointmentsPage, pathKeywords: ['appointment'] },
  { key: 'NurseDoctors', title: 'Doctors', icon: 'doctor', component: DoctorsListPage, pathKeywords: ['doctor'] },
  { key: 'NursePatients', title: 'Patients', icon: 'account-multiple-outline', component: DoctorPatientsPage, pathKeywords: ['patient'] },
  { key: 'NurseMessage', title: 'Messages', icon: 'message-text-outline', component: ChatRoomsPage, pathKeywords: ['message'] },
  { key: 'NurseTreatmentPlan', title: 'Treatment Plan', icon: 'clipboard-text-outline', component: DoctorTreatmentPlanPage, pathKeywords: ['treatment-plan', 'treatmentplan'] },
  { key: 'NursePayments', title: 'Payments', icon: 'credit-card-outline', component: null, pathKeywords: ['payment'] },
  { key: 'NurseClinicFavorites', title: 'Clinic Favorites', icon: 'star-check-outline', component: ClinicFavoritesPage, pathKeywords: ['clinic-favorite', 'clinicfavorite'] },
  { key: 'NurseFavorites', title: 'Favorites', icon: 'star-outline', component: ClinicianFavoritesPage, pathKeywords: ['favorite'] },
  { key: 'NurseNotification', title: 'Notifications', icon: 'bell-outline', component: DoctorNotificationPage, pathKeywords: ['notification'] },
  { key: 'NurseSettings', title: 'Settings', icon: 'cog-outline', component: DoctorSettingsPage, pathKeywords: ['setting'] },
  { key: 'NurseSupport', title: 'Support', icon: 'lifebuoy', component: DoctorSupportPage, pathKeywords: ['support'] },
];

// ── Patient (roleName: Patient) - web: module/Patient/*, portal /patient/* ──
export const PATIENT_MENU_ITEMS = [
  { key: 'PatientDashboard', title: 'Home', icon: 'view-dashboard-outline', component: PatientDashboardPage, pathKeywords: ['dashboard'] },
  { key: 'PatientAppointments', title: 'Appointments', icon: 'calendar-month-outline', component: PatientAppointmentsPage, pathKeywords: ['appointment'] },
  { key: 'PatientMessage', title: 'Messages', icon: 'message-text-outline', component: ChatRoomsPage, pathKeywords: ['message'] },
  { key: 'PatientTreatmentPlan', title: 'Treatment Plan', icon: 'clipboard-text-outline', component: PatientTreatmentPlanPage, pathKeywords: ['treatment-plan', 'treatmentplan'] },
  { key: 'PatientFeedback', title: 'Feedback', icon: 'comment-text-outline', component: PatientFeedbackPage, pathKeywords: ['feedback'] },
  { key: 'PatientPayments', title: 'Payments', icon: 'credit-card-outline', component: PatientPaymentsPage, pathKeywords: ['payment'] },
  { key: 'PatientNotification', title: 'Notifications', icon: 'bell-outline', component: DoctorNotificationPage, pathKeywords: ['notification'] },
  { key: 'PatientSettings', title: 'Settings', icon: 'cog-outline', component: PatientSettingsPage, pathKeywords: ['setting'] },
  { key: 'PatientSupport', title: 'Support', icon: 'lifebuoy', component: DoctorSupportPage, pathKeywords: ['support'] },
];

export const MENU_ITEMS_BY_ROLE = {
  doctor: DOCTOR_MENU_ITEMS,
  nurse: NURSE_MENU_ITEMS,
  patient: PATIENT_MENU_ITEMS,
};

/** The route keys other parts of the UI (header bell / profile menu) navigate to, per role. */
export const ROLE_ROUTE_KEYS = {
  doctor: { settings: 'DoctorSettings', notification: 'DoctorNotification' },
  nurse: { settings: 'NurseSettings', notification: 'NurseNotification' },
  patient: { settings: 'PatientSettings', notification: 'PatientNotification' },
};

/** Normalises the web's roleName the way ProtectedRoutes / getRoleDashboardPath do:
 * "doctor admin" / "doctor sub" -> "doctor"; "nurse" and "patient" stay as they are. */
export function normalizeRole(roleName) {
  const lower = String(roleName || '').toLowerCase().trim();
  if (lower === 'doctor admin' || lower === 'doctor sub') return 'doctor';
  return lower;
}

export function getMenuItemsForRole(role) {
  return MENU_ITEMS_BY_ROLE[role] || DOCTOR_MENU_ITEMS;
}

/** Matches one backend menu entry ({ path, title, icon }) to a known local screen of
 * `items` by keyword-matching its route path (case-insensitive substring, since the
 * backend's exact path casing/format isn't guaranteed to match the web app's route
 * strings 1:1). Returns null if nothing matches - caller decides what to do with an
 * unrecognized item. */
export function matchKnownScreen(apiItem, items = DOCTOR_MENU_ITEMS) {
  const path = String(apiItem?.path || '').toLowerCase();
  if (!path) return null;
  return items.find((known) => known.pathKeywords.some((kw) => path.includes(kw))) || null;
}

/** Turns the `/AllMenus` response (redux `menu` slice) into the role's screen list, in
 * the order the API returned it: each entry matched to a known local screen by path
 * keyword, unknown ones kept as placeholders under the backend's own title. Falls back
 * to the role's static list while the API hasn't resolved (or failed / returned nothing)
 * so the app is never left empty. De-duplicated by key - two API rows can match the same
 * local screen, and a duplicate route name would crash the navigator.
 *
 * `isDoctorAdmin`: the web filters Identity Proofing and Two-Factor items out of a Doctor
 * Admin's menu (SideBar.jsx) - they don't use those flows - so the same is done here. */
export function buildRoleMenuItems(menu, role, { isDoctorAdmin = false } = {}) {
  const roleItems = getMenuItemsForRole(role);
  const isIdpItem = (item) => item.key === 'IdentityProofing';

  if (menu.status !== 'succeeded' || !menu.items.length) {
    return isDoctorAdmin ? roleItems.filter((item) => !isIdpItem(item)) : roleItems;
  }

  const seen = new Set();
  const items = [];
  menu.items.forEach((apiItem, index) => {
    const path = String(apiItem?.path || '').toLowerCase();
    if (isDoctorAdmin && (path.includes('/identity-proofing') || path.includes('/two-factor'))) return;

    const known = matchKnownScreen(apiItem, roleItems);
    const item = known
      ? { ...known, title: apiItem.title || known.title }
      : {
          key: `UnmatchedMenuItem${index}`,
          title: apiItem.title || 'Untitled',
          icon: 'help-circle-outline',
          component: null,
        };
    if (seen.has(item.key)) return;
    seen.add(item.key);
    items.push(item);
  });
  return items;
}

// resolveMenuScreenComponent returns a NEW function on every call for unbuilt
// screens; as a navigator `component` that would remount the screen on each
// render. Cached so the same item always yields the same component identity.
const screenComponentCache = new Map();
export function getMenuScreenComponent(item) {
  const base = item.component || getUnbuiltScreenComponent(item);
  // Doctor screens (other than dashboard / identity-proofing / setting / notification) are
  // locked behind Identity Proofing, as in the web's ProtectedRoutes. The gate itself skips
  // nurse and doctor admin by reading the signed-in role.
  const isDoctorScreen = DOCTOR_MENU_ITEMS.some((doctorItem) => doctorItem.key === item.key);
  return isDoctorScreen && requiresIdpGate(item.key) ? withIdpGate(base) : base;
}

function getUnbuiltScreenComponent(item) {
  const cacheKey = `${item.key}|${item.title}|${item.icon}`;
  if (!screenComponentCache.has(cacheKey)) {
    screenComponentCache.set(cacheKey, resolveMenuScreenComponent(item));
  }
  return screenComponentCache.get(cacheKey);
}

/** Resolves the component to render for a menu item - a real screen if built,
 * else the shared PlaceholderScreen with this item's own title/icon (so an
 * unrecognized backend menu entry still renders something, with the backend's
 * own title, rather than being silently dropped). */
export function resolveMenuScreenComponent(item) {
  if (item.component) return item.component;
  return () => <PlaceholderScreen title={item.title} icon={item.icon || 'progress-wrench'} />;
}
