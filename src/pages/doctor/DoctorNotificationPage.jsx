import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../../hooks/useNotifications';
import { timeAgo, notificationVisual, cleanNotificationMessage } from '../../utils/notificationUtils';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

const TABS = [
  { key: 'all', label: 'All', icon: 'inbox-outline' },
  { key: 'unread', label: 'Unread', icon: 'email-outline' },
];

const TONE_COLORS = {
  teal: '#0D9488',
  violet: '#7C3AED',
  blue: '#2563EB',
  green: '#16A34A',
  cyan: '#0891B2',
  amber: '#D97706',
  slate: adTokens.textSecondary,
};

function NotificationRow({ notification, onPress }) {
  const isUnread = !notification.isRead;
  const visual = notificationVisual(notification.message, notification.notificationType);
  const tone = TONE_COLORS[visual.tone] || adTokens.textSecondary;

  return (
    <Pressable
      onPress={isUnread ? onPress : undefined}
      style={({ pressed }) => [
        styles.row,
        isUnread && styles.rowUnread,
        pressed && isUnread && styles.rowPressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tone}1F` }]}>
        <MaterialCommunityIcons name={visual.icon} size={18} color={tone} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowCategory}>{visual.label}</Text>
          {notification.time ? <Text style={styles.rowTime}>{timeAgo(notification.time)}</Text> : null}
        </View>
        <Text style={styles.rowMessage}>{cleanNotificationMessage(notification.message)}</Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

/**
 * Port of AllyDocReactAppLatest's shared Notifications page (web:
 * module/Patient/Pages/Notifications, reused as-is for Doctor) - same two
 * tabs (All / Unread), same "Mark all as read" action, same three backend
 * endpoints (GET /AllNotification, GET /UnReadNotification,
 * POST /UpdateNotificationStatus). Tapping an unread row marks it read -
 * the web app has no per-notification destination link for these rows
 * (that only exists for the separate FCM/DoseSpot real-time dropdowns,
 * which aren't part of this screen).
 */
export default function DoctorNotificationPage() {
  const dockInset = useDockInset();
  const { items, status, tab, total, unreadCount, loadTab, refreshUnreadCount, markAsRead } =
    useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    loadTab(activeTab);
    refreshUnreadCount();
  }, [activeTab, loadTab, refreshUnreadCount]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refresh on screen focus (drawer re-entry), not on a timer - mirrors the
  // web app's on-mount-only fetch without adding polling this app doesn't have.
  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  const handleMarkAll = async () => {
    const unread = items.filter((item) => !item.isRead);
    if (!unread.length) return;
    setMarkingAll(true);
    for (const item of unread) {
      // eslint-disable-next-line no-await-in-loop
      await markAsRead(item.id, item.notificationSource || 'local');
    }
    setMarkingAll(false);
    load();
  };

  const isLoading = status === 'loading' && tab === activeTab;
  const showingItems = tab === activeTab ? items : [];
  // FlatList renders exactly one of (list rows) or ListEmptyComponent - never
  // both - so loading/error/empty all go through ListEmptyComponent instead
  // of competing with the rows for the same scroll area.
  const listData = isLoading || status === 'failed' ? [] : showingItems;

  return (
    <FlatList
      style={styles.flex1}
      data={listData}
      keyExtractor={(notification) => String(notification.id)}
      renderItem={({ item: notification }) => (
        <NotificationRow
          notification={notification}
          onPress={() => markAsRead(notification.id, notification.notificationSource || 'local')}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.rowGap} />}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      ListHeaderComponent={
        <>
          {/* No repeated "Notifications" title here - the navbar above already shows it. */}
          <View style={styles.headerRow}>
            <Text style={[styles.pageSubtitle, styles.flexShrink]}>Check and manage all your notifications.</Text>
            <Pressable
              style={[styles.markAllButton, (markingAll || unreadCount === 0) && styles.markAllButtonDisabled]}
              disabled={markingAll || unreadCount === 0}
              onPress={handleMarkAll}
            >
              <MaterialCommunityIcons name="check-all" size={15} color={unreadCount === 0 ? adTokens.textMuted : adTokens.primary} />
              <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>Mark all as read</Text>
            </Pressable>
          </View>

          <View style={styles.tabBar}>
            {TABS.map((item) => {
              const isActive = activeTab === item.key;
              const count = item.key === 'unread' ? unreadCount : total;
              return (
                <Pressable key={item.key} style={styles.tabButton} onPress={() => setActiveTab(item.key)}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={15}
                    color={isActive ? adTokens.primary : adTokens.textSecondary}
                  />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {item.label}
                    {item.key === activeTab && count > 0 ? ` (${count})` : ''}
                  </Text>
                  {isActive ? <View style={styles.tabUnderline} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={adTokens.primary} />
          </View>
        ) : status === 'failed' ? (
          <View style={styles.stateBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
            <Text style={styles.stateText}>Unable to load notifications.</Text>
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stateBox}>
            <MaterialCommunityIcons name="bell-off-outline" size={28} color={adTokens.textMuted} />
            <Text style={styles.stateText}>
              {activeTab === 'unread' ? 'No unread notifications.' : 'No notifications to display at the moment.'}
            </Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flexShrink: { flexShrink: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageSubtitle: { fontSize: 12.5, color: adTokens.textSecondary },

  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  markAllButtonDisabled: { opacity: 0.6 },
  markAllText: { fontSize: 12, fontWeight: '600', color: adTokens.primary },
  markAllTextDisabled: { color: adTokens.textMuted },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: adTokens.gray100,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    gap: 4,
  },
  tabButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  tabLabelActive: { color: adTokens.primary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: adTokens.primary,
    borderRadius: 1,
  },

  content: { paddingBottom: 32 },
  rowGap: { height: 10 },

  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16, gap: 10 },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: adTokens.primary },
  retryButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.gray200,
    backgroundColor: adTokens.white,
  },
  rowUnread: { backgroundColor: adTokens.primaryTint, borderColor: adTokens.primaryLight },
  rowPressed: { opacity: 0.7 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCategory: { fontSize: 11, fontWeight: '700', color: adTokens.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  rowTime: { fontSize: 11, color: adTokens.textMuted },
  rowMessage: { fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: adTokens.primary, marginTop: 6 },
});
