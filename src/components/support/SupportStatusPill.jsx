import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_TONES } from '../../utils/supportFields';
import { adTokens } from '../../theme/colors';

const TONE_COLORS = {
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

export default function SupportStatusPill({ status }) {
  const tone = TONE_COLORS[STATUS_TONES[status]] || TONE_COLORS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.color }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  text: { fontSize: 11, fontWeight: '800' },
});
