import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/** "Coming soon" screen for Doctor drawer items not yet implemented in this
 * phase - keeps the full navigation shell testable now, with each screen's
 * real content rolled out one at a time in later approval cycles. */
export default function PlaceholderScreen({ title, icon = 'progress-wrench' }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={48} color={colors.roleLabel} />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  title: { marginTop: 10, color: colors.heading },
  subtext: { color: colors.bodyText },
});
