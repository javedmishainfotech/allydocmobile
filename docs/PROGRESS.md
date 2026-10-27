# AllyDocMobile — Screen Progress (web parity)

Source of truth: web app `AllyDocReactApp` (routes in `src/routes.jsx`). Every screen is ported by reading the
web page + its API action first. Menus come from the backend `GET /AllMenus`; the role registries are in
`src/navigation/doctorMenuItems.jsx`.

Legend: [x] built · [~] partly built · [ ] not started · (T) built but **not yet tried on a real device**

> Nothing below has been run on a phone by the assistant (no emulator on the dev PC). Every [x] means the code
> was written from the web source and the Android bundle exports without errors. Update this file whenever a
> screen is finished or its scope changes.

Last updated: 2026-10-27 (patient side feature-complete; needs device testing)

---

## Next up (start here in the next session)
1. Doctor: Requests (Refill / Rx Change), Feedback, Treatment Plan list (wire the shared `TreatmentPlanList`).
2. Doctor + Nurse: Treatment Plan detail, staff view (SOAP edit, prescribe, notes, complete / cancel / reschedule).
3. Nurse-only pages (Dashboard, Doctors, Patients, Pending Appointments), then clinic / hospital doctor pages (Doctors list, clinic Patients, Settings extra tabs).
4. Heavy ones last: Favorites, Patients prescription flows (DoseSpot / EPCS), calls (Daily.co), FCM push.
Before building on top: test the patient screens on a real phone (Book Appointment, Messages, payment WebView, Edit / Create Profile) and fix what breaks.

---

## 1. Auth / app shell (all roles)
- [x] Onboarding, organization code, login (patient / clinician tabs), register (patient, freelance clinician, clinic owner), forgot password (4-box OTP), update temp password — see `AUTH_CHECKLIST.md`
- [x] Role-based menus from `/AllMenus` → bottom tabs (4) + More sheet, header (back + title | IDP, bell, profile)
- [x] Notifications screen, Support screen, Identity Proofing (doctor)
- [ ] IDP route gate (needs owner's OK — their test account is `not_started`)
- [ ] 401 handling polish, logout: revoke FCM token
- [ ] FCM push notifications (needs Firebase files)
- [ ] Calls: audio / video (Daily.co) + incoming-call popup

## 2. Patient (freelancer, clinic, hospital — same screens, org branches inside)
- [x] Dashboard (stats, next appointment, recent appointments, subscription card, payment-pending banner)
- [x] Appointments (list, filter, give feedback; rows open Treatment Plan detail)
- [x] Treatment Plan list + detail (patient view: remarks, feedback, SOAP, questionnaire, prescriptions)
- [x] Payments (history, filter, invoice sheet + share)
- [x] Feedback (pending / reviewed, give review)
- [x] Messages (SignalR chat list + chat screen, image upload) (T)
- [x] Settings → My Profile (view + Edit Profile) (T)
- [x] Settings → Change Password
- [x] Settings → My Pharmacy (search, default / preferred, remove, map)
- [x] Settings → Subscription Plans (active plan, renew / buy, history, invoices, payment WebView) (T)
- [x] Notifications, Support
- [x] **Book Appointment** (web `BookAppointmentModal`) as a full screen (T) — never run end to end on a device:
  - [x] Resume prompt (abandoned booking) — `GET /BookingProgress/GetPending`, `POST /BookingProgress/Dismiss`
  - [x] Consent (CMS html in a WebView + `POST /api/PatientBookingConsent/RecordAcceptance`)
  - [x] Condition select (`GET /AllSymptoms`)
  - [x] Medical info (per-condition content, auto-skips when empty)
  - [x] Questionnaire wizard (11 question types incl. temperature / scale / file name, conditional questions, validation, warning / block / review outcomes, autosave + resume)
  - [x] Date & time (clinic / hospital only; freelancer skips it) — `GET /ScheduleList`, `POST /SelectAppointmentTime`
  - [x] Payment (existing plan / available plans / one-time, secure checkout WebView) — `PaymentCheckoutSheet`
  - [x] Success; dashboard "Pay now" for staff-initiated bookings opens the payment step directly
  - Known gaps: staff-booking-for-patient mode (`StaffBookingConfirmedStep`) belongs to the Doctor / Nurse modules; the file-upload question only records the file name (same as the web); the questionnaire "scale" is tappable steps, not a slider
- [x] **Edit Profile / first-visit Create Profile** form (`PatientProfileModal`; blocking Create Profile on the dashboard when `isFirstVisit` is true) (T)
- [ ] Ringtone picker in profile (web only plays it for incoming calls — low priority)

## 3. Doctor (Doctor, Doctor Sub, Doctor Admin)
- [x] Dashboard, Manage Appointments (calendar + pending), Appointments list (+ shared detail sheet), Messages (+ Chat button on appointment sheet) (T)
- [x] Patients list + patient detail tabs
- [x] Settings: My Profile, Change Password, Certifications, Account (TFA / PIN)
- [ ] Treatment Plan list (shared `TreatmentPlanList` is ready — needs patient filter wiring)
- [ ] Treatment Plan detail — staff view (SOAP edit, prescribe, notes, complete / cancel / reschedule, calls, chat) (~3600 web lines)
- [ ] Requests (Refill / Rx Change queues)
- [ ] Feedback (doctor)
- [ ] Favorites, Clinic Favorites
- [ ] Payments (web page itself is an "under development" placeholder)
- [ ] Patients sub-flows: add prescription (EPCS), manage pharmacies, merge patients, patient profile page
- [ ] Pending Appointments page
- [ ] Clinic / hospital only: Doctors list, doctor profile / appointments / treatment plans / feedback, clinic Patients list + sub-pages
- [ ] Settings extra tabs: Clinic Available Hours, Assign Disease, Merge Patient, disease questionnaire page

## 4. Nurse
- [x] Notifications, Settings, Support, Messages (shared screens)
- [ ] Dashboard, Doctors, Patients, Pending Appointments (nurse-only web pages)
- [ ] Appointments (shared doctor page, nurse variant reads `/AllFacilityAppointment`), Treatment Plan, Payments, Favorites (shared with doctor)

## 5. Not in the web routes but present in the mobile More grid
- [ ] Scan Document, Prescriptions, Reports, About AllyDoc — placeholders; the web app has no routes for them. Check whether the backend `/AllMenus` ever returns them before building anything.
