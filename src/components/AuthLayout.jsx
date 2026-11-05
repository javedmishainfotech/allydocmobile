import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import BrandBanner from './BrandBanner';
import { colors } from '../theme/colors';
import { IN_APP_LEGAL_PAGES } from '../constants/legalLinks';

/**
 * Mirrors AllyDocReactApp's AuthLayout.jsx for a phone: the form area, plus the
 * web page's dark-blue branding panel carried over as a slim header band (its
 * gradient, decorative circles and white logo - see BrandBanner). The panel's
 * desktop-only feature cards and stats are not ported.
 *
 * BrandBanner sits outside the ScrollView so it stays pinned while only the
 * form/footer area below it scrolls - callers should not wrap this in their
 * own ScrollView.
 */
export default function AuthLayout({ children, hideFooter = false }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const openLegalPage = (page) => {
    navigation.navigate('LegalWebView', page);
  };

  return (
    <View style={styles.screen}>
      {/* The dark-blue brand header with the white AllyDoc logo - the web login page's branding panel. */}
      <BrandBanner />

      {/* Edge-to-edge (always on, Android SDK 58): the system nav bar / gesture area overlaps the
          screen bottom, so the bottom padding is the design's 24 PLUS the real inset.
          KeyboardAwareScrollView (react-native-keyboard-controller) replaces a plain ScrollView
          here because edge-to-edge breaks Android's automatic window resize on keyboard open -
          this scrolls the focused field above the keyboard itself instead of relying on that. */}
      <KeyboardAwareScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.page, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <View style={styles.formArea}>{children}</View>

        {!hideFooter && (
          <Text style={styles.footer}>
            By continuing you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() => openLegalPage(IN_APP_LEGAL_PAGES.termsAndConditions)}
            >
              Terms of Use
            </Text>{' '}
            and{' '}
            <Text
              style={styles.footerLink}
              onPress={() => openLegalPage(IN_APP_LEGAL_PAGES.privacyPolicy)}
            >
              Privacy Policy
            </Text>
          </Text>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scrollArea: { flex: 1 },
  page: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  formArea: { width: '100%' },
  footer: { marginTop: 24, fontSize: 13, color: colors.roleLabel, textAlign: 'center' },
  footerLink: { color: colors.accentDark, textDecorationLine: 'underline' },
});
