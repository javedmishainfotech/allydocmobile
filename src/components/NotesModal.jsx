import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useManageAppointments } from '../hooks/useManageAppointments';
import { useAuth } from '../hooks/useAuth';
import { colors, adTokens } from '../theme/colors';

/** Port of AllyDocReactApp/.../DoctorAppointments/NotesModal.jsx. */
export default function NotesModal({ visible, appointmentId, isEditable, onClose, onSaved }) {
  const { profile } = useAuth();
  const { getAppointmentNotes, saveAppointmentNotes } = useManageAppointments();
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !appointmentId) return;
    setIsLoading(true);
    getAppointmentNotes(appointmentId)
      .then((data) => setNoteText(data?.notes || ''))
      .catch(() => {})
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, appointmentId]);

  const handleSave = async () => {
    if (!noteText) return;
    setIsSaving(true);
    try {
      await saveAppointmentNotes(appointmentId, profile?.userId, noteText);
      setNoteText('');
      onSaved?.();
    } catch {
      // no toast on web's own failure path either - it just leaves the modal open to retry.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Notes</Text>
              <Text style={styles.subtitle}>Manage notes for this appointment</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={adTokens.primary} />
            </View>
          ) : (
            <>
              <TextInput
                style={styles.textArea}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                placeholder="Write notes for this appointment..."
                placeholderTextColor={adTokens.textMuted}
              />
              {isEditable ? (
                <Pressable
                  style={[styles.saveButton, !noteText && styles.saveButtonDisabled]}
                  disabled={!noteText || isSaving}
                  onPress={handleSave}
                >
                  {isSaving ? (
                    <ActivityIndicator size={14} color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}
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
    padding: 18,
    maxHeight: '85%',
  },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  textArea: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 220,
    fontSize: 13.5,
    color: adTokens.textPrimary,
  },
  saveButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
    backgroundColor: adTokens.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
});
