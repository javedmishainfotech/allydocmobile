import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { formatUnreadCount } from '../utils/notificationUtils';
import { adTokens } from '../theme/colors';

/** First letter of the first and last word of the name ("John A. Smith" -> "JS"). */
function getInitials(fullName) {
  const words = String(fullName || 'Dr').trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function ProfileAvatar({ profile, size }) {
  const name = profile?.fullName || 'Dr';
  const image = profile?.profileImage;
  if (image && image !== 'null') {
    return <Avatar.Image size={size} source={{ uri: image }} />;
  }
  return <Avatar.Text size={size} label={name.slice(0, 2).toUpperCase()} />;
}

function DropdownItem({ icon, label, color = adTokens.textPrimary, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.itemLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Right side of the doctor navbar: notification bell with unread badge, then
 * the initials avatar whose dropdown has the profile card, Profile Settings,
 * Change Password and Logout. (Identity Proofing lives in the More sheet now,
 * not here.) `navigation` is the tab screen's own navigation - `navigate` on
 * it bubbles up to the parent stack for the pushed screens. */
export default function DoctorHeaderRight({ navigation }) {
  const { profile, logout } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [menuVisible, setMenuVisible] = useState(false);

  // Single shared Redux slice backs both this badge and the Notifications
  // screen, so a count fetched here is already in sync once that screen loads -
  // this only needs its own fetch on first mount, not a poll loop.
  useEffect(() => {
    refreshUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeMenu = () => setMenuVisible(false);
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const roleLine = [profile?.userType, roleName]
    .filter(Boolean)
    .map((part) => String(part).toUpperCase())
    .join(' | ');

  const openSettings = (tab) => {
    closeMenu();
    navigation.navigate('DoctorSettings', { tab });
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => navigation.navigate('DoctorNotification')}
        style={styles.bellButton}
        accessibilityLabel="Notifications"
        hitSlop={6}
      >
        <MaterialCommunityIcons name="bell-outline" size={22} color={adTokens.textSecondary} />
        {unreadCount > 0 ? (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText} numberOfLines={1}>
              {formatUnreadCount(unreadCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchorPosition="bottom"
        contentStyle={styles.dropdown}
        anchor={
          <Pressable
            onPress={() => setMenuVisible((visible) => !visible)}
            style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
          >
            <Avatar.Text size={30} label={getInitials(profile?.fullName)} />
          </Pressable>
        }
      >
        <View style={styles.info}>
          <ProfileAvatar profile={profile} size={44} />
          <View style={styles.infoText}>
            <Text style={styles.infoName} numberOfLines={5}>
              {profile?.fullName || 'Doctor'}
            </Text>
            {roleLine ? <Text style={styles.infoRole}>{roleLine}</Text> : null}
          </View>
        </View>

        <View style={styles.dropdownDivider} />

        <DropdownItem icon="cog-outline" label="Profile Settings" onPress={() => openSettings('profile')} />
        <DropdownItem icon="lock-outline" label="Change Password" onPress={() => openSettings('security')} />
        <DropdownItem
          icon="logout"
          label="Logout"
          color={adTokens.danger}
          onPress={() => {
            closeMenu();
            logout();
          }}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },

  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: adTokens.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: adTokens.white },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    backgroundColor: adTokens.gray50,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 9999,
  },
  triggerPressed: { backgroundColor: adTokens.white },

  dropdown: {
    width: 248,
    padding: 8,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 18,
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 },
  infoText: { flex: 1, minWidth: 0 },
  infoName: { fontSize: 14, fontWeight: '600', lineHeight: 18, color: adTokens.textPrimary },
  infoRole: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  dropdownDivider: { height: 1, backgroundColor: adTokens.border, marginVertical: 8 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  itemPressed: { backgroundColor: adTokens.gray100 },
  itemLabel: { fontSize: 14 },
});
