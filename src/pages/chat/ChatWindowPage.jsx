import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useChatHub from '../../hooks/useChatHub';
import { uploadChatImages } from '../../services/chatService';
import Avatar from '../../components/Avatar';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const MAX_IMAGES = 10; // same limit as the web

const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function MessageBubble({ message, isMine, receiverName, receiverImage, onOpenImage }) {
  const time = formatTime(message.timestamp);
  return (
    <View style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowTheirs]}>
      {!isMine ? <Avatar name={receiverName} imageUrl={receiverImage} size={28} /> : null}
      <View style={[styles.bubbleColumn, isMine ? styles.alignEnd : styles.alignStart]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {message.messageType === 'text' ? (
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.content}</Text>
          ) : null}
          {message.messageType === 'file' && message.images?.length > 0 ? (
            <View style={styles.imageGrid}>
              {message.images.map((image, index) => (
                <Pressable key={`${image}-${index}`} onPress={() => onOpenImage(image)}>
                  <Image source={{ uri: image }} style={styles.thumb} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

/**
 * One conversation - port of AllyDocReactApp's utils/ChatWindow.jsx: joins the room
 * (`JoinChatRoom` -> history), shows the messages live (`ReceiveMessage` / `ReceiveFileMessages`),
 * sends text (`SendMessage`) and up to 10 images (`UploadFiles` -> `SendFileMessages`), and opens an
 * image full screen on tap.
 */
export default function ChatWindowPage() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const chat = route.params?.chat;
  const { userId, isConnected, connectionError, messages, loading, joinChatRoom, sendMessage, sendFileMessage } =
    useChatHub();

  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (chat?.recieverName) navigation.setOptions({ title: chat.recieverName });
  }, [chat?.recieverName, navigation]);

  useEffect(() => {
    if (!chat?.chatRoomId || !isConnected) return;
    joinChatRoom(chat.chatRoomId).catch(() => toast.error('Failed to connect to chat'));
  }, [chat?.chatRoomId, isConnected, joinChatRoom]);

  const scrollToEnd = useCallback(() => listRef.current?.scrollToEnd({ animated: false }), []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    if (!chat?.chatRoomId) {
      toast.error('Chat room is not available');
      return;
    }
    setText('');
    try {
      await sendMessage(chat.chatRoomId, body);
    } catch {
      setText(body);
      toast.error('Failed to send message');
    }
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.8,
    });
    if (result.canceled) return;
    if (result.assets.length > MAX_IMAGES) {
      toast.error('You can only upload up to 10 images!');
      return;
    }
    setImages(result.assets);
  };

  const handleUpload = async () => {
    if (images.length === 0) return;
    if (!chat?.chatRoomId) {
      toast.error('Chat room is not available');
      return;
    }
    setIsSending(true);
    setUploadProgress(1);
    const result = await uploadChatImages(images, setUploadProgress);
    const urls = result.success ? result.raw?.fileUrls : null;
    if (!urls?.length) {
      toast.error(result.success ? 'No files uploaded!' : result.message || 'Failed to upload images!');
    } else {
      try {
        await sendFileMessage(chat.chatRoomId, urls);
        toast.success('Images sent successfully!');
        setImages([]);
      } catch {
        toast.error('Failed to send images');
      }
    }
    setUploadProgress(0);
    setIsSending(false);
  };

  const hasImages = images.length > 0;
  const canSend = (hasImages || text.trim().length > 0) && !isSending && isConnected;

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {connectionError ? (
        <View style={styles.connError}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={adTokens.dangerDark} />
          <Text style={styles.connErrorText}>{connectionError}</Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        style={styles.flex1}
        data={loading ? [] : messages}
        keyExtractor={(message, index) => String(message.messageid ?? index)}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.userId === userId}
            receiverName={chat?.recieverName}
            receiverImage={chat?.profileImage}
            onOpenImage={setViewerImage}
          />
        )}
        contentContainerStyle={styles.messages}
        onContentSizeChange={scrollToEnd}
        ListEmptyComponent={
          loading || !isConnected ? (
            <View style={styles.state}>
              <ActivityIndicator color={adTokens.primary} />
              <Text style={styles.stateText}>{isConnected ? 'Loading messages...' : 'Connecting...'}</Text>
            </View>
          ) : (
            <View style={styles.state}>
              <MaterialCommunityIcons name="message-outline" size={30} color={adTokens.textMuted} />
              <Text style={styles.stateText}>No messages yet. Start the conversation!</Text>
            </View>
          )
        }
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {hasImages ? (
          <View style={styles.previewRow}>
            {images.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.previewItem}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <Pressable
                  style={styles.previewRemove}
                  onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  accessibilityLabel="Remove image"
                >
                  <MaterialCommunityIcons name="close" size={12} color={adTokens.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {uploadProgress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={adTokens.textMuted}
            multiline
            editable={!isSending}
            returnKeyType="send"
          />
          <Pressable style={styles.iconButton} onPress={pickImages} disabled={isSending} accessibilityLabel="Attach image">
            <MaterialCommunityIcons name="image-outline" size={22} color={adTokens.primaryDark} />
          </Pressable>
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendDisabled]}
            onPress={hasImages ? handleUpload : handleSend}
            disabled={!canSend}
            accessibilityLabel="Send"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={adTokens.white} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={adTokens.white} />
            )}
          </Pressable>
        </View>
      </View>

      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewerImage(null)}>
          {viewerImage ? <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  messages: { padding: 12, gap: 10, flexGrow: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60 },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  connError: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: adTokens.dangerLight },
  connErrorText: { flex: 1, fontSize: 12.5, color: adTokens.dangerDark },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubbleColumn: { maxWidth: '78%', gap: 2 },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: adTokens.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: adTokens.gray100, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14.5, color: adTokens.textPrimary, lineHeight: 20 },
  bubbleTextMine: { color: adTokens.white },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 96, height: 96, borderRadius: 10, backgroundColor: adTokens.gray100 },
  time: { fontSize: 10.5, color: adTokens.textMuted },

  footer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewItem: { width: 52, height: 52 },
  previewImage: { width: 52, height: 52, borderRadius: 8 },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: adTokens.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: adTokens.primary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
    fontSize: 14.5,
    color: adTokens.textPrimary,
  },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.primaryLight },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.primary },
  sendDisabled: { opacity: 0.5 },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '85%' },
});
