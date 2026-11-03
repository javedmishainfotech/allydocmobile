import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppHeader from '../components/AppHeader';
import DoctorHeaderRight from '../components/DoctorHeaderRight';
import DoctorTabBar, { DOCK_HEIGHT } from '../components/DoctorTabBar';
import DoctorMoreMenu from '../components/DoctorMoreMenu';
import { useDoctorMenu } from './DoctorMenuContext';
import { DockInsetContext } from './DockInsetContext';
import { getMenuScreenComponent } from './doctorMenuItems';
import { adTokens } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Every role's home screen (DoctorDashboard / NurseDashboard / PatientDashboard) shows the full
// logo in the header instead of a title.
const DASHBOARD_KEY = /Dashboard$/;

// The More tab is never shown - pressing it opens DoctorMoreMenu instead (see DoctorTabBar).
const MoreScreen = () => null;

// The navigator's own tab bar renders nothing. The glass dock has to live OUTSIDE
// the navigator (next to the blur target, not inside it - a blur can't sample the
// view that contains it), so this just hands the navigator's tab state up to it.
function TabBarBridge({ state, navigation, navigationRef, onStateChange }) {
  navigationRef.current = navigation;
  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);
  return null;
}

/**
 * The doctor's main surface: the first four backend menu entries as tabs, plus a
 * More tab that opens a sheet with the rest (DoctorMenuContext, built by
 * RoleNavigator from `/AllMenus`). More's screens are pushed on the parent
 * stack. `navigation` here is that parent stack's, so the sheet can navigate to a
 * tab or a pushed screen with one navigate() call.
 *
 * The scenes sit inside a BlurTargetView and the dock floats over them, so the
 * dock's glass genuinely blurs the page scrolling beneath it.
 */
export default function RoleTabsNavigator({ navigation }) {
  const { tabItems, moreItems } = useDoctorMenu();
  const insets = useSafeAreaInsets();
  const [moreVisible, setMoreVisible] = useState(false);
  const [tabState, setTabState] = useState(null);
  const tabNavigationRef = useRef(null);
  const blurTargetRef = useRef(null);
  const hasMore = moreItems.length > 0;

  // Distance from the screen's bottom edge to the dock - the full bottom inset, so the
  // dock clears whatever system bar is there. A gesture-nav device's inset is thin, so
  // this still sits low; a 3-button-nav device's inset is much taller (the solid nav bar
  // itself), and halving it (as this used to) left the dock sitting partly underneath
  // that bar instead of above it.
  const dockBottom = Math.max(insets.bottom, 8);
  // What pages must keep clear at the bottom so their last item isn't under the dock.
  const dockInset = DOCK_HEIGHT + dockBottom + 16;

  return (
    <View style={styles.flex1}>
      <BlurTargetView ref={blurTargetRef} style={styles.flex1}>
        <DockInsetContext.Provider value={dockInset}>
          <Tab.Navigator
            initialRouteName={tabItems[0]?.key}
            tabBar={(props) => (
              <TabBarBridge
                state={props.state}
                navigation={props.navigation}
                navigationRef={tabNavigationRef}
                onStateChange={setTabState}
              />
            )}
            screenOptions={({ navigation: tabNavigation }) => ({
              headerShown: true,
              // The shared compact brand header. Home (Dashboard) has no title so it shows the
              // full logo; the other tabs show the brand mark + their title. The bell and
              // profile menu sit on its right.
              header: ({ options }) => (
                <AppHeader
                  title={options.headerTitleText}
                  right={<DoctorHeaderRight navigation={tabNavigation} />}
                />
              ),
              sceneStyle: styles.scene,
            })}
          >
            {tabItems.map((item) => (
              <Tab.Screen
                key={item.key}
                name={item.key}
                component={getMenuScreenComponent(item)}
                options={{
                  title: item.title,
                  // What AppHeader prints; Dashboard leaves it out so it gets the full logo instead.
                  headerTitleText: DASHBOARD_KEY.test(item.key) ? undefined : item.title,
                }}
              />
            ))}
            {hasMore ? <Tab.Screen name="More" component={MoreScreen} /> : null}
          </Tab.Navigator>
        </DockInsetContext.Provider>
      </BlurTargetView>

      {tabState && tabNavigationRef.current ? (
        <DoctorTabBar
          state={tabState}
          navigation={tabNavigationRef.current}
          tabItems={tabItems}
          moreOpen={moreVisible}
          onMorePress={() => setMoreVisible(true)}
          blurTarget={blurTargetRef}
          bottomOffset={dockBottom}
        />
      ) : null}

      <DoctorMoreMenu visible={moreVisible} onClose={() => setMoreVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scene: { backgroundColor: adTokens.bgBody },
});
