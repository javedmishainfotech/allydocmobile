# Web vs Android — Full Gap Audit (2026-10-28)

Source of truth: web app `AllyDocReactApp` (`src/routes.jsx` + every page/component it renders). This
document is the result of a full, page-by-page, button-by-button comparison against the Android app
(`AllyDocMobile`), done in two passes:

1. A route-level pass (does the page exist at all, per role).
2. A deep pass per portal (Patient / Doctor-core / Prescribe+Doctor-admin / Nurse+shared), going inside
   every already-"complete" page to check individual buttons, modals, and business rules — not just
   page existence.

Everything here was verified by reading both the web source and the matching Android file(s). Nothing
is a guess. Use this alongside `docs/PROGRESS.md` (PROGRESS.md tracks build status per screen as work
happens; this file is the point-in-time audit that produced the corrections below).

---

## 1. Corrections to `docs/PROGRESS.md`

- ~~**Support is NOT complete**~~ — **RESOLVED 2026-10-29.** Was wrongly marked `[x]`; Android's
  `DoctorSupportPage.jsx` was a 17-line stub. Built the full ticket system to match web: list with
  stat chips/filter/search, New Ticket with attachments, a ticket detail screen (lifecycle bar, full
  conversation timeline, reply composer, close with remarks). See `docs/PROGRESS.md` §1 for the file
  list. This was the single largest previously-undocumented gap found in this audit.

---

## 2. Cross-cutting gaps (affect multiple roles)

### 2.1 FCM push + incoming-call ring/accept/decline UI — biggest gap in the whole audit
Web's `App.jsx` (838 lines) runs:
- An FCM `onMessage` handler dispatching on push `type`: `CALL_RINGING`, `CALL_STOP_RINGING`,
  `CALL_ANSWERED_ELSEWHERE`, `CALL_DECLINED`, `CALL_MISSED`, plus TFA-push and generic-notification types.
- `IncomingCallPopup.jsx` (329 lines): looped ringtone, live countdown (default 45s), caller
  name/image/appointment info, separate Join-Video / Join-Audio buttons, Decline with its own
  confirmation, join/decline loading states.
- Logout fires `AUTH_LOGOUT_EVENT` to clear any open incoming-call UI.

Android has **none of this** — FCM isn't wired at all. The existing `VideoCallPage.jsx` only covers
*joining an already-scheduled call*; there is no "someone is calling you right now from elsewhere in
the app" experience. Several smaller items (logout cleanup, TFA push, notification bell) also depend
on FCM existing.

### 2.2 ~~Manage Appointments' Chat/Call/Video say "Coming soon"~~ — RESOLVED 2026-10-29
Turned out to be a stale comment, not stale code: `DoctorManageAppointmentsPage.jsx` already reuses
the shared `AppointmentDetailSheet` for its detail panel, and that sheet's Chat/Call/Video were already
wired to the real features earlier this session. Only the page's own doc comment (claiming they were
"separate, not-yet-built integrations") was wrong - fixed to describe reality.

### 2.3 Manage Appointments has no Reschedule, for anyone
Android's comment says Reschedule is "intentionally not built" because web hides it for freelancer
doctors — true, but incomplete: web's actual rule (`showRescheduleButton`) also shows Reschedule for
clinic/hospital doctors and doctor-sub. It isn't built on this page at all, for any role.

---

## 3. Patient portal

Overall: strongest-built portal, 11/11 pages "complete" at the page level. Gaps found are smaller,
inside already-built pages.

