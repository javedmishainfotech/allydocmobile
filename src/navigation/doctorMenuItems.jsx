import React from 'react';
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import DoctorManageAppointmentsPage from '../pages/doctor/DoctorManageAppointmentsPage';
import DoctorSettingsPage from '../pages/doctor/DoctorSettingsPage';
import DoctorPatientsPage from '../pages/doctor/DoctorPatientsPage';
import DoctorSupportPage from '../pages/doctor/DoctorSupportPage';
import DoctorIdentityProofingPage from '../pages/doctor/DoctorIdentityProofingPage';
import DoctorNotificationPage from '../pages/doctor/DoctorNotificationPage';
import PlaceholderScreen from '../components/PlaceholderScreen';

/**
 * Verified Freelancer-doctor menu/page inventory (see the plan file and this
 * session's research for the audit trail against AllyDocReactApp/src/routes.jsx).
 * Explicitly excluded (confirmed not applicable to a freelancer, not built):
 * Clinic Favorites, sub-doctor "Doctors" management list, any clinic-location CRUD.
 *
 * The real sidebar (see AllyDocReactApp/src/components/DefaultLayout/SideBar.jsx)
 * is backend-driven via `GET /AllMenus?userId=...` - NOT a hardcoded list. Each
 * entry below is a KNOWN SCREEN our app can render, matched against the live
 * menu response by its route `path` (see `matchKnownScreen` below). This array
 * also serves as a fallback menu if the API call fails or returns nothing, so
 * the app is never left with an empty drawer.
 *
 * `component` is null for items not yet implemented in this phase - they render
 * PlaceholderScreen via `resolveMenuScreenComponent` instead.
 */
export const DOCTOR_MENU_ITEMS = [
  { key: 'DoctorDashboard', title: 'Dashboard', icon: 'view-dashboard-outline', component: DoctorDashboardPage, pathKeywords: ['dashboard'] },
  { key: 'ManageAppointments', title: 'Manage Appointments', icon: 'calendar-edit', component: DoctorManageAppointmentsPage, pathKeywords: ['manageappointment'] },
  { key: 'DoctorAppointments', title: 'Appointments', icon: 'calendar-month-outline', component: null, pathKeywords: ['appointment'] },
  { key: 'DoctorPatients', title: 'Patients', icon: 'account-multiple-outline', component: DoctorPatientsPage, pathKeywords: ['patient'] },
  { key: 'DoctorTreatmentPlan', title: 'Treatment Plan', icon: 'clipboard-text-outline', component: null, pathKeywords: ['treatment-plan', 'treatmentplan'] },
  { key: 'PharmacyRequests', title: 'Pharmacy Requests', icon: 'pill', component: null, pathKeywords: ['pharmacy-request', 'pharmacyrequest', 'rxrequest', 'rx-request'] },
  { key: 'Favorites', title: 'Favorites', icon: 'star-outline', component: null, pathKeywords: ['favorite'] },
  { key: 'DoctorMessage', title: 'Messages', icon: 'message-text-outline', component: null, pathKeywords: ['message'] },
  { key: 'DoctorPayments', title: 'Payments', icon: 'credit-card-outline', component: null, pathKeywords: ['payment'] },
  { key: 'DoctorRequests', title: 'Requests', icon: 'inbox-arrow-down-outline', component: null, pathKeywords: ['request'] },
  { key: 'DoctorNotification', title: 'Notifications', icon: 'bell-outline', component: DoctorNotificationPage, pathKeywords: ['notification'] },
  { key: 'DoctorFeedback', title: 'Feedback', icon: 'comment-text-outline', component: null, pathKeywords: ['feedback'] },
  // Not in the old sidebar - added for the "More" grid (not built yet, so they render PlaceholderScreen).
  { key: 'DoctorScanDocument', title: 'Scan Document', icon: 'scan-helper', component: null, pathKeywords: ['scan-document', 'scandocument'] },
  { key: 'DoctorPrescriptions', title: 'Prescriptions', icon: 'prescription', component: null, pathKeywords: ['prescription'] },
  { key: 'DoctorReports', title: 'Reports', icon: 'chart-bar', component: null, pathKeywords: ['report'] },
  { key: 'AboutAllyDoc', title: 'About AllyDoc', icon: 'information-outline', component: null, pathKeywords: ['about'] },
  { key: 'IdentityProofing', title: 'Identity Proofing', icon: 'shield-account-outline', component: DoctorIdentityProofingPage, pathKeywords: ['identity-proofing', 'identityproofing'] },
  { key: 'DoctorSettings', title: 'Settings', icon: 'cog-outline', component: DoctorSettingsPage, pathKeywords: ['setting'] },
  { key: 'DoctorSupport', title: 'Support', icon: 'lifebuoy', component: DoctorSupportPage, pathKeywords: ['support'] },
];

/** Matches one backend menu entry ({ path, title, icon }) to a known local
 * screen by keyword-matching its route path (case-insensitive substring,
 * since the backend's exact path casing/format isn't guaranteed to match the
 * web app's route strings 1:1 and hasn't been verified against a live
 * response yet). Returns null if nothing matches - caller decides what to
 * do with an unrecognized item. */
export function matchKnownScreen(apiItem) {
  const path = String(apiItem?.path || '').toLowerCase();
  if (!path) return null;
  return DOCTOR_MENU_ITEMS.find((known) => known.pathKeywords.some((kw) => path.includes(kw))) || null;
}

/** Turns the `/AllMenus` response (redux `menu` slice) into the doctor's screen
 * list, in the order the API returned it: each entry matched to a known local
 * screen by path keyword, unknown ones kept as placeholders under the backend's
 * own title. Falls back to the static DOCTOR_MENU_ITEMS while the API hasn't
 * resolved (or failed / returned nothing) so the app is never left empty.
 * De-duplicated by key - two API rows can match the same local screen, and a
 * duplicate route name would crash the navigator. */
export function buildDoctorMenuItems(menu) {
  if (menu.status !== 'succeeded' || !menu.items.length) {
    return DOCTOR_MENU_ITEMS;
  }

  const seen = new Set();
  const items = [];
  menu.items.forEach((apiItem, index) => {
    const known = matchKnownScreen(apiItem);
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
  if (item.component) return item.component;
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
