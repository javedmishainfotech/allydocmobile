import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import ProfileTab from '../../components/settings/ProfileTab';
import ChangePasswordTab from '../../components/settings/ChangePasswordTab';
import CertificationsTab from '../../components/settings/CertificationsTab';
import AccountSettingsTab from '../../components/settings/AccountSettingsTab';
import SettingsTabsLayout from '../../components/settings/SettingsTabsLayout';

// Exact tab set/order for the Freelancer Doctor variant (AllyDocReactApp's
// Settings/index.jsx tabs array): "Clinic Available Hours" is excluded because
// it's gated on `usertype !== "freelancer"`, and "Assign Disease" is excluded
// because it requires `usertype === "clinic"` - neither applies here.
const ALL_TABS = [
  { key: 'profile', label: 'My Profile', icon: 'account-outline' },
  { key: 'security', label: 'Change Password', icon: 'lock-outline' },
  { key: 'certifications', label: 'Certifications', icon: 'certificate-outline' },
  { key: 'account', label: 'Account Settings', icon: 'cog-outline' },
];

/** Which of ALL_TABS a role gets - the same rules as the web's Settings/index.jsx:
 *  - Certifications: everyone except a Nurse;
 *  - Account Settings (TFA / PIN): not a Nurse and not a Doctor Admin (they have no 2FA flow).
 * Profile and Change Password are for every role. (The web's Clinic Hours and Assign Disease
 * tabs need clinic-only APIs that are not built in the app yet.) */
function tabsForRole(roleName) {
  const role = String(roleName || '').toLowerCase().trim();
  const isNurse = role === 'nurse';
  const isDoctorAdmin = role === 'doctor admin';
  return ALL_TABS.filter((tab) => {
    if (tab.key === 'certifications') return !isNurse;
    if (tab.key === 'account') return !isNurse && !isDoctorAdmin;
    return true;
  });
}

/** Port of AllyDocReactApp/src/module/Doctor/Pages/Settings/index.jsx - a horizontal tab
 * bar (.ad-tabs) over a single scrolling content area below, same as web. Shared by the
 * doctor roles and the nurse; the tabs shown depend on the signed-in role. */
export default function DoctorSettingsPage() {
  const { profile } = useAuth();

  return (
    <SettingsTabsLayout
      tabs={tabsForRole(profile?.roleName)}
      renderTab={(tab) => {
        if (tab === 'profile') return <ProfileTab userId={profile?.userId} />;
        if (tab === 'security') return <ChangePasswordTab />;
        if (tab === 'certifications') return <CertificationsTab userId={profile?.userId} />;
        if (tab === 'account') return <AccountSettingsTab userId={profile?.userId} />;
        return null;
      }}
    />
  );
}
