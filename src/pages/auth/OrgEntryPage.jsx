import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOrg } from '../../hooks/useOrg';
import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import FormField from '../../components/FormField';
import AuthButton from '../../components/AuthButton';

/**
 * Mobile equivalent of the web app's URL-based org detection. On the web,
 * whether a login is org-scoped is decided purely by the URL the user is on
 * (`/login` vs `/acmehospital/login`) - the entered `orgName` becomes
 * `clientName` in the encrypted login payload (see SignIn/index.jsx:24,101).
 * A phone has no URL bar, so this screen is the explicit equivalent: capture
 * the org code (or skip it) before the login form even renders.
 */
export default function OrgEntryPage({ navigation }) {
  const { chooseOrg } = useOrg();
  const [code, setCode] = useState('');

  const goToLogin = (orgName) => {
    chooseOrg(orgName);
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <AuthLayout hideFooter>
        {/* Says what THIS page is. "Welcome to AllyDoc" now belongs to the onboarding landing page. */}
        <Text style={styles.heading}>Organization code</Text>
        <Text style={styles.desc}>
          If you&apos;re signing in through a hospital or clinic, enter its organization code
          below. Freelance clinicians and patients without a clinic can skip this step.
        </Text>

        <FormField
          label="Organization code"
          icon="domain"
          iconSet="material"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. acmehospital"
          value={code}
          onChangeText={setCode}
        />

        <AuthButton
          label="Continue"
          disabled={!code.trim()}
          onPress={() => goToLogin(code.trim())}
        />

        <Pressable style={styles.skipRow} onPress={() => goToLogin('')}>
          <Text style={styles.skipText}>Continue without an organization code</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.accentDark} />
        </Pressable>
      </AuthLayout>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: colors.white },
  heading: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 24, lineHeight: 20 },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  skipText: { color: colors.accentDark, fontSize: 14.5, fontWeight: '500' },
});
