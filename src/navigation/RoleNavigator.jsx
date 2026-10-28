import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleTabsNavigator from './RoleTabsNavigator';
import LegalWebViewScreen from '../pages/legal/LegalWebViewScreen';
import TreatmentPlanDetailPage from '../pages/treatmentPlan/TreatmentPlanDetailPage';
import ChatWindowPage from '../pages/chat/ChatWindowPage';
import VideoCallPage from '../pages/calls/VideoCallPage';
import AddPrescriptionPage from '../pages/prescriptions/AddPrescriptionPage';
import ManagePharmaciesPage from '../pages/prescriptions/ManagePharmaciesPage';
import BookAppointmentPage from '../pages/patient/BookAppointmentPage';
import { renderStackHeader } from '../components/AppHeader';
import { DoctorMenuContext } from './DoctorMenuContext';
import {
  ROLE_ROUTE_KEYS,
  buildRoleMenuItems,
  getMenuItemsForRole,
  getMenuScreenComponent,
  normalizeRole,
} from './doctorMenuItems';
import { useAuth } from '../hooks/useAuth';
import { useMenu } from '../hooks/useMenu';
import { adTokens } from '../theme/colors';

const Stack = createNativeStackNavigator();

// How many menu entries sit in the bottom bar; the rest go in the More sheet.
const TAB_COUNT = 4;

/**
 * Signed-in root navigator for EVERY role (doctor, nurse, patient), driven by the
 * backend menu (`GET /AllMenus?userId=...` - the backend returns only the menus the
 * user's role has rights to): the first four entries are the bottom tabs, the
 * remainder are pushed full-screen from the More sheet. The screen set each menu
 * entry resolves to comes from the role's own registry (doctorMenuItems.jsx), so a
 * nurse's "Patients" can never open the doctor's Patients screen.
 * LegalWebView is here too because screens link to the privacy policy.
 */
export default function RoleNavigator() {
  const { profile } = useAuth();
  const menu = useMenu();

  const rawRole = String(profile?.roleName || '').toLowerCase().trim();
  const role = normalizeRole(rawRole);
  const isDoctorAdmin = rawRole === 'doctor admin';

  useEffect(() => {
    if (profile?.userId) menu.loadMenu(profile.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId]);

  const items = useMemo(
    () => buildRoleMenuItems(menu, role, { isDoctorAdmin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu.status, menu.items, role, isDoctorAdmin],
  );

  const { menuValue, pushedItems } = useMemo(() => {
    const tabItems = items.slice(0, TAB_COUNT);
    const moreItems = items.slice(TAB_COUNT);

    // Screens other parts of the UI navigate to directly (header bell -> Notifications,
    // profile menu -> Settings, and for doctors the Identity Proofing shortcut). They are
    // registered even when the backend menu doesn't include them, so those links never
    // dead-end - they just don't appear as a tab or a More card unless the backend sent
    // them. A Doctor Admin has no Identity Proofing flow at all, so it is never registered.
    const alwaysRegistered = [ROLE_ROUTE_KEYS[role]?.settings, ROLE_ROUTE_KEYS[role]?.notification];
    if (role === 'doctor' && !isDoctorAdmin) alwaysRegistered.push('IdentityProofing');

    const known = new Set(items.map((item) => item.key));
    const extras = getMenuItemsForRole(role).filter(
      (item) => alwaysRegistered.includes(item.key) && !known.has(item.key),
    );
    return { menuValue: { tabItems, moreItems }, pushedItems: [...moreItems, ...extras] };
  }, [items, role, isDoctorAdmin]);

  // Hold off until the menu request settles. Rendering the static fallback first
  // would show one set of bottom tabs and then swap them for the API's under the
  // user's thumb. A failed request still falls through to the fallback list.
  if (profile?.userId && (menu.status === 'idle' || menu.status === 'loading')) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={adTokens.primary} />
      </View>
    );
  }

  return (
    <DoctorMenuContext.Provider value={menuValue}>
      <Stack.Navigator
        screenOptions={{
          // Every pushed screen gets the compact brand header (back arrow + title); the tabs
          // screen below opts out because its own tab navigator draws one.
          header: renderStackHeader,
          contentStyle: { backgroundColor: adTokens.bgBody },
        }}
      >
        <Stack.Screen name="RoleTabs" component={RoleTabsNavigator} options={{ headerShown: false }} />
        {pushedItems.map((item) => (
          <Stack.Screen
            key={item.key}
            name={item.key}
            component={getMenuScreenComponent(item)}
            options={{ title: item.title }}
          />
        ))}
        {/* Shared by every role: opened from the appointment and treatment-plan lists. */}
        <Stack.Screen name="TreatmentPlanDetail" component={TreatmentPlanDetailPage} options={{ title: 'Treatment Plan' }} />
        <Stack.Screen name="BookAppointment" component={BookAppointmentPage} options={{ title: 'Book Appointment' }} />
        <Stack.Screen name="ChatWindow" component={ChatWindowPage} options={{ title: 'Chat' }} />
        <Stack.Screen name="VideoCall" component={VideoCallPage} options={{ headerShown: false }} />
        <Stack.Screen name="AddPrescription" component={AddPrescriptionPage} options={{ title: 'Add Prescription' }} />
        <Stack.Screen name="ManagePharmacies" component={ManagePharmaciesPage} options={{ title: 'Manage Pharmacies' }} />
        <Stack.Screen name="LegalWebView" component={LegalWebViewScreen} />
      </Stack.Navigator>
    </DoctorMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.bgBody },
});
