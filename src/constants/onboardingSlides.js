/**
 * Onboarding copy. Every claim here maps to a screen the app really has (Doctor
 * dashboard / Manage Appointments / Patients tabs / Identity Proofing + 2FA /
 * Notifications) - nothing is promised that isn't built. `chips` are the real
 * section names from those screens, shown as floating labels in the illustration.
 */
export const ONBOARDING_SLIDES = [
  {
    key: 'welcome',
    icon: 'heart-pulse',
    title: 'Welcome to AllyDoc',
    description:
      'One secure place for clinicians and patients. Sign in as a Patient or a Clinician, with an organization code if you work through a hospital or clinic.',
    chips: [
      { icon: 'stethoscope', label: 'Clinician' },
      { icon: 'account-heart-outline', label: 'Patient' },
    ],
  },
  {
    key: 'practice',
    icon: 'calendar-check-outline',
    title: 'Run your practice',
    description:
      'See today’s schedule at a glance, accept pending requests, and manage appointments from a calendar, with notes, questionnaires and one-tap completion.',
    chips: [
      { icon: 'calendar-clock-outline', label: 'Today’s Schedule' },
      { icon: 'inbox-arrow-down-outline', label: 'Pending Requests' },
    ],
  },
  {
    key: 'patients',
    icon: 'account-multiple-outline',
    title: 'Patient care in one place',
    description:
      'Open any patient to review their allergies, medication history, refills and prescription change requests without leaving the app.',
    chips: [
      { icon: 'alert-circle-outline', label: 'Allergies' },
      { icon: 'pill', label: 'Medication History' },
      { icon: 'refresh', label: 'Refills' },
    ],
  },
  {
    key: 'secure',
    icon: 'shield-check-outline',
    title: 'Secure, and always in the loop',
    description:
      'Complete identity proofing and two-factor authentication, and get notified about the activity that needs your attention.',
    chips: [
      { icon: 'shield-account-outline', label: 'Identity Proofing' },
      { icon: 'bell-outline', label: 'Notifications' },
    ],
  },
];