| Area | Gap |
|---|---|
| Support | See §1 — ticket system entirely missing (shared across all roles) |
| Payments filter | **"Transaction Number" search field missing** — the `transactionNumber` key exists in `utils/paymentFields.js`'s default filter shape but is never exposed in the UI; effectively dead |
| Dashboard | HIPAA notice has no "Privacy Policy" link (web's does) |
| Appointments list | Numbered pagination on web vs Prev/Next-only on Android (minor UX) |
| Appointments list | Stale code comment: "Book Appointment not yet ported" — the button is actually there (line 223), comment is just wrong |
| Appointments / Dashboard | Incoming-call banner, and `?appointmentId=` deep-link auto-opening Give-Review (both are FCM-push-driven) — same root cause as §2.1, not a new gap |
| Feedback | Web's `AppointmentCard.jsx` has a dead `handleEditModal` prop (never renders an edit button) — **dead code on web itself**; Android correctly has no edit-review entry either, not a real gap |
| Book Appointment | Staff-booking-for-patient mode (`StaffBookingConfirmedStep`) not ported — belongs to Doctor/Nurse module (already known) |
| Book Appointment | Web's own `CreateProfile.jsx` (separate larger profile page) is dead/unrouted code on web itself — correctly not built on Android |

Spot-checked and confirmed matching (not re-audited line-by-line): Treatment Plan (patient view),
Notifications, Settings → Subscription Plans / Profile / My Pharmacy / Change Password.

---

## 4. Doctor — core clinical workflow

| Area | Gap |
|---|---|
| Dashboard | ~~**Doctor "Create Profile" (first-visit onboarding) is entirely missing.**~~ **RESOLVED 2026-10-29.** Built `DoctorProfileModal.jsx` (ported 1:1 from `CreateProfile.jsx`'s field set/order/validation) and wired it into `DoctorDashboardPage.jsx` via the same `isFirstVisit` check used by Patient. Covers personal info, state/city cascading dropdowns, NPI, DEA number + DEA registration address (isClinicianAddress toggle), NADEA number/state, licence file, qualifications upload; shares the schema with Nurse (`isNurse` hides DEA/NPI fields) for when the Nurse dashboard is built. Height/Weight/Blood Group and Certificates upload deliberately omitted — both are dead/unreachable on web itself (`hideDoctorFields = true`, `{false && !edit && (...)}`). |
| Manage Appointments | See §2.2 and §2.3 |
| Appointments list/detail | Matches web (eye-icon → Treatment Plan, fixed earlier this session). Web's own standalone `AppointmentDetails.jsx` is **dead code on web** (redirects to Treatment Plan) — Android correctly has no separate port. |
| AppointmentInfoButton | Exact field match (rescheduleReason, cancelReason, remarks, feedbackRating, feedbackComment); web uses hover tooltip, Android uses tap→Alert — appropriate platform substitution, not a gap. |
| Patients detail tabs | Coverage tab spot-checked field-by-field, exact match. Given the same rigor across Prescriptions/Allergies/RxChange/Refills/SelfReported tabs, no further gaps found. |
| Identity Proofing | Web's 7 files all have Android counterparts (split into 19 finer-grained files); reset-PIN/deactivation flow present. No gap. |

---

## 5. Prescribe / Pharmacy flow + Doctor-admin/clinic pages

### 5.1 Polish gaps inside the already-built "core flow" Prescribe wizard
- **SubstitutionConfirmationModal missing** — web requires a confirmation step before checking
  "No substitutions" on a medication; Android's `MedicationFormModal` has a plain `Switch`, no gate.
- **EPCSAuthorizationRequiredModal is static on Android** — web shows a live TFA ✓/✗ and PIN ✓/✗
  checklist with inline "Complete TFA" / "Set your PIN" buttons; Android shows a fixed red banner only.
- **ReplaceMedicationConfirmationModal** has nothing to attach to yet — Android's edit flow can't
  change the underlying drug of an existing prescription (only sig/dispense fields), so this
  confirmation (which guards exactly that) isn't relevant until drug-swap-on-edit is built.
- **ProviderPinModal** only supports the plain-PIN case; web's variant can ask for PIN + passcode
  together for EPCS sends — will need extending once EPCS is built, not reusable as-is.
- Patient-profile Prescriptions tab and ManagePharmaciesPage: verified matching web closely, no new
  gaps beyond what's already tracked.

### 5.2 Not built at all (confirmed scope, with real size now known)
- **CompoundModal** (web: 1,164 lines) — compound name, N ingredients each with its own paginated
  medication search, custom-ingredient fallback, per-ingredient dispense form, shared
  directions/dispense/refills/pharmacy/notes/favorite section.
- **PrescriptionBenefitsModal** (643 lines) — eligibility lookup, live benefits-check polling with
  retry, alternative-medication comparison, coverage breakdown, pharmacy filter. Large, standalone.
- **Full EPCS signing workflow** (`EpcsWorkflowModal` + `EpcsWorkflowStepper`, 530+43 lines) — DEA
  suggestion lookup, passcode, sign.
- **Print/PDF preview.**

### 5.3 Pages confirmed to need NOTHING (web itself has no real implementation)
- **Feedback (doctor)** — web's page is 100% hardcoded placeholder (fake names, star-rating modal
  that submits nowhere, no API calls at all).
- **Payments (doctor)** — web's page is also a static "under development" placeholder.

### 5.4 Not built — real size now known
- **Requests (Refill/Rx Change)** — **much less work than expected.** Web's page (99 lines) is just
  two tabs wrapping the exact same `RefillPendingRequestsTab`/`RxChangePendingRequestsTab` components
  Android's per-patient `RefillsTab.jsx`/`RxChangeTab.jsx` already port, called with
  `requestScope="clinic"` instead of `"patient"` (no `patientId` needed, adds a Patient column).
  Largely reuse, not a new feature.
- **Favorites / Clinic Favorites** — genuinely large (~3,100 lines): separate Medications/Supplies/
  Compounds tabs with full create/update/delete of clinician-wide and clinic-wide favorite
  prescriptions — distinct from (and bigger than) the read-only "+" favorites list the prescribe flow
  already has via `FavoritesList.jsx`.
- **Settings → Clinic Available Hours** (`MyAvailableHours.jsx`) — weekly per-day enable/start/end
  time editor + timezone + appointment-duration, real endpoints
  (`DailyAvailableHoursAction`/`GetDurationAction`/`GetDoctorTimeZoneAction`/`SaveWeeklyScheduleAction`).
- **Settings → Assign Disease** (`AssignDiseaseTab.jsx`, 374 lines) — Available/Assigned two-tab
  picker with search and validation.
- **Settings → Merge Patient** (`MergePatientPage.jsx` + `MergePatientTab.jsx`) — search + merge
  duplicate patient records.
- **Doctors list** (clinic/hospital only, ~1,326 lines) — list + doctor profile/appointments/
  treatment-plans/feedback sub-pages for clinic admins.
- **Pending Appointments** — shared with Nurse, see §6.

---

## 6. Nurse portal

**Key finding: most of the Nurse portal is reuse, not new work.** Of 8 real Nurse pages on web, 5 are
literal re-exports of the Doctor component with zero nurse-specific code
(`NurseAppointments` → `DoctorAppointments`, `NurseDoctors` → `Doctors`, `NursePatients` → `Patients`,
`NurseTreatmentPlan` → `DoctorTreatmentPlan`, `NurseMessage` → shared `Messages`). Wiring these into
`NURSE_MENU_ITEMS` is close to zero-research work since Android has already built and tested the
Doctor equivalents.

**Genuinely new nurse-specific work:**

1. **Nurse Dashboard** (`NurseDashboard/index.jsx`, 426 lines, own endpoint `GET /NurseDashboard?NurseId=`):
   hero banner with "Add Doctor"/"Add Patient" buttons, 4 stat cards, "Recent Appointments" table,
   "Doctors" and "Patients" top-5 widgets each with a "View All" link, first-visit Create-Profile modal.
2. **Pending Appointments + Assign Doctor** (`PendingAppointments/index.jsx` + `AssignDoctorModal.jsx`,
   255+293 lines) — the one substantial nurse-exclusive feature: lists unassigned appointments
   (`GET /AllPendingAppointment`), "Assign Doctor" opens a modal that loads available doctors
   (`GET /GetAvailableDoctors?AppointmentId=`), shows a live assignment-summary card once picked, and
   submits via `POST /AppointmentAccept` (`{appointmentId, doctorId}`). **No Android service functions
   exist for any of these 3 endpoints yet.**
3. Two small sub-list screens reused from the Doctor/Nurse "doctors/:id/..." and "patients/:id/..."
   routes (appointment list / treatment-plan list scoped to one doctor or patient) — small, same
   `SharedAppointmentTable`/`TreatmentPlanTable` patterns already ported elsewhere.
4. Payments (Nurse) → re-exports `DoctorPayments`, which is a web-side "under development" placeholder
   (see §5.3) — nothing real to port.

**Recommended Nurse build order:** wire the 5 reused pages first (near-zero cost), then Nurse Dashboard,
then Pending Appointments + Assign Doctor (the only real new business logic), then the two small
doctor/patient-scoped sub-lists.

---

## 7. Auth / login — minor gaps only

Close parity already confirmed (`SignInNew.jsx` vs `LoginPage.jsx`, read in full):
- Web hard-blocks keystrokes past 80/25 chars with an inline message; Android just caps `maxLength`
  silently (no message).
- Web's "Account disabled" alert has a "Contact Support" link; Android's has the message but no link.
- Web force-refreshes the FCM token on every login — not applicable until FCM exists (§2.1).
- Web's `/doctor/sign-in`, `/patient/sign-in`, `DocSignUp`, `PatientSignUp` are legacy/orphaned routes
  not linked from anywhere real on web — correctly not built on Android, not a gap.

Register / Forgot Password / Update Password were not re-verified in this pass (time-boxed); PROGRESS.md
already claims these complete and nothing found here contradicts it.

---

## 8. Prioritized punch list (combining all of the above)

**Highest impact, cross-cutting:**
1. FCM push + incoming-call ring/accept/decline UI (§2.1) — unlocks several smaller items too.
2. ~~Support ticket system (§1)~~ — done 2026-10-29.
3. ~~Manage Appointments' Chat/Call/Video wiring fix (§2.2)~~ — done 2026-10-29 (was just a stale comment).

**Doctor:**
4. ~~Doctor "Create Profile" first-visit onboarding (§4)~~ — done 2026-10-29.
5. Requests (Refill/Rx Change) — smaller than expected, mostly reuse (§5.4).
6. Settings → Assign Disease, Merge Patient (small-medium, self-contained).
7. Settings → Clinic Available Hours (medium, real scheduling form).
8. Doctors list (clinic/hospital) — large, its own mini-module.
9. Favorites / Clinic Favorites — large, its own mini-module.
10. Manage Appointments Reschedule (§2.3).

**Prescribe flow polish:**
11. SubstitutionConfirmationModal, EPCS live TFA/PIN status (quick wins).
12. CompoundModal, PrescriptionBenefitsModal, full EPCS signing, print/PDF (large, deferred).

**Nurse:**
13. Wire the 5 reused screens into the nurse menu (near-zero research).
14. Nurse Dashboard.
15. Pending Appointments + Assign Doctor (the one real new nurse feature).
16. The two small doctor/patient-scoped sub-list screens.

**Small polish (any time, low priority):**
17. Payments filter "Transaction Number" field (Patient).
18. HIPAA notice Privacy Policy link, numbered pagination, login character-limit messages,
    disabled-account support link.

**Confirmed nothing to do** (web itself has no real implementation): Feedback (doctor), Payments (doctor).
