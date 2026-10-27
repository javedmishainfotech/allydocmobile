import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The API client reports a dead session (refresh failed / no refresh token) through this
  // handler; logging out flips isAuthenticated, which unmounts the signed-in tree and
  // lands the user back on the logged-out stack (web: performGlobalLogout).
  useEffect(
    () =>
      setSessionExpiredHandler((message) => {
        if (isAuthLogoutInProgress()) return;
        toast.error(message);
        logout();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
    <NavigationContainer>
      {!isAuthenticated ? (
        // Onboarding is the logged-out landing page, like the web app's "/" LandingPage: it is
        // what every signed-out visitor starts on (fresh launch and after logout) - no
        // 'seen once' flag. Signing in unmounts this whole stack, so it is gone while authed.
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Onboarding">
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
    </View>
  );
}
