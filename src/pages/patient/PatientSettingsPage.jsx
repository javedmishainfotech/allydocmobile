import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import PatientProfileTab from '../../components/settings/PatientProfileTab';
import ChangePasswordTab from '../../components/settings/ChangePasswordTab';
import MyPharmacyTab from '../../components/settings/MyPharmacyTab';
import SubscriptionPlansTab from '../../components/settings/SubscriptionPlansTab';
import SettingsTabsLayout from '../../components/settings/SettingsTabsLayout';

// Same tabs, in the same order, as AllyDocReactApp's module/Patient/Pages/Setting/index.jsx.
const TABS = [
  { key: 'profile', label: 'My Profile', icon: 'account-outline' },
  { key: 'security', label: 'Change Password', icon: 'lock-outline' },
  { key: 'pharmacy', label: 'My Pharmacy', icon: 'store-outline' },
  { key: 'subscription-plans', label: 'Subscription Plans', icon: 'credit-card-outline' },
];

/** Patient "Settings" - port of the web's Patient Setting page: the shared tab frame with the
 * patient's four tabs. The dashboard's "My Pharmacy" / "Change Password" shortcuts and the
 * `tab` route param select a tab, as the web's `?tab=` does. */
export default function PatientSettingsPage() {
  const { profile } = useAuth();

  return (
    <SettingsTabsLayout
      tabs={TABS}
      renderTab={(tab) => {
        if (tab === 'profile') return <PatientProfileTab userId={profile?.userId} />;
        if (tab === 'security') return <ChangePasswordTab />;
        if (tab === 'pharmacy') return <MyPharmacyTab />;
        if (tab === 'subscription-plans') return <SubscriptionPlansTab />;
        return null;
      }}
    />
  );
}
