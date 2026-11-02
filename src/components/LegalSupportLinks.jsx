import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { IN_APP_LEGAL_PAGES } from '../constants/legalLinks';
import { adTokens } from '../theme/colors';

const LINKS = [
  { key: 'termsAndConditions', icon: 'file-document-outline' },
  { key: 'privacyPolicy', icon: 'shield-lock-outline' },
  { key: 'contactUs', icon: 'email-outline' },
  { key: 'faq', icon: 'help-circle-outline' },
  { key: 'refundPolicy', icon: 'cash-refund' },
];

/** Shared "Legal & Support" list (Terms/Privacy/Contact/FAQ/Refund) - rendered as its own
 * Settings tab for every role. Web has no persistent home for these inside the authenticated
 * app either (only a one-off Privacy Policy link on the Doctor/Patient dashboards), so this is
 * a mobile-specific placement, not a port of a particular web screen. Every page opens in-app
 * via the shared LegalWebView screen, same as Terms & Conditions / Privacy Policy do - none of
 * them hand off to the device browser. */
export default function LegalSupportLinks({ showHeading = true }) {
  const navigation = useNavigation();

  return (
    <View>
      {showHeading && <Text style={styles.heading}>Legal & Support</Text>}
      <View style={styles.card}>
        {LINKS.map((link, index) => {
          const page = IN_APP_LEGAL_PAGES[link.key];
          return (
            <Pressable
              key={link.key}
              style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('LegalWebView', page)}
            >
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name={link.icon} size={18} color={adTokens.primaryDark} />
              </View>
              <Text style={styles.rowTitle}>{page.title}</Text>
              <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 13, fontWeight: '700', color: adTokens.textSecondary, marginBottom: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    overflow: 'hidden',
    ...adTokens.cardShadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: adTokens.gray100 },
  rowPressed: { backgroundColor: adTokens.gray50 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
});
