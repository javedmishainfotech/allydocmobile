import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { Feather } from '@expo/vector-icons';
import { downloadAttachmentToCache, shareAttachment } from '../../services/supportService';
import { fileMeta, isImageAttachment, isPdfAttachment } from '../../utils/supportFields';
import { adTokens } from '../../theme/colors';

/** In-app preview for a support-ticket attachment (image or PDF) - tapping an attachment no
 * longer hands off straight to the OS share sheet; it opens this instead, with "Share" as a
 * separate, deliberate action inside it. */
export default function AttachmentPreviewModal({ attachment, onClose }) {
  const { width, height } = useWindowDimensions();
  const [localUri, setLocalUri] = useState(null);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const visible = Boolean(attachment);
  const { name } = attachment ? fileMeta(attachment) : { name: '' };
  const isImage = attachment ? isImageAttachment(attachment) : false;
  const isPdf = attachment ? isPdfAttachment(attachment) : false;

  useEffect(() => {
    if (!attachment) {
      setLocalUri(null);
      setError(false);
      return;
    }
    let active = true;
    downloadAttachmentToCache(attachment)
      .then((uri) => active && setLocalUri(uri))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [attachment]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerButton}
              disabled={sharing}
              onPress={async () => {
                setSharing(true);
                await shareAttachment(attachment, localUri);
                setSharing(false);
              }}
            >
              {sharing ? <ActivityIndicator size={16} color={adTokens.textPrimary} /> : <Feather name="share" size={18} color={adTokens.textPrimary} />}
            </Pressable>
            <Pressable style={styles.headerButton} onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          {error ? (
            <View style={styles.center}>
              <Feather name="alert-circle" size={28} color={adTokens.danger} />
              <Text style={styles.errorText}>Couldn't load this file.</Text>
            </View>
          ) : !localUri ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={adTokens.primary} />
            </View>
          ) : isImage ? (
            <Image source={{ uri: localUri }} style={styles.image} resizeMode="contain" />
          ) : isPdf ? (
            // Android's WebView has no built-in PDF renderer (unlike the Chrome app) - it loads
            // a local PDF with no error and just shows a blank page. react-native-pdf renders
            // the file natively instead of relying on the WebView to display PDF content.
            <Pdf
              source={{ uri: localUri, cache: true }}
              style={[styles.flex1, { width, height }]}
              onError={() => setError(true)}
            />
          ) : (
            <View style={styles.center}>
              <Feather name="file" size={28} color={adTokens.textMuted} />
              <Text style={styles.errorText}>Preview isn't available for this file type.</Text>
              <Text style={styles.errorSubtext}>Use Share to open it in another app.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginRight: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: adTokens.white },
  errorText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  errorSubtext: { fontSize: 12, color: adTokens.textSecondary },
});
