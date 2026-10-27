import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useIdpStatus } from '../hooks/useIdpStatus';
import { toast } from '../utils/toast';
import { formatUnreadCount } from '../utils/notificationUtils';
import { ROLE_ROUTE_KEYS, normalizeRole } from '../navigation/doctorMenuItems';
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

/** Right side of the doctor header (AppHeader, on the dark-blue brand background,
 * so white icons): the Identity Proofing shortcut with its status mark, the
 * notification bell with unread badge, then the initials avatar whose dropdown has
 * the profile card, Profile Settings, Change Password and Logout.
 * The IDP shortcut lives here (not only in the More sheet) because the backend
 * menu does not always include Identity Proofing, and a doctor must always be able
 * to reach it. `navigation` is the tab screen's own navigation - `navigate` on
 * it bubbles up to the parent stack for the pushed screens. */
export default function DoctorHeaderRight({ navigation }) {
  const { profile, logout } = useAuth();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [menuVisible, setMenuVisible] = useState(false);
  const idpStatus = useIdpStatus(profile?.idpStatus);

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

  // Same rules as the web header: no IDP for the 'doctor admin' role; nothing to open until an
  // admin initiates it (not_started); a green tick when done, a red cross while in progress / failed.
  // Identity Proofing is a doctor-only flow (web Header.jsx: doctor roles, not Doctor Admin, not nurse).
  const showIdp = roleName === 'doctor' || roleName === 'doctor sub';
  // Settings / Notifications are separate routes per role, so each role's menu stays its own.
  const routeKeys = ROLE_ROUTE_KEYS[normalizeRole(roleName)] || ROLE_ROUTE_KEYS.doctor;
  const idpNotStarted = idpStatus === 'not_started';
  const idpDone = idpStatus === 'idpsuccess';
  const idpOpen = idpStatus === 'started' || idpStatus === 'pending' || idpStatus === 'idperror';

  const openIdp = () => {
    if (idpNotStarted) {
      toast.info('Your IDP has not been initiated by the admin yet.');
      return;
    }
    navigation.navigate('IdentityProofing');
  };

  const openSettings = (tab) => {
    closeMenu();
    navigation.navigate(routeKeys.settings, { tab });
  };

  return (
    <View style={styles.row}>
      {showIdp ? (
        <Pressable
          onPress={openIdp}
          style={[styles.idpButton, idpNotStarted && styles.idpDimmed]}
          accessibilityRole="button"
          accessibilityLabel={idpNotStarted ? 'Identity verification, not initiated by admin' : 'Identity verification'}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="shield-account-outline" size={23} color={adTokens.white} />
          {idpDone ? (
            <MaterialCommunityIcons name="check-circle" size={13} color="#34D399" style={styles.idpMark} />
          ) : null}
          {idpOpen ? (
            <MaterialCommunityIcons name="close-circle" size={13} color="#F87171" style={styles.idpMark} />
          ) : null}
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate(routeKeys.notification)}
        style={styles.bellButton}
        accessibilityLabel="Notifications"
        hitSlop={6}
      >
        <MaterialCommunityIcons name="bell-outline" size={23} color={adTokens.white} />
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
            <Avatar.Text
              size={30}
              label={getInitials(profile?.fullName)}
              color={adTokens.white}
              style={styles.triggerAvatar}
            />
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
  // Tight gap + no right padding: the IDP, bell and avatar sit packed against the right edge
  // (each button already has its own touch padding around its icon).
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  idpButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Greyed (not disabled): tapping still explains why there is nothing to open.
  idpDimmed: { opacity: 0.5 },
  idpMark: { position: 'absolute', top: 2, right: 2 },
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
    // A ring in the header's own dark blue separates the badge from the bell icon.
    borderWidth: 1.5,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: adTokens.white },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    // Glass ring on the dark-blue header (the dropdown itself stays a white card).
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 9999,
  },
  triggerPressed: { backgroundColor: 'rgba(255, 255, 255, 0.26)' },
  triggerAvatar: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },

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
