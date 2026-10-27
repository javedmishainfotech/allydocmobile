import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Port of .auth-role-card / .auth-role-card.active in newStyle.css.
export default function RoleCard({ icon, label, description, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, active ? styles.cardActive : styles.cardInactive]}
    >
      {active && (
        <View style={styles.check}>
          <MaterialCommunityIcons name="check-circle" size={18} color={colors.accentDark} />
        </View>
      )}
      <View style={[styles.iconWrap, active ? styles.iconWrapActive : styles.iconWrapInactive]}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={active ? colors.accent : colors.roleIconColorInactive}
        />
      </View>
      <Text style={[styles.title, active && styles.titleActive]}>{label}</Text>
      <Text style={[styles.desc, active && styles.descActive]}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 2,
  },
  cardInactive: { backgroundColor: colors.white, borderColor: colors.cardBorderInactive },
  cardActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  check: { position: 'absolute', top: 8, right: 8 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapInactive: { backgroundColor: colors.roleIconBgInactive },
  iconWrapActive: { backgroundColor: colors.accentActiveIconBg },
  title: { fontSize: 15, fontWeight: '700', color: colors.roleTitleInactive },
  titleActive: { color: colors.accentDark },
  desc: { fontSize: 12, color: colors.roleDescInactive, textAlign: 'center', lineHeight: 15 },
  descActive: { color: colors.accent },
});
