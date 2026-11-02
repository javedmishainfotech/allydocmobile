import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchMyTickets } from '../../services/supportService';
import { relativeTime } from '../../utils/supportFields';
import SupportStatusPill from '../../components/support/SupportStatusPill';
import NewTicketModal from '../../components/support/NewTicketModal';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const STAT_CARDS = [
  { key: 'total', label: 'Total', icon: 'email-outline', accent: adTokens.primary, tint: adTokens.primaryTint },
  { key: 'new', label: 'New', icon: 'email-plus-outline', accent: adTokens.infoDark, tint: adTokens.infoTint },
  { key: 'inProgress', label: 'In Progress', icon: 'eye-outline', accent: adTokens.warningDark, tint: adTokens.warningTint },
  { key: 'resolved', label: 'Resolved', icon: 'check-circle-outline', accent: adTokens.successDark, tint: adTokens.successTint },
  { key: 'closed', label: 'Closed', icon: 'lock-outline', accent: adTokens.textSecondary, tint: adTokens.gray100 },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Resolved', label: 'Resolved' },
  { key: 'Closed', label: 'Closed' },
];

const SUBJECT_ICONS = {
  technical: 'wrench-outline',
  billing: 'cash-multiple',
  prescription: 'prescription',
  appointment: 'calendar-outline',
  account: 'account-cog-outline',
};

function subjectIconFor(subject) {
  const key = String(subject || '').toLowerCase();
  const match = Object.keys(SUBJECT_ICONS).find((k) => key.includes(k));
  return SUBJECT_ICONS[match] || 'message-text-outline';
}

function TicketRow({ ticket, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={subjectIconFor(ticket.subject)} size={18} color={adTokens.primaryDark} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.subject} numberOfLines={1}>
          {ticket.subject || '(no subject)'}
        </Text>
        <View style={styles.metaRow}>
          <SupportStatusPill status={ticket.status} />
          <Text style={styles.ticketNumber}>#{ticket.ticketNumber}</Text>
          {ticket.attachmentCount > 0 ? (
            <View style={styles.metaIcon}>
              <Feather name="paperclip" size={11} color={adTokens.textSecondary} />
              <Text style={styles.metaIconText}>{ticket.attachmentCount}</Text>
            </View>
          ) : null}
          {ticket.replyCount > 0 ? (
            <View style={styles.metaIcon}>
              <Feather name="message-square" size={11} color={adTokens.textSecondary} />
              <Text style={styles.metaIconText}>{ticket.replyCount}</Text>
            </View>
          ) : null}
        </View>
        {ticket.lastActivityBy === 'Admin' && ticket.status !== 'Closed' ? (
          <View style={styles.newReplyBadge}>
            <View style={styles.newReplyDot} />
            <Text style={styles.newReplyText}>New reply from Support</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.time}>{relativeTime(ticket.lastActivityOn)}</Text>
        <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
      </View>
    </Pressable>
  );
}

/**
 * Port of AllyDocReactApp's module/Support/SupportPage.jsx ("My Support Tickets"): raise a ticket, get
 * a ticket number, and track it through New -> In Progress -> Resolved -> Closed. Shared by every role
 * (same as web - Support is identical for Patient/Doctor/Nurse, keyed off the signed-in user's own
 * tickets server-side). Row tap pushes `SupportTicketDetail` (the conversation/reply/close screen).
 * Visual design (hero banner, gradient stat tiles, FAB) is mobile-native polish on top of the same
 * data/flow as web, matching the rest of the app's dashboard-style screens rather than web's own CSS.
 */
