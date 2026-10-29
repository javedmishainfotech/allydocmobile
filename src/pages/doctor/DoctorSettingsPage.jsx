import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getItem } from '../../utils/storage';
import ProfileTab from '../../components/settings/ProfileTab';
import ChangePasswordTab from '../../components/settings/ChangePasswordTab';
import CertificationsTab from '../../components/settings/CertificationsTab';
import AccountSettingsTab from '../../components/settings/AccountSettingsTab';
import AssignDiseaseTab from '../../components/settings/AssignDiseaseTab';
import ClinicAvailableHoursTab from '../../components/settings/ClinicAvailableHoursTab';
import SettingsTabsLayout from '../../components/settings/SettingsTabsLayout';

// Exact tab set/order for the Freelancer Doctor variant (AllyDocReactApp's Settings/index.jsx
// tabs array).
const ALL_TABS = [
  { key: 'profile', label: 'My Profile', icon: 'account-outline' },
  { key: 'security', label: 'Change Password', icon: 'lock-outline' },
  { key: 'certifications', label: 'Certifications', icon: 'certificate-outline' },
  { key: 'account', label: 'Account Settings', icon: 'cog-outline' },
  { key: 'hours', label: 'Clinic Available Hours', icon: 'clock-outline' },
  { key: 'assign-disease', label: 'Assign Disease', icon: 'heart-pulse' },
];

/** Which of ALL_TABS a role gets - the same rules as the web's Settings/index.jsx:
 *  - Certifications: everyone except a Nurse;
 *  - Account Settings (TFA / PIN): not a Nurse and not a Doctor Admin (they have no 2FA flow);
 *  - Clinic Available Hours: `userType !== "freelancer" && isAdmin === "true" && !isNurse`. Web
 *    never actually sets the `isAdmin` storage key anywhere in its own login flow, so this tab
 *    is unreachable there too - ported with the exact same (dead) condition for parity;
 *  - Assign Disease: Clinic Admin only (`userType === "clinic" && roleName is doctor admin/clinic
 *    admin`), and not a Nurse.
 * Profile and Change Password are for every role. */
function tabsForRole(roleName, userType, isAdmin) {
  const role = String(roleName || '').toLowerCase().trim();
  const type = String(userType || '').toLowerCase().trim();
  const isNurse = role === 'nurse';
  const isDoctorAdmin = role === 'doctor admin';
  const isClinicAdmin = type === 'clinic' && (role === 'doctor admin' || role === 'clinic admin');
  return ALL_TABS.filter((tab) => {
    if (tab.key === 'certifications') return !isNurse;
    if (tab.key === 'account') return !isNurse && !isDoctorAdmin;
    if (tab.key === 'hours') return type !== 'freelancer' && String(isAdmin).toLowerCase() === 'true' && !isNurse;
    if (tab.key === 'assign-disease') return isClinicAdmin && !isNurse;
    return true;
  });
}

/** Port of AllyDocReactApp/src/module/Doctor/Pages/Settings/index.jsx - a horizontal tab
 * bar (.ad-tabs) over a single scrolling content area below, same as web. Shared by the
 * doctor roles and the nurse; the tabs shown depend on the signed-in role. */
export default function DoctorSettingsPage() {
  const { profile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    getItem('isAdmin').then(setIsAdmin);
  }, []);

  return (
    <SettingsTabsLayout
      tabs={tabsForRole(profile?.roleName, profile?.userType, isAdmin)}
      renderTab={(tab) => {
        if (tab === 'profile') return <ProfileTab userId={profile?.userId} />;
        if (tab === 'security') return <ChangePasswordTab />;
        if (tab === 'certifications') return <CertificationsTab userId={profile?.userId} />;
        if (tab === 'account') return <AccountSettingsTab userId={profile?.userId} />;
        if (tab === 'hours') return <ClinicAvailableHoursTab />;
        if (tab === 'assign-disease') return <AssignDiseaseTab />;
        return null;
      }}
    />
  );
}
