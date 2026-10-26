import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AllyDocLogo from '../components/AllyDocLogo';
import DoctorHeaderRight from '../components/DoctorHeaderRight';
import DoctorTabBar, { DOCK_HEIGHT } from '../components/DoctorTabBar';
import DoctorMoreMenu from '../components/DoctorMoreMenu';
import { useDoctorMenu } from './DoctorMenuContext';
import { DockInsetContext } from './DockInsetContext';
import { getMenuScreenComponent } from './doctorMenuItems';
import { adTokens } from '../theme/colors';

const Tab = createBottomTabNavigator();

// The More tab is never shown - pressing it opens DoctorMoreMenu instead (see DoctorTabBar).
const MoreScreen = () => null;

// The actual AllyDoc logo (same SVG as the web app), not a stand-in icon + text.
function BrandTitle() {
  return <AllyDocLogo height={28} />;
}

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
 * DoctorNavigator from `/AllMenus`). More's screens are pushed on the parent
 * stack. `navigation` here is that parent stack's, so the sheet can navigate to a
 * tab or a pushed screen with one navigate() call.
 *
 * The scenes sit inside a BlurTargetView and the dock floats over them, so the
 * dock's glass genuinely blurs the page scrolling beneath it.
 */
export default function DoctorTabsNavigator({ navigation }) {
  const { tabItems, moreItems } = useDoctorMenu();
  const insets = useSafeAreaInsets();
  const [moreVisible, setMoreVisible] = useState(false);
  const [tabState, setTabState] = useState(null);
  const tabNavigationRef = useRef(null);
  const blurTargetRef = useRef(null);
  const hasMore = moreItems.length > 0;

  // Distance from the screen's bottom edge to the dock. Kept small so the dock sits
  // low; only a fraction of the system-gesture inset is kept (not all of it plus a
  // margin), which still clears the gesture bar but no longer floats high above it.
  const dockBottom = Math.max(Math.round(insets.bottom * 0.5), 8);
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
              headerTitleAlign: 'left',
              headerTitleStyle: styles.headerTitle,
              headerStyle: styles.header,
              headerShadowVisible: false,
              headerRight: () => <DoctorHeaderRight navigation={tabNavigation} />,
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
                  ...(item.key === 'DoctorDashboard' ? { headerTitle: () => <BrandTitle /> } : null),
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
  header: { backgroundColor: adTokens.white },
  headerTitle: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
});
