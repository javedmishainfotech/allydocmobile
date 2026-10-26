import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

/** Shown for patient-detail tabs that depend on the DoseSpot integration
 * (Prescriptions, Medication History, Allergies, Coverage, Self Reported,
 * RxChange/Refill Requests) - not yet ported, matching this project's
 * established pattern of surfacing a clear "not built yet" notice instead of
 * silently hiding the tab or faking data. */
export default function DeferredTabNotice({ label }) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="progress-wrench" size={30} color={adTokens.textMuted} />
      <Text style={styles.title}>{label} isn't available in the app yet</Text>
      <Text style={styles.subtitle}>
        This section depends on the DoseSpot prescribing integration, which is planned as its own
        module. It's fully available on the web app in the meantime.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  title: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center', lineHeight: 18 },
});
