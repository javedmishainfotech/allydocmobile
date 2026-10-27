import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './useAuth';
import { getItem } from '../utils/storage';
import { SIGNALR_URL } from '../services/chatService';

/** The hub may send a single message object or a one-element array. */
const normalizeIncomingMessage = (payload) => {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload.find((item) => item != null) ?? null;
  return typeof payload === 'object' ? payload : null;
};

const normalizeMessageList = (payload) =>
  Array.isArray(payload) ? payload.filter((item) => item != null && typeof item === 'object') : [];

const CONNECT_RETRY_MS = 5000;

/**
 * The chat connection - port of AllyDocReactApp's utils/useSignalR.js: connects to
 * `<signalr>/chathub` (automatic reconnect, exponential back-off capped at 30s) and exposes
 *   - `chatRooms`  (`LoadChatRooms(userId)` -> `GetChatRooms`),
 *   - `messages`   (`JoinChatRoom(roomId)` -> `ReceiveChatMessages` history, then live
 *                   `ReceiveMessage` / `ReceiveFileMessages`),
 *   - `sendMessage(roomId, text)` (`SendMessage`) and `sendFileMessage(roomId, urls)`
 *     (`SendFileMessages`).
 * Like the web, each screen that calls this opens its own connection.
 */
export default function useChatHub() {
  const { profile } = useAuth();
  const userId = parseInt(profile?.userId, 10) || 0;

  const connectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !SIGNALR_URL) return undefined;

    let cancelled = false;
    let retryTimer = null;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}/chathub`, {
        accessTokenFactory: async () => (await getItem('auth_token')) || '',
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => Math.min(retryContext.elapsedMilliseconds * 2 || 1000, 30000),
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();
    connectionRef.current = connection;

    connection.on('ReceiveChatMessages', (history) => setMessages(normalizeMessageList(history)));
    connection.on('ReceiveMessage', (payload) => {
      const message = normalizeIncomingMessage(payload);
      if (message) setMessages((prev) => [...prev, message]);
    });
    connection.on('ReceiveFileMessages', (payload) => {
      const message = normalizeIncomingMessage(payload);
      if (message) setMessages((prev) => [...prev, message]);
    });
    connection.on('GetChatRooms', (rooms) => setChatRooms(Array.isArray(rooms) ? rooms : []));

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => {
      setIsConnected(true);
      setConnectionError(null);
    });
    connection.onclose(() => setIsConnected(false));

    const start = async () => {
      try {
        await connection.start();
        if (cancelled) return;
        setIsConnected(true);
        setConnectionError(null);
      } catch (error) {
        if (cancelled) return;
        console.warn('[chat] connection failed:', error?.message || error);
        setConnectionError('Failed to connect to chat');
        retryTimer = setTimeout(start, CONNECT_RETRY_MS);
      }
    };
    start();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      connection.off('ReceiveChatMessages');
      connection.off('ReceiveMessage');
      connection.off('ReceiveFileMessages');
      connection.off('GetChatRooms');
      connection.stop().catch(() => {});
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [userId]);

  const getChatRooms = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection || !isConnected) return;
    try {
      await connection.invoke('LoadChatRooms', userId);
    } catch (error) {
      console.warn('[chat] loading rooms failed:', error?.message || error);
    }
  }, [isConnected, userId]);

  const joinChatRoom = useCallback(
    async (chatRoomId) => {
      const connection = connectionRef.current;
      if (!connection || !isConnected) throw new Error('Connection not ready');
      if (activeChatRoom === chatRoomId) return;
      setActiveChatRoom(chatRoomId);
      setMessages([]);
      setLoading(true);
      try {
        await connection.invoke('JoinChatRoom', chatRoomId);
      } catch (error) {
        setActiveChatRoom(null);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [activeChatRoom, isConnected],
  );

  const sendMessage = useCallback(
    async (chatRoomId, message) => {
      const connection = connectionRef.current;
      if (!connection || !isConnected) throw new Error('Connection not ready');
      await connection.invoke('SendMessage', chatRoomId, message, userId);
    },
    [isConnected, userId],
  );

  const sendFileMessage = useCallback(
    async (chatRoomId, uploadedImageUrls) => {
      const connection = connectionRef.current;
      if (!connection || !isConnected) throw new Error('Connection not ready');
      await connection.invoke('SendFileMessages', chatRoomId, uploadedImageUrls, userId);
    },
    [isConnected, userId],
  );

  return {
    userId,
    isConnected,
    connectionError,
    chatRooms,
    getChatRooms,
    messages,
    activeChatRoom,
    loading,
    joinChatRoom,
    sendMessage,
    sendFileMessage,
  };
}
