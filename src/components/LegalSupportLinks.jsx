import React from 'react';
import { List, Divider, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { IN_APP_LEGAL_PAGES, EXTERNAL_INFO_PAGES } from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';

/** Shared "Legal & Support" list - used by the generic placeholder dashboard
 * (Patient/Nurse, until their own modules exist) and the Doctor drawer's
 * dedicated Support screen, so the links aren't duplicated in two places. */
export default function LegalSupportLinks({ showHeading = true }) {
  const navigation = useNavigation();

  return (
    <>
      {showHeading && (
        <Text variant="labelLarge" style={{ marginBottom: 8, color: '#6B7280' }}>
          Legal & Support
        </Text>
      )}
      <Divider />
      <List.Item
        title={IN_APP_LEGAL_PAGES.termsAndConditions.title}
        left={(iconProps) => <List.Icon {...iconProps} icon="file-document-outline" />}
        onPress={() => navigation.navigate('LegalWebView', IN_APP_LEGAL_PAGES.termsAndConditions)}
      />
      <List.Item
        title={IN_APP_LEGAL_PAGES.privacyPolicy.title}
        left={(iconProps) => <List.Icon {...iconProps} icon="shield-lock-outline" />}
        onPress={() => navigation.navigate('LegalWebView', IN_APP_LEGAL_PAGES.privacyPolicy)}
      />
      <List.Item
        title={EXTERNAL_INFO_PAGES.contactUs.title}
        left={(iconProps) => <List.Icon {...iconProps} icon="email-outline" />}
        right={(iconProps) => <List.Icon {...iconProps} icon="open-in-new" />}
        onPress={() => openExternalLink(EXTERNAL_INFO_PAGES.contactUs.url)}
      />
      <List.Item
        title={EXTERNAL_INFO_PAGES.faq.title}
        left={(iconProps) => <List.Icon {...iconProps} icon="help-circle-outline" />}
        right={(iconProps) => <List.Icon {...iconProps} icon="open-in-new" />}
        onPress={() => openExternalLink(EXTERNAL_INFO_PAGES.faq.url)}
      />
      <List.Item
        title={EXTERNAL_INFO_PAGES.refundPolicy.title}
        left={(iconProps) => <List.Icon {...iconProps} icon="cash-refund" />}
        right={(iconProps) => <List.Icon {...iconProps} icon="open-in-new" />}
        onPress={() => openExternalLink(EXTERNAL_INFO_PAGES.refundPolicy.url)}
      />
    </>
  );
}
