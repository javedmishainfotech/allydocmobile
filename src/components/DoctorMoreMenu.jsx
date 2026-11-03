import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useIdpStatus } from '../hooks/useIdpStatus';
import { toast } from '../utils/toast';
import { useDoctorMenu } from '../navigation/DoctorMenuContext';
import { adTokens } from '../theme/colors';

const TONES = {
  blue: { fg: '#2563EB', bg: '#DBEAFE' },
  amber: { fg: '#D97706', bg: '#FEF3C7' },
  violet: { fg: '#7C3AED', bg: '#EDE9FE' },
  pink: { fg: '#DB2777', bg: '#FCE7F3' },
  green: { fg: '#059669', bg: '#D1FAE5' },
  red: { fg: '#DC2626', bg: '#FEE2E2' },
  cyan: { fg: '#0891B2', bg: '#CFFAFE' },
};

// Cards cycle through these tints in order, so the grid stays colourful whatever
// the backend menu contains (it sends no per-item colour, and its icon is a web URL).
const TONE_ORDER = ['blue', 'amber', 'violet', 'pink', 'green', 'cyan', 'red'];

const IDP_BADGES = {
  not_started: { label: 'Pending', bg: '#FEF3C7', fg: '#D97706' },
  started: { label: 'In Progress', bg: '#FEF3C7', fg: '#D97706' },
  pending: { label: 'In Progress', bg: '#FEF3C7', fg: '#D97706' },
  idpsuccess: { label: 'Verified', bg: '#D1FAE5', fg: '#059669' },
  idperror: { label: 'Failed', bg: '#FEE2E2', fg: '#DC2626' },
};

const COLUMNS = 3;
const GRID_GAP = 10;
const SHEET_PADDING = 16;

function MenuCard({ card, badge, width, onPress }) {
  const tone = TONES[card.tone] || TONES.blue;
  return (
    <Pressable style={({ pressed }) => [styles.card, { width }, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: tone.bg }]}>
        <MaterialCommunityIcons name={card.icon} size={22} color={tone.fg} />
      </View>
      <Text style={styles.cardLabel} numberOfLines={2}>
        {card.label}
      </Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The "More" sheet: the backend menu entries that don't fit in the bottom bar
 * (DoctorMenuContext.moreItems, from `/AllMenus`), as a 3-column card grid with
 * search, plus Logout pinned at the bottom. Slides up like this app's other
 * bottom sheets. `navigation` is the stack-level navigation (from
 * RoleTabsNavigator), so one navigate(key) reaches the pushed screens.
 */
export default function DoctorMoreMenu({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // Exact pixel width per card so 3 always fit one row edge to edge. A percentage
  // width (e.g. 31.5%) plus the gaps can add up to more than the row, which pushed
  // the 3rd card onto the next line and left the right side empty.
  const cardWidth = Math.floor((screenWidth - SHEET_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  const { profile, logout } = useAuth();
  const idpStatus = useIdpStatus(profile?.idpStatus);
  const [query, setQuery] = useState('');
  const { moreItems } = useDoctorMenu();

  const cards = useMemo(() => {
    const all = moreItems.map((item, index) => ({
      key: item.key,
      label: item.title,
      icon: item.icon || 'circle-outline',
      tone: TONE_ORDER[index % TONE_ORDER.length],
    }));
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((card) => card.label.toLowerCase().includes(needle)) : all;
  }, [moreItems, query]);

  const idpBadge = IDP_BADGES[idpStatus] || IDP_BADGES.not_started;

  const close = () => {
    setQuery('');
    onClose();
  };

  const handlePress = (card) => {
    close();
    // Same rule as the old navbar IDP icon: nothing to open until an admin starts IDP.
    if (card.key === 'IdentityProofing' && (idpStatus === 'not_started' || idpStatus === '')) {
      toast.info('Your IDP has not been initiated by the admin yet.');
      return;
    }
    navigation.navigate(card.key);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Toast />
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>More</Text>
            <Pressable style={styles.closeButton} onPress={close} hitSlop={8} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={18} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={adTokens.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search screens..."
              placeholderTextColor={adTokens.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={16} color={adTokens.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {cards.length === 0 ? (
              <Text style={styles.emptyText}>No screens found.</Text>
            ) : (
              cards.map((card) => (
                <MenuCard
                  key={card.key}
                  card={card}
                  badge={card.key === 'IdentityProofing' ? idpBadge : null}
                  width={cardWidth}
                  onPress={() => handlePress(card)}
                />
              ))
            )}
          </ScrollView>

          <Pressable
            style={[styles.logoutButton, { marginBottom: Math.max(insets.bottom, 14) }]}
            onPress={() => {
              close();
              logout();
            }}
          >
            <MaterialCommunityIcons name="logout" size={18} color={adTokens.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SHEET_PADDING,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '700', color: adTokens.textPrimary },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: adTokens.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: adTokens.gray100,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },

  gridScroll: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingBottom: 8 },
  emptyText: { width: '100%', textAlign: 'center', paddingVertical: 32, fontSize: 13, color: adTokens.textSecondary },

  card: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.gray200,
    ...adTokens.cardShadow,
  },
  cardPressed: { backgroundColor: adTokens.primaryLight, borderColor: adTokens.primary },
  cardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 11.5, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'center', minHeight: 28 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, marginTop: -2 },
  badgeText: { fontSize: 9.5, fontWeight: '700' },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: adTokens.dangerLight,
  },
  logoutText: { fontSize: 14.5, fontWeight: '700', color: adTokens.danger },
});
