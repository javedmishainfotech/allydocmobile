import React, { useState } from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { adTokens } from '../theme/colors';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const PDF_EXTENSIONS = ['pdf'];

function getExtension(url) {
  return String(url || '')
    .split('?')[0]
    .split('.')
    .pop()
    ?.toLowerCase();
}

/**
 * Shared in-app document preview: images render directly (RN Image), PDFs
 * render via a WebView pointed at Google's public document-viewer embed
 * (Android's own WebView doesn't render PDFs inline), everything else falls
 * back to a plain "Open externally" action. Reused by My Profile (licence +
 * qualifications) and the Certifications tab's "View" action.
 */
export default function DocumentPreviewModal({ visible, fileUrl, fileName, onClose }) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const extension = getExtension(fileUrl);
  const isImage = IMAGE_EXTENSIONS.includes(extension);
  const isPdf = PDF_EXTENSIONS.includes(extension);
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl || '')}&embedded=true`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {fileName || 'Document'}
            </Text>
            <View style={styles.headerActions}>
              {fileUrl ? (
                <Pressable onPress={() => Linking.openURL(fileUrl)} hitSlop={8} style={styles.headerIconButton}>
                  <Feather name="external-link" size={17} color={adTokens.primaryDark} />
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={8} style={styles.headerIconButton}>
                <Feather name="x" size={19} color={adTokens.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.previewArea}>
            {!fileUrl ? (
              <Text style={styles.mutedText}>No file available.</Text>
            ) : isImage ? (
              <Image source={{ uri: fileUrl }} style={styles.image} resizeMode="contain" />
            ) : isPdf ? (
              <View style={styles.flex1}>
                {webViewLoading ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={adTokens.primary} />
                  </View>
                ) : null}
                <WebView
                  source={{ uri: googleViewerUrl }}
                  style={styles.webview}
                  onLoadEnd={() => setWebViewLoading(false)}
                  startInLoadingState={false}
                />
              </View>
            ) : (
              <View style={styles.fallbackWrap}>
                <Feather name="file" size={40} color={adTokens.textMuted} />
                <Text style={styles.mutedText}>Preview isn't available for this file type.</Text>
                <Pressable style={styles.openExternalButton} onPress={() => Linking.openURL(fileUrl)}>
                  <Text style={styles.openExternalButtonText}>Open File</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: '88%',
  },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { flex: 1, fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary, marginRight: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconButton: { padding: 2 },

  previewArea: { flex: 1 },
  image: { flex: 1, width: '100%' },
  webview: { flex: 1, backgroundColor: adTokens.white },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: adTokens.white,
  },
  fallbackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  mutedText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  openExternalButton: {
    marginTop: 4,
    backgroundColor: adTokens.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  openExternalButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
