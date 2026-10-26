import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useDashboardRole } from '../hooks/useDashboardRole';
import OnboardingPage from '../pages/auth/OnboardingPage';
import OrgEntryPage from '../pages/auth/OrgEntryPage';
import LoginPage from '../pages/auth/LoginPage';
import UpdateTempPasswordPage from '../pages/auth/UpdateTempPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import LegalWebViewScreen from '../pages/legal/LegalWebViewScreen';
import DoctorNavigator from './DoctorNavigator';

const AuthStack = createNativeStackNavigator();
const PatientStack = createNativeStackNavigator();
const NurseStack = createNativeStackNavigator();

/**
 * Mirrors the web app's role-gating split across SignInNew.jsx (redirect once
 * already authenticated), tempPasswordAuth.js (temp-password + role-dashboard
 * path resolution) and ProtectedRoutes.jsx (role allow-list gate). React
 * Navigation's conditional-tree pattern replaces react-router's route guards:
 * which stack is even mounted is the gate, rather than a per-route check.
 */
export default function RootNavigator() {
  const { status, isAuthenticated, isTempPassword, bootstrap } = useAuth();
  const dashboardRole = useDashboardRole();

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'bootstrapping') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Onboarding is the logged-out landing page, like the web app's "/" LandingPage: it is
        // what every signed-out visitor starts on (fresh launch and after logout) - no
        // 'seen once' flag. Signing in unmounts this whole stack, so it is gone while authed.
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Onboarding">
          <AuthStack.Screen name="Onboarding" component={OnboardingPage} />
          <AuthStack.Screen name="OrgEntry" component={OrgEntryPage} />
          <AuthStack.Screen name="Login" component={LoginPage} />
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
      ) : dashboardRole === 'patient' ? (
        <PatientStack.Navigator screenOptions={{ title: 'AllyDoc' }}>
          <PatientStack.Screen name="PatientDashboard">
            {() => <DashboardPage roleLabel="Patient" />}
          </PatientStack.Screen>
          <PatientStack.Screen name="LegalWebView" component={LegalWebViewScreen} />
        </PatientStack.Navigator>
      ) : dashboardRole === 'nurse' ? (
        <NurseStack.Navigator screenOptions={{ title: 'AllyDoc' }}>
          <NurseStack.Screen name="NurseDashboard">
            {() => <DashboardPage roleLabel="Nurse" />}
          </NurseStack.Screen>
          <NurseStack.Screen name="LegalWebView" component={LegalWebViewScreen} />
        </NurseStack.Navigator>
      ) : (
        <DoctorNavigator />
      )}
    </NavigationContainer>
  );
}
