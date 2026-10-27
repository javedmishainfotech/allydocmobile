# AllyDocMobile — Auth & Role Access Checklist

Source of truth: web app `AllyDocReactApp` (SignInNew, ProtectedRoutes, OrgRouteHandler, apis/index.js).
Legend: [x] done · [ ] pending · (T) needs on-device testing

## Roles / user types
- [x] Roles: patient, doctor, doctor sub, doctor admin, nurse
- [x] User types: freelancer (no org), hospital, clinic (org code required)
- [x] Role allow-list + org rule checked at login and on session restore (`utils/roleAccess.js`)
- [x] Login tab vs role mismatch rejected (patient tab ↔ patient role only)

## Login
- [x] Role tab selector (Patient / Clinician) + remembered `preferredLoginTab`
- [x] Org code entry (`OrgEntryPage`) → `clientName`
- [x] Encrypted `/loginV3.1` (deviceType = `Platform.OS`)
- [x] Account-disabled (403) inline alert
- [x] Session persisted (tokens in SecureStore, rest in AsyncStorage)
- [x] Temp-password users forced to Update Password screen
- [ ] (T) Verify against real backend for each role: patient, doctor, doctor sub, doctor admin, nurse, freelancer, hospital, clinic

## Session
- [x] Restore session on app start (`bootstrapAuth`)
- [x] Expired token renewed on start; unrenewable → back to login
- [x] Bearer token attached to every request
- [x] 401 → single-flight `/RefreshToken` → replay request
- [x] Proactive refresh 2 min before expiry; re-armed on app foreground
- [x] Refresh failure → toast + logout (`authSessionState` handler)
- [x] 30-min inactivity auto-logout (touch + background aware)
- [x] Logout: `/RevokeRefreshToken` (3s cap) + storage wipe
- [ ] Logout: FCM token unregister (with push notifications)
- [ ] Logout: activity-log flush (when activity logging is added)
- [ ] Login: FCM token register (with push notifications)

## Forgot / reset password
- [x] Service: `/ForgotPassword`, `/ResendOtp`, `/VerifyOtpForgotpassword`, `/ResetPassword`
- [x] Screen: email → OTP (15-min resend timer) → new password → success
- [x] "Forgot password?" link wired on Login
- [ ] (T) Run end-to-end against backend

## Role-based navigation
- [x] Backend-driven menu (`/AllMenus`) → bottom tabs + More sheet
- [x] Per-role screen registry (doctor / nurse / patient), route keys can't collide
- [x] Doctor Admin: Identity Proofing hidden
- [x] Doctor IDP gate: doctor / doctor sub locked out of every screen except Dashboard, Identity Proofing, Settings, Notifications until `idpSuccess` (`navigation/IdpGate.jsx`); nurse + doctor admin exempt. (T)
- [x] Unauthorized / 404: N/A on mobile — no URL bar, navigation is a closed set; unmatched backend menu entries render a placeholder, unknown roles are rejected at login

## Register / sign-up
- [x] Patient registration (roleId 9) → OTP → account created
- [x] Clinician registration: details → Clinician Type (freelance roleId 8 / clinic owner roleId 11)
- [x] Clinic setup (state/city pickers, phone type, fax) for clinic owners
- [x] OTP verification (shared `OtpVerificationStep`, also used by forgot-password)
- [x] Register link on Login (hidden for org logins, as on web)
- [ ] Phone: country code fixed to +1 (web has a country picker) — add picker if non-US numbers are needed
- [ ] (T) Run end-to-end against backend for patient, freelance clinician, clinic owner

## Screens (to implement one by one)
### Patient
- [x] Dashboard (placeholder)
- [ ] Appointments · [ ] Messages · [ ] Treatment Plan · [ ] Feedback · [ ] Payments · [ ] Settings
- [x] Notifications · [x] Support (shared with doctor)
### Nurse
- [x] Dashboard (placeholder) · [x] Notifications · [x] Settings (shared) · [x] Support
- [ ] Pending Appointments · [ ] Appointments · [ ] Doctors · [ ] Patients · [ ] Messages · [ ] Treatment Plan · [ ] Payments · [ ] Favorites
### Doctor / Doctor Sub / Doctor Admin
- [x] Dashboard · [x] Manage Appointments · [x] Appointments · [x] Patients · [x] Identity Proofing · [x] Notifications · [x] Settings · [x] Support
- [ ] Treatment Plan · [ ] Pharmacy Requests · [ ] Favorites · [ ] Messages · [ ] Payments · [ ] Requests · [ ] Feedback · [ ] Scan Document · [ ] Prescriptions · [ ] Reports · [ ] About
