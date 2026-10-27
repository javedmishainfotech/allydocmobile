import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useChatHub from '../../hooks/useChatHub';
import Avatar from '../../components/Avatar';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

export const CHAT_WINDOW_ROUTE = 'ChatWindow';

const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function ChatRoomRow({ chat, onOpen }) {
  const time = formatTime(chat.lastMessageDateTime);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => onOpen(chat)}>
      <Avatar name={chat.recieverName} imageUrl={chat.profileImage} size={48} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.recieverName}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {chat.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * "Messages" - port of AllyDocReactApp's components/Messages -> utils/ChatRooms.jsx (shared by every
 * role): the conversation list from the chat hub (`LoadChatRooms` -> `GetChatRooms`) with a search
 * box; a conversation opens the chat screen. (The web's split view becomes list -> chat screen.)
 */
export default function ChatRoomsPage() {
  const navigation = useNavigation();
  const dockInset = useDockInset();
  const { chatRooms, getChatRooms, isConnected, connectionError } = useChatHub();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!isConnected) return;
    await getChatRooms();
    setIsLoading(false);
  }, [isConnected, getChatRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Reload when coming back from a chat, so the last-message previews are current.
  useEffect(() => navigation.addListener('focus', fetchRooms), [navigation, fetchRooms]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const filteredRooms = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return needle ? chatRooms.filter((room) => room.recieverName?.toLowerCase().includes(needle)) : chatRooms;
  }, [chatRooms, searchQuery]);

  const openChat = (chat) => navigation.navigate(CHAT_WINDOW_ROUTE, { chat });

  const header = (
    <View style={styles.header}>
      <Text style={styles.subtitle}>Your conversations</Text>
      {connectionError ? (
        <View style={styles.connError}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={adTokens.dangerDark} />
          <Text style={styles.connErrorText}>{connectionError}</Text>
        </View>
      ) : null}
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={18} color={adTokens.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={adTokens.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.flex1}>
      <FlatList
        data={isLoading ? [] : filteredRooms}
        keyExtractor={(chat, index) => String(chat.chatRoomId ?? index)}
        renderItem={({ item }) => <ChatRoomRow chat={item} onOpen={openChat} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={adTokens.primary} />
              <Text style={styles.stateText}>{connectionError ? 'Trying to connect...' : 'Loading conversations...'}</Text>
            </View>
          ) : (
            <View style={styles.state}>
              <MaterialCommunityIcons name="message-outline" size={32} color={adTokens.textMuted} />
              <Text style={styles.stateTitle}>{searchQuery ? 'No matching conversations' : 'No conversations yet'}</Text>
              <Text style={styles.stateText}>Choose from your contacts to start messaging.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16 },
  separator: { height: 8 },

  header: { gap: 10, marginBottom: 14 },
  subtitle: { fontSize: 13, color: adTokens.textSecondary },
  connError: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: adTokens.dangerLight },
  connErrorText: { flex: 1, fontSize: 12.5, color: adTokens.dangerDark },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  rowPressed: { backgroundColor: adTokens.gray50 },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  time: { fontSize: 11.5, color: adTokens.textMuted },
  preview: { fontSize: 12.5, color: adTokens.textSecondary },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
});
