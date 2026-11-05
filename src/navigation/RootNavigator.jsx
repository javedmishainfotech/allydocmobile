import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import OnboardingPage from '../pages/auth/OnboardingPage';
import OrgEntryPage from '../pages/auth/OrgEntryPage';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import RegisterPage from '../pages/auth/RegisterPage';
import UpdateTempPasswordPage from '../pages/auth/UpdateTempPasswordPage';
import LegalWebViewScreen from '../pages/legal/LegalWebViewScreen';
import RoleNavigator from './RoleNavigator';
import useAutoLogoutOnInactivity from '../hooks/useAutoLogoutOnInactivity';
import { setSessionExpiredHandler, isAuthLogoutInProgress } from '../services/authSessionState';
import { toast } from '../utils/toast';
import { adTokens, colors } from '../theme/colors';

const AuthStack = createNativeStackNavigator();

/**
 * Mirrors the web app's role-gating split across SignInNew.jsx (redirect once
 * already authenticated), tempPasswordAuth.js (temp-password + role-dashboard
 * path resolution) and ProtectedRoutes.jsx (role allow-list gate). React
 * Navigation's conditional-tree pattern replaces react-router's route guards:
 * which stack is even mounted is the gate, rather than a per-route check.
 */
export default function RootNavigator() {
  const { status, isAuthenticated, isTempPassword, bootstrap, logout } = useAuth();
  const insets = useSafeAreaInsets();
  // The toast is easy to miss since it fires right as the signed-in tree unmounts and the
  // app swaps to the logged-out stack underneath it - this banner stays on screen (over
  // whichever logged-out screen lands) until the user dismisses it or a few seconds pass,
  // so the reason for being signed out is still visible after the toast itself is gone.
  const [sessionBanner, setSessionBanner] = useState(null);
  // Tracks whether this signed-out stack should open on Login (just logged out of a real
  // session) instead of Onboarding (fresh install / never signed in this app session).
  const [loggedOutRoute, setLoggedOutRoute] = useState('Onboarding');
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      setLoggedOutRoute('Login');
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // The API client reports a dead session (refresh failed / no refresh token) through this
  // handler; logging out flips isAuthenticated, which unmounts the signed-in tree and
  // lands the user back on the logged-out stack (web: performGlobalLogout).
  useEffect(
    () =>
      setSessionExpiredHandler((message) => {
        if (isAuthLogoutInProgress()) return;
        toast.error(message);
        setSessionBanner(message);
        logout();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!sessionBanner) return undefined;
    const timer = setTimeout(() => setSessionBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [sessionBanner]);

  // Web AuthContext: 30 minutes without activity logs the user out.
  const { responderProps } = useAutoLogoutOnInactivity({
    enabled: isAuthenticated,
    onTimeout: () => {
      toast.error('You were logged out due to inactivity.');
      logout();
    },
  });

  if (status === 'bootstrapping') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...responderProps}>
    <NavigationContainer ref={navigationRef}>
      {!isAuthenticated ? (
        // Onboarding is the logged-out landing page, like the web app's "/" LandingPage, for a
        // fresh install / app launch that was never signed in. An explicit logout (manual, session
        // expiry, or inactivity timeout) instead opens straight on Login - the user already knows
        // the app, they don't need the marketing/onboarding screen again. Signing in unmounts this
        // whole stack, so it is gone while authed.
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={loggedOutRoute}>
          <AuthStack.Screen name="Onboarding" component={OnboardingPage} />
          <AuthStack.Screen name="OrgEntry" component={OrgEntryPage} />
          <AuthStack.Screen name="Login" component={LoginPage} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordPage} />
          <AuthStack.Screen name="Register" component={RegisterPage} />
          <AuthStack.Screen
            name="LegalWebView"
            component={LegalWebViewScreen}
            options={{ headerShown: true }}
          />
        </AuthStack.Navigator>
      ) : isTempPassword ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="UpdateTempPassword" component={UpdateTempPasswordPage} />
          <AuthStack.Screen
            name="LegalWebView"
            component={LegalWebViewScreen}
            options={{ headerShown: true }}
          />
        </AuthStack.Navigator>
      ) : (
        // Every signed-in role (doctor / nurse / patient) gets the same API-menu-driven shell; which
        // screens its menu entries open comes from the role's own registry (see RoleNavigator).
        <RoleNavigator />
      )}
    </NavigationContainer>

      {sessionBanner ? (
        <View style={[styles.bannerWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.banner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.white} />
            <Text style={styles.bannerText}>{sessionBanner}</Text>
            <Pressable onPress={() => setSessionBanner(null)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'absolute', left: 16, right: 16, zIndex: 999, elevation: 999 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: adTokens.danger,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bannerText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '600' },
});
