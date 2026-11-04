import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { openExternalLink } from '../../utils/openExternalLink';
import { adTokens } from '../../theme/colors';

/**
 * In-app playback for a call recording (Daily.co's own hosted .mp4 URL) - tapping "Play
 * recording" used to hand off to `openExternalLink`, which Android's browser/Linking treats as a
 * download for a direct video file link rather than opening a player. This streams it with
 * `expo-video` instead, with native playback controls, same as a real video player.
 */
export default function CallRecordingPlayerModal({ visible, url, onClose }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const player = useVideoPlayer(visible ? url : null, (p) => {
    p.loop = false;
  });

  useEventListener(player, 'statusChange', ({ status: playerStatus, error }) => {
    if (playerStatus === 'readyToPlay') {
      setStatus('ready');
      player.play();
    } else if (playerStatus === 'error') {
      setStatus('error');
      console.warn('[CallRecordingPlayerModal] playback error:', error);
    }
  });

  useEffect(() => {
    if (visible) setStatus('loading');
  }, [visible, url]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Call Recording
          </Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={() => openExternalLink(url)} hitSlop={8}>
              <Feather name="external-link" size={17} color={adTokens.white} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          {url ? <VideoView style={styles.video} player={player} nativeControls allowsFullscreen allowsPictureInPicture /> : null}
          {status === 'loading' ? (
            <View style={styles.overlay} pointerEvents="none">
              <ActivityIndicator size="large" color={adTokens.white} />
            </View>
          ) : null}
          {status === 'error' ? (
            <View style={styles.overlay}>
              <Feather name="alert-circle" size={28} color={adTokens.danger} />
              <Text style={styles.errorText}>Couldn't play this recording.</Text>
              <Pressable style={styles.retryButton} onPress={() => openExternalLink(url)}>
                <Text style={styles.retryButtonText}>Open externally instead</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#111827',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: adTokens.white, marginRight: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  video: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  errorText: { fontSize: 13.5, fontWeight: '600', color: adTokens.white },
  retryButton: { marginTop: 4, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.primary },
  retryButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
