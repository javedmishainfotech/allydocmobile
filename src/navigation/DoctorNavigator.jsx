import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DoctorTabsNavigator from './DoctorTabsNavigator';
import LegalWebViewScreen from '../pages/legal/LegalWebViewScreen';
import { DoctorMenuContext } from './DoctorMenuContext';
import { DOCTOR_MENU_ITEMS, buildDoctorMenuItems, getMenuScreenComponent } from './doctorMenuItems';
import { useAuth } from '../hooks/useAuth';
import { useMenu } from '../hooks/useMenu';
import { adTokens } from '../theme/colors';

const Stack = createNativeStackNavigator();

// How many menu entries sit in the bottom bar; the rest go in the More sheet.
const TAB_COUNT = 4;

// Screens other parts of the UI navigate to directly (navbar bell -> Notifications,
// profile dropdown -> Settings, Identity Proofing's own links). They are registered
// even when the backend menu doesn't include them, so those links never dead-end -
// they just don't appear as a tab or a More card unless the backend sent them.
const ALWAYS_REGISTERED = ['DoctorSettings', 'DoctorNotification', 'IdentityProofing'];

/**
 * Doctor root navigator, driven by the backend menu (`GET /AllMenus?userId=...`,
 * same API the old sidebar used): the first four entries are the bottom tabs,
 * the remainder are pushed full-screen from the More sheet. LegalWebView is here
 * too because the dashboard's privacy-policy link navigates to it.
 */
export default function DoctorNavigator() {
  const { profile } = useAuth();
  const menu = useMenu();

  useEffect(() => {
    if (profile?.userId) menu.loadMenu(profile.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId]);

  const items = useMemo(
    () => buildDoctorMenuItems(menu),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu.status, menu.items],
  );

  const { menuValue, pushedItems } = useMemo(() => {
    const tabItems = items.slice(0, TAB_COUNT);
    const moreItems = items.slice(TAB_COUNT);
    const known = new Set(items.map((item) => item.key));
    const extras = DOCTOR_MENU_ITEMS.filter((item) => ALWAYS_REGISTERED.includes(item.key) && !known.has(item.key));
    return { menuValue: { tabItems, moreItems }, pushedItems: [...moreItems, ...extras] };
  }, [items]);

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
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
          contentStyle: { backgroundColor: adTokens.bgBody },
        }}
      >
        <Stack.Screen name="DoctorTabs" component={DoctorTabsNavigator} options={{ headerShown: false }} />
        {pushedItems.map((item) => (
          <Stack.Screen
            key={item.key}
            name={item.key}
            component={getMenuScreenComponent(item)}
            options={{ title: item.title }}
          />
        ))}
        <Stack.Screen name="LegalWebView" component={LegalWebViewScreen} />
      </Stack.Navigator>
    </DoctorMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.bgBody },
});
