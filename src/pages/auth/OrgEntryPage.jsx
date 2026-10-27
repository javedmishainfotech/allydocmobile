import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
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

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
          onPress={() => goToLogin('')}
          accessibilityRole="button"
        >
          <View style={styles.skipIcon}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.accentDark} />
          </View>
          <View style={styles.skipBody}>
            <Text style={styles.skipTitle}>Continue without a code</Text>
            <Text style={styles.skipSub}>For freelancer doctors and patients</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accentDark} />
        </Pressable>
      </AuthLayout>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: colors.white },
  heading: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 24, lineHeight: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.inputBorder },
  dividerText: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: colors.roleLabel },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    backgroundColor: colors.hintBg,
    borderWidth: 1,
    borderColor: colors.hintBorder,
    borderRadius: 12,
  },
  skipButtonPressed: { opacity: 0.8 },
  skipIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  skipBody: { flex: 1 },
  skipTitle: { fontSize: 15, fontWeight: '600', color: colors.accentDark },
  skipSub: { fontSize: 12.5, color: colors.bodyText, marginTop: 1 },
});
