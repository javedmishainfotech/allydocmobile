import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFormik } from 'formik';
import { loginValidationSchema } from '../../utils/validationSchema';
import { useAuth } from '../../hooks/useAuth';
import { useOrg } from '../../hooks/useOrg';
import { colors } from '../../theme/colors';
import { getItem, setItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import AuthLayout from '../../components/AuthLayout';
import RoleCard from '../../components/RoleCard';
import FormField from '../../components/FormField';
import AuthButton from '../../components/AuthButton';

// Port of ROLE_INFO in AllyDocReactApp/src/components/SignIn/SignInNew.jsx
const ROLE_INFO = {
  patient: {
    icon: 'account-heart-outline',
    label: 'Patient',
    desc: 'Book appointments & view records',
    hint: 'Logging in as a Patient — access your appointments, records & prescriptions',
  },
  doctor: {
    icon: 'stethoscope',
    label: 'Clinician',
    desc: 'Manage patients & consultations',
    hint: 'Logging in as a Clinician — manage your patients, schedule & consultations',
  },
};

export default function LoginPage({ navigation }) {
  const { status, error, accountDisabledMessage, login, dismissAccountDisabled } = useAuth();
  const { orgName, clearOrg } = useOrg();
  const [activeTab, setActiveTab] = useState('patient');

  // Mirrors the web app's `preferredLoginTab` (set in Header.jsx after a
  // successful login, read in SignInNew.jsx) - without this, every fresh
  // install defaults to the Patient tab and a returning Clinician/Nurse has
  // to remember to switch it every time before logging in.
  useEffect(() => {
    getItem('preferredLoginTab').then((stored) => {
      if (stored === 'doctor' || stored === 'patient') {
        setActiveTab(stored);
      }
    });
  }, []);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginValidationSchema,
    onSubmit: async (values) => {
      dismissAccountDisabled();
      const result = await login({
        email: values.email.trim(),
        password: values.password,
        userType: activeTab,
        clientName: orgName, // '' for freelancer/patient, else the chosen org code
      });
      // Navigation on success happens centrally in RootNavigator, which reacts
      // to `isAuthenticated`/`isTempPassword` in the store - mirrors the web
      // app's redirect-on-render pattern in SignInNew.jsx.
      if (result.meta.requestStatus === 'fulfilled') {
        // Real backend message first (e.g. "Login successful"), custom fallback second.
        toast.success(result.payload.message || 'Logged in successfully.');
      } else if (result.payload?.statuscode !== 403) {
        // 403 (account disabled) already has its own inline banner below -
        // matches the web app's SignInNew.jsx, which also skips the toast there.
        toast.error(result.payload?.message || 'Invalid email or password');
      }
    },
  });

  // Saved immediately on tap (not just after a successful login) so the
  // choice survives even if the user backgrounds/kills the app mid-form.
  const handleTabSelect = (key) => {
    setActiveTab(key);
    setItem('preferredLoginTab', key);
  };

  const changeOrg = () => {
    clearOrg();
    navigation.navigate('OrgEntry');
  };

  const info = ROLE_INFO[activeTab];
  const isSubmitting = status === 'loading';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthLayout>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.desc}>Sign in to continue to your health dashboard</Text>

          <Pressable style={styles.orgRow} onPress={changeOrg}>
            <MaterialCommunityIcons name="domain" size={15} color={colors.bodyText} />
            <Text style={styles.orgText}>
              {orgName ? `Organization: ${orgName}` : 'No organization selected'}
            </Text>
            <Text style={styles.orgChange}>Change</Text>
          </Pressable>

          <Text style={styles.roleLabel}>I AM LOGGING IN AS A</Text>
          <View style={styles.roleCards}>
            {Object.entries(ROLE_INFO).map(([key, role]) => (
              <RoleCard
                key={key}
                icon={role.icon}
                label={role.label}
                description={role.desc}
                active={activeTab === key}
                onPress={() => handleTabSelect(key)}
              />
            ))}
          </View>

          <View style={styles.hint}>
            <View style={styles.hintDot} />
            <Text style={styles.hintText}>{info.hint}</Text>
          </View>

          {accountDisabledMessage ? (
            <View style={styles.disabledAlert}>
              <Feather name="alert-triangle" size={18} color={colors.dangerText} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.disabledTitle}>Account disabled</Text>
                <Text style={styles.disabledMessage}>{accountDisabledMessage}</Text>
              </View>
            </View>
          ) : null}

          <FormField
            label="Email address"
            icon="mail"
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={80}
            placeholder="Enter your email"
            value={formik.values.email}
            onChangeText={formik.handleChange('email')}
            onBlur={formik.handleBlur('email')}
            error={formik.touched.email ? formik.errors.email : undefined}
          />

          <FormField
            label="Password"
            icon="lock"
            secureToggle
            maxLength={25}
            placeholder="Enter your password"
            value={formik.values.password}
            onChangeText={formik.handleChange('password')}
            onBlur={formik.handleBlur('password')}
            error={formik.touched.password ? formik.errors.password : undefined}
          />

          <View style={styles.forgotRow}>
            <View />
            <Pressable>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.submitError}>{error}</Text> : null}

          <AuthButton
            label={`Log in as ${info.label}`}
            onPress={formik.handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !formik.isValid}
          />
        </AuthLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  heading: { fontSize: 28, fontWeight: '700', color: colors.heading, marginBottom: 6, letterSpacing: -0.4 },
  desc: { fontSize: 15, color: colors.bodyText, marginBottom: 22 },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -10,
    marginBottom: 20,
  },
  orgText: { flex: 1, fontSize: 13, color: colors.bodyText },
  orgChange: { fontSize: 13, color: colors.accentDark, fontWeight: '600' },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.roleLabel,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roleCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.hintBg,
    borderWidth: 1,
    borderColor: colors.hintBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  hintDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  hintText: { flex: 1, fontSize: 13.5, color: colors.hintText, lineHeight: 18 },
  disabledAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  disabledTitle: { fontSize: 14, fontWeight: '700', color: colors.dangerTitle, marginBottom: 2 },
  disabledMessage: { fontSize: 13, color: colors.hintText },
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  forgotText: { fontSize: 14.5, color: colors.accentDark, fontWeight: '500' },
  submitError: { fontSize: 13, color: colors.dangerText, marginBottom: 12 },
});
