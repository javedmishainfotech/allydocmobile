import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Port of AllyDocReactApp's PrescriptionPrintPreviewModal.jsx: a full-screen preview of the
 * printable prescription document, with "Print" (OS print dialog) and "Download PDF" (share/
 * save, mobile's equivalent of web's browser-download html2pdf.js flow) actions. The HTML is
 * built once by the caller (after `setPrintedPrescriptions` has already succeeded) and handed
 * in here unchanged.
 */
export default function PrescriptionPrintPreviewModal({ visible, html, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const handlePrint = async () => {
    setBusy(true);
    try {
      await Print.printAsync({ html });
    } catch (err) {
      toast.error('Unable to open the print dialog.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Prescription PDF' });
      } else {
        toast.error('Sharing is not available on this device.');
      }
    } catch (err) {
      toast.error('Unable to generate the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <View style={styles.container}>
        <Toast />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Prescription Preview</Text>
          <Pressable onPress={onClose} disabled={busy} hitSlop={8}>
            <Feather name="x" size={22} color={adTokens.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.webviewWrap}>
          <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} />
        </View>

        <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
          <Pressable style={styles.secondaryButton} disabled={busy} onPress={handleDownload}>
            <Feather name="download" size={15} color={adTokens.primaryDark} />
            <Text style={styles.secondaryButtonText}>Download PDF</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} disabled={busy} onPress={handlePrint}>
            {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Feather name="printer" size={15} color={colors.white} />}
            <Text style={styles.primaryButtonText}>Print</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  webviewWrap: { flex: 1 },
  webview: { flex: 1 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: adTokens.primary },
  secondaryButtonText: { fontSize: 13.5, fontWeight: '700', color: adTokens.primaryDark },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 10, backgroundColor: adTokens.primary },
  primaryButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});