export default function DoctorSupportPage() {
  const navigation = useNavigation();
  const dockInset = useDockInset();
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ total: 0, new: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    const result = await fetchMyTickets({ status: statusFilter, search: debouncedSearch });
    if (!result.success) {
      setTickets([]);
      setLoadError(result.message || 'Could not load your tickets.');
      setIsLoading(false);
      return;
    }
    setTickets(Array.isArray(result.data?.items) ? result.data.items : []);
    setCounts({ total: 0, new: 0, inProgress: 0, resolved: 0, closed: 0, ...(result.data?.counts || {}) });
    setIsLoading(false);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = statusFilter !== 'all' || Boolean(debouncedSearch);

  return (
    <View style={styles.screen}>
      <FlatList
        data={isLoading || loadError ? [] : tickets}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TicketRow ticket={item} onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: item.id })} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[styles.content, { paddingBottom: 96 + dockInset }]}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <LinearGradient colors={['#1E3A5F', '#1D4ED8']} style={styles.hero}>
              <View style={styles.heroRow}>
                <View style={styles.heroIconBubble}>
                  <MaterialCommunityIcons name="lifebuoy" size={22} color={adTokens.white} />
                </View>
                <Pressable style={styles.refreshButton} onPress={load} disabled={isLoading}>
                  <Feather name="refresh-cw" size={15} color={adTokens.white} />
                </Pressable>
              </View>
              <Text style={styles.heroTitle}>Support Center</Text>
              <Text style={styles.heroSub}>Raise an issue, get a ticket number, and track it until it's resolved.</Text>
              <Pressable style={styles.newTicketButton} onPress={() => setNewTicketOpen(true)}>
                <Feather name="plus-circle" size={16} color={adTokens.primaryDark} />
                <Text style={styles.newTicketText}>Raise a new ticket</Text>
              </Pressable>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Overview</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={STAT_CARDS}
                keyExtractor={(card) => card.key}
                contentContainerStyle={styles.statRow}
                renderItem={({ item: card }) => (
                  <View style={[styles.statCard, { backgroundColor: card.tint, borderColor: card.accent }]}>
                    <View style={[styles.statIconBubble, { backgroundColor: adTokens.white }]}>
                      <MaterialCommunityIcons name={card.icon} size={16} color={card.accent} />
                    </View>
                    <Text style={[styles.statValue, { color: card.accent }]}>{counts[card.key] ?? 0}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </View>
                )}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Find a ticket</Text>
              <View style={styles.filterCard}>
                <View style={styles.searchBox}>
                  <Feather name="search" size={15} color={adTokens.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search ticket number, subject..."
                    placeholderTextColor={adTokens.textMuted}
                  />
                  {search ? (
                    <Pressable onPress={() => setSearch('')} hitSlop={8}>
                      <Feather name="x-circle" size={15} color={adTokens.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={STATUS_FILTERS}
                  keyExtractor={(filter) => filter.key}
                  contentContainerStyle={styles.filterRow}
                  renderItem={({ item: filter }) => {
                    const active = statusFilter === filter.key;
                    return (
                      <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatusFilter(filter.key)}>
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your tickets</Text>

              {isLoading ? (
                <View style={styles.state}>
                  <ActivityIndicator size="large" color={adTokens.primary} />
                  <Text style={styles.stateText}>Loading your tickets...</Text>
                </View>
              ) : loadError ? (
                <View style={styles.state}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={26} color={adTokens.danger} />
                  <Text style={styles.stateText}>{loadError}</Text>
                  <Pressable style={styles.retryButton} onPress={load}>
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : tickets.length === 0 ? (
                <View style={styles.state}>
                  <View style={styles.emptyIconBubble}>
                    <MaterialCommunityIcons name="inbox-outline" size={28} color={adTokens.primaryDark} />
                  </View>
                  <Text style={styles.stateText}>{hasFilters ? 'No tickets match your search/filter.' : "You haven't raised any tickets yet."}</Text>
                  {!hasFilters ? (
                    <Pressable style={styles.retryButton} onPress={() => setNewTicketOpen(true)}>
                      <Text style={styles.retryText}>Raise your first ticket</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        }
      />

      <Pressable style={[styles.fab, { bottom: 20 + dockInset }]} onPress={() => setNewTicketOpen(true)}>
        <Feather name="plus" size={22} color={adTokens.white} />
      </Pressable>

      <NewTicketModal
        visible={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={(created) => {
          setNewTicketOpen(false);
          setStatusFilter('all');
          setSearch('');
          load();
          if (created?.id) navigation.navigate('SupportTicketDetail', { ticketId: created.id });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  content: { padding: 16, gap: 18 },
  headerStack: { gap: 22 },
  section: { gap: 10 },

  hero: { borderRadius: 18, padding: 18, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: adTokens.white, marginTop: 14 },
  heroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 17 },

  newTicketButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: adTokens.white,
    marginTop: 14,
  },
  newTicketText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },

  statRow: { gap: 12, paddingVertical: 2, paddingRight: 2 },
  statCard: {
    width: 100,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    ...adTokens.cardShadow,
  },
  statIconBubble: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: adTokens.textSecondary, textAlign: 'center' },

  filterCard: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.gray200,
    backgroundColor: adTokens.gray50,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },

  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  filterChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  filterChipTextActive: { color: adTokens.white },

  sectionLabel: { fontSize: 13.5, fontWeight: '800', color: adTokens.textPrimary, letterSpacing: 0.2 },

  state: { alignItems: 'center', gap: 8, paddingVertical: 36 },
  emptyIconBubble: { width: 56, height: 56, borderRadius: 18, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary, marginTop: 4 },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  separator: { height: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowPressed: { backgroundColor: adTokens.gray50 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  subject: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  ticketNumber: { fontSize: 11.5, color: adTokens.textSecondary },
  metaIcon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaIconText: { fontSize: 11, color: adTokens.textSecondary },
  newReplyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  newReplyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: adTokens.successDark },
  newReplyText: { fontSize: 10.5, fontWeight: '700', color: adTokens.successDark },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 11, color: adTokens.textMuted },

  fab: {
    position: 'absolute',
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: adTokens.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
