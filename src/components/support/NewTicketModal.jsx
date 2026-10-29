import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import OptionPicker from '../prescriptions/OptionPicker';
import AttachmentChip from './AttachmentChip';
import { SUBJECT_OPTIONS, ATTACHMENT_MIME_TYPES, MESSAGE_MAX, checkAttachments, createTicket } from '../../services/supportService';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

/** Port of web's NewTicketModal: subject + issue description + up to 5 PDF/image attachments. */
export default function NewTicketModal({ visible, onClose, onCreated }) {
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSubject(SUBJECT_OPTIONS[0]);
    setMessage('');
    setAttachments([]);
    setError('');
  };

  const closeModal = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_MIME_TYPES, multiple: true, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const { accepted, errors } = checkAttachments(attachments, result.assets);
    if (errors.length) toast.error(errors.join('\n'));
    setAttachments((prev) => [...prev, ...accepted]);
  };

  const removeAttachment = (index) => setAttachments((prev) => prev.filter((_, i) => i !== index));

  const submit = async () => {
    if (!message.trim()) {
      setError('Issue description is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    const result = await createTicket({ subject, message: message.trim(), files: attachments });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.message || 'Could not submit ticket. Please try again.');
      return;
    }
    toast.success(`Ticket ${result.data?.ticketNumber || ''} submitted. We'll get back to you soon.`);
    onCreated(result.data);
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Create a support ticket</Text>
            <Pressable onPress={closeModal} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              Describe your issue. You will get a ticket number, and our support team will reply here and by e-mail.
            </Text>

            <OptionPicker label="Subject" value={subject} options={SUBJECT_OPTIONS} onChange={(value) => value && setSubject(value)} />

            <View>
              <Text style={styles.label}>
                Issue description<Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={(text) => {
                  setMessage(text.slice(0, MESSAGE_MAX));
                  if (error) setError('');
                }}
                multiline
                textAlignVertical="top"
                placeholder="What happened, what you expected, and any steps to reproduce..."
                placeholderTextColor={adTokens.textMuted}
              />
              <Text style={styles.counter}>
                {message.length}/{MESSAGE_MAX}
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <View>
              <Text style={styles.label}>Attachments (optional - PDF or image, up to 5 MB each)</Text>
              <View style={styles.attachmentList}>
                {attachments.map((file, index) => (
                  <AttachmentChip key={`${file.name}-${index}`} attachment={file} onRemove={() => removeAttachment(index)} disabled={submitting} />
                ))}
                <Pressable style={styles.dropzone} onPress={pickFiles} disabled={submitting}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={adTokens.primaryDark} />
                  <Text style={styles.dropzoneText}>{attachments.length > 0 ? 'Add more' : 'Upload attachment'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={closeModal} disabled={submitting}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
              <Text style={styles.primaryButtonText}>Submit ticket</Text>
              {submitting ? <ActivityIndicator size="small" color={colors.white} style={styles.spinner} /> : null}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: adTokens.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  body: { padding: 16, gap: 14 },
  hint: { fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
  required: { color: adTokens.danger },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary, backgroundColor: adTokens.white },
  textArea: { minHeight: 100 },
  counter: { fontSize: 11.5, color: adTokens.textSecondary, textAlign: 'right', marginTop: 3 },
  errorText: { fontSize: 12, color: adTokens.danger, marginTop: 3 },
  attachmentList: { gap: 8 },
  dropzone: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  dropzoneText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  secondaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  primaryButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: adTokens.successDark },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
  spinner: { marginLeft: 8 },
  disabled: { opacity: 0.6 },
});
