import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchMyTickets } from '../../services/supportService';
import { relativeTime } from '../../utils/supportFields';
import SupportStatusPill from '../../components/support/SupportStatusPill';
import NewTicketModal from '../../components/support/NewTicketModal';
import LegalSupportLinks from '../../components/LegalSupportLinks';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const STAT_CARDS = [
  { key: 'total', label: 'Total', icon: 'email-outline', accent: '#4F46E5' },
  { key: 'new', label: 'New', icon: 'email-plus-outline', accent: '#2563EB' },
  { key: 'inProgress', label: 'In Progress', icon: 'eye-outline', accent: '#D97706' },
  { key: 'resolved', label: 'Resolved', icon: 'check-circle-outline', accent: '#16A34A' },
  { key: 'closed', label: 'Closed', icon: 'lock-outline', accent: '#64748B' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Resolved', label: 'Resolved' },
  { key: 'Closed', label: 'Closed' },
];

function TicketRow({ ticket, onPress }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.flex1}>
        <Text style={styles.subject} numberOfLines={1}>
          {ticket.subject || '(no subject)'}
        </Text>
        <View style={styles.metaRow}>
          <SupportStatusPill status={ticket.status} />
          <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
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
          {ticket.lastActivityBy === 'Admin' && ticket.status !== 'Closed' ? (
            <View style={styles.newReplyBadge}>
              <Text style={styles.newReplyText}>New reply</Text>
            </View>
          ) : null}
        </View>
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
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.flex1}>
                <Text style={styles.title}>Support</Text>
                <Text style={styles.subtitle}>Raise an issue, get a ticket number, and track progress until Support resolves it.</Text>
              </View>
              <Pressable style={styles.refreshButton} onPress={load} disabled={isLoading}>
                <Feather name="refresh-cw" size={16} color={adTokens.textSecondary} />
              </Pressable>
            </View>

            <Pressable style={styles.newTicketButton} onPress={() => setNewTicketOpen(true)}>
              <Feather name="plus" size={15} color={adTokens.white} />
              <Text style={styles.newTicketText}>New ticket</Text>
            </Pressable>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={STAT_CARDS}
              keyExtractor={(card) => card.key}
              contentContainerStyle={styles.statRow}
              renderItem={({ item: card }) => (
                <View style={[styles.statCard, { borderColor: card.accent }]}>
                  <MaterialCommunityIcons name={card.icon} size={16} color={card.accent} />
                  <Text style={styles.statValue}>{counts[card.key] ?? 0}</Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                </View>
              )}
            />

            <View style={styles.searchBox}>
              <Feather name="search" size={15} color={adTokens.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search ticket number, subject..."
                placeholderTextColor={adTokens.textMuted}
              />
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
                <MaterialCommunityIcons name="inbox-outline" size={26} color={adTokens.textMuted} />
                <Text style={styles.stateText}>{hasFilters ? 'No tickets match your search/filter.' : "You haven't raised any tickets yet."}</Text>
              </View>
            ) : null}
          </>
        }
        ListFooterComponent={
          <View style={styles.legalWrap}>
            <LegalSupportLinks showHeading />
          </View>
        }
      />

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
  content: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 19, fontWeight: '800', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2, lineHeight: 17 },
  refreshButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: adTokens.border },

  newTicketButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: adTokens.successDark,
    marginTop: 2,
  },
  newTicketText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },

  statRow: { gap: 10, paddingVertical: 4 },
  statCard: { width: 92, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: adTokens.white },
  statValue: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: adTokens.textSecondary, textAlign: 'center' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  searchInput: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },

  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  filterChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  filterChipTextActive: { color: adTokens.white },

  state: { alignItems: 'center', gap: 8, paddingVertical: 36 },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  separator: { height: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  subject: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  ticketNumber: { fontSize: 11.5, color: adTokens.textSecondary },
  metaIcon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaIconText: { fontSize: 11, color: adTokens.textSecondary },
  newReplyBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.successLight },
  newReplyText: { fontSize: 10, fontWeight: '800', color: adTokens.successDark },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 11, color: adTokens.textMuted },

  legalWrap: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
});
