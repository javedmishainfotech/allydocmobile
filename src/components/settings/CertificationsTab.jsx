import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getCertificates, addCertificate, removeCertificate } from '../../services/settingsService';
import { toast } from '../../utils/toast';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { colors, adTokens } from '../../theme/colors';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function getFileIcon(name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'file-pdf-box';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'file-image-outline';
  return 'file-document-outline';
}

function CertificateRow({ item, onPreview, onDelete, isDeleting }) {
  return (
    <View style={styles.certRow}>
      <View style={styles.certIconWrap}>
        <MaterialCommunityIcons name={getFileIcon(item.documentName)} size={20} color={adTokens.primaryDark} />
      </View>
      <Text style={styles.certName} numberOfLines={1}>
        {item.documentName || 'Certificate'}
      </Text>
      <Pressable style={styles.certActionButton} onPress={() => onPreview(item)} hitSlop={8}>
        <Feather name="eye" size={15} color={adTokens.primaryDark} />
      </Pressable>
      <Pressable style={styles.certActionButton} onPress={() => onDelete(item)} disabled={isDeleting} hitSlop={8}>
        {isDeleting ? (
          <ActivityIndicator size={14} color={adTokens.danger} />
        ) : (
          <Feather name="trash-2" size={15} color={adTokens.danger} />
        )}
      </Pressable>
    </View>
  );
}

/** Port of AllyDocReactApp/.../Settings/Certifications.jsx. */
export default function CertificationsTab({ userId }) {
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [certificateName, setCertificateName] = useState('');
  const [pickedFile, setPickedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const loadCertificates = async () => {
    if (!userId) return;
    setIsLoading(true);
    const response = await getCertificates(userId);
    setCertificates(response.success && Array.isArray(response.data) ? response.data : []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File must be 5MB or smaller.');
      return;
    }
    setPickedFile(file);
  };

  const handleUpload = async () => {
    if (!certificateName.trim() || certificateName.trim().length > 100) {
      toast.error('Certificate name is required (max 100 characters).');
      return;
    }
    if (!pickedFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    setIsUploading(true);
    const response = await addCertificate({
      certificateName: certificateName.trim(),
      userId,
      file: pickedFile,
    });
    setIsUploading(false);
    if (response.success) {
      toast.success(response.message || 'Certificate uploaded.');
      setCertificateName('');
      setPickedFile(null);
      await loadCertificates();
    } else {
      toast.error(response.message || 'Unable to upload certificate.');
    }
  };

  const handleDelete = async (item) => {
    setDeletingId(item.documentId);
    const response = await removeCertificate(item.documentId);
    setDeletingId(null);
    if (response.success) {
      toast.success(response.message || 'Certificate removed.');
      await loadCertificates();
    } else {
      toast.error(response.message || 'Unable to remove certificate.');
    }
  };

  return (
    <View>
      <View style={styles.uploadCard}>
        <Text style={styles.sectionTitle}>Add Certificate</Text>
        <TextInput
          style={styles.input}
          value={certificateName}
          onChangeText={setCertificateName}
          placeholder="Certificate name"
          placeholderTextColor={adTokens.textMuted}
          maxLength={100}
        />
        <Pressable style={styles.filePickerButton} onPress={handlePickFile}>
          <MaterialCommunityIcons name="paperclip" size={16} color={adTokens.primaryDark} />
          <Text style={styles.filePickerButtonText} numberOfLines={1}>
            {pickedFile ? pickedFile.name : 'Choose file (JPEG, PNG, or PDF, max 5MB)'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.uploadButton, (!certificateName.trim() || !pickedFile) && styles.uploadButtonDisabled]}
          disabled={!certificateName.trim() || !pickedFile || isUploading}
          onPress={handleUpload}
        >
          {isUploading ? (
            <ActivityIndicator size={14} color={colors.white} />
          ) : (
            <Text style={styles.uploadButtonText}>Upload</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Your Certificates</Text>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : certificates.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No certificates uploaded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => String(item.documentId)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <CertificateRow
              item={item}
              onPreview={(cert) => setPreviewFile({ url: cert.documentUrl, name: cert.documentName })}
              onDelete={handleDelete}
              isDeleting={deletingId === item.documentId}
            />
          )}
        />
      )}

      <DocumentPreviewModal
        visible={Boolean(previewFile)}
        fileUrl={previewFile?.url}
        fileName={previewFile?.name}
        onClose={() => setPreviewFile(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  uploadCard: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
    marginBottom: 10,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: adTokens.gray50,
  },
  filePickerButtonText: { fontSize: 12.5, color: adTokens.textSecondary, flexShrink: 1 },
  uploadButton: { backgroundColor: adTokens.primary, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  uploadButtonDisabled: { opacity: 0.5 },
  uploadButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },

  loadingWrap: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },

  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  certIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certName: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.textPrimary },
  certActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: adTokens.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
