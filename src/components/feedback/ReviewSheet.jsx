import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const STAR_COUNT = 5;

/**
 * Give / edit feedback for a completed appointment - port of the web's Patient
 * Feedback/ReviewModal.jsx: a required 1-5 star rating, an optional written comment,
 * `POST /AddFeedback` (new) or `POST /UpdateFeedback` (edit). Shared by the Appointments and
 * Feedback screens. `appointment` is the list row ({ appointmentId, name, specialization,
 * appointmentStartUtc }).
 */
export default function ReviewSheet({ visible, appointment, isEdit = false, initialRating, initialComment, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const { saveFeedback } = usePatientAppointments();
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRating(Number(initialRating) || 0);
    setComments(initialComment ?? '');
    setShowError(false);
  }, [visible, appointment?.appointmentId, initialRating, initialComment]);

  const display = getAppointmentDisplay(appointment);
  const appointmentId = appointment?.appointmentId ?? appointment?.id;

  const submit = async () => {
    if (rating < 1) {
      setShowError(true);
      return;
    }
    setSaving(true);
    try {
      const result = await saveFeedback(appointmentId, rating, comments, isEdit);
      toast.success(result.message || 'Thank you for your feedback.');
      onSaved?.();
      onClose();
    } catch (message) {
      toast.error(message || 'Unable to save your feedback.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={saving ? undefined : onClose}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={saving ? undefined : onClose} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{isEdit ? 'Edit your feedback' : 'Give feedback'}</Text>
              <Text style={styles.subtitle}>
                {isEdit
                  ? 'Update your star rating or written feedback below.'
                  : 'Help us improve by rating your recent appointment.'}
              </Text>

              <View style={styles.summary}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={22} color={adTokens.primary} />
                </View>
                <View style={styles.summaryBody}>
                  <Text style={styles.doctor} numberOfLines={1}>
                    Dr. {appointment?.name || 'N/A'}
                  </Text>
                  <Text style={styles.specialization} numberOfLines={1}>
                    {appointment?.specialization || 'Specialization not available'}
                  </Text>
                  <Text style={styles.meta}>
                    ID {appointmentId ?? 'N/A'} · {display.date} · {display.timeWithZone}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>
                Your rating <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.stars}>
                {Array.from({ length: STAR_COUNT }, (_, index) => {
                  const value = index + 1;
                  return (
                    <Pressable
                      key={value}
                      hitSlop={6}
                      onPress={() => {
                        setRating(value);
                        setShowError(false);
                      }}
                      accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`}
                    >
                      <MaterialCommunityIcons
                        name={value <= rating ? 'star' : 'star-outline'}
                        size={38}
                        color={value <= rating ? '#F59E0B' : adTokens.border}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.hint}>Tap a star to rate your experience</Text>
              {showError ? <Text style={styles.error}>Please select a star rating before submitting.</Text> : null}

              <Text style={styles.label}>Written feedback</Text>
              <TextInput
                style={styles.textarea}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Share what went well or what we can improve (optional)"
                placeholderTextColor={adTokens.textMuted}
                value={comments}
                onChangeText={setComments}
              />
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={[styles.clearButton, saving && styles.disabled]}
                disabled={saving}
                onPress={() => {
                  setRating(0);
                  setComments('');
                  setShowError(false);
                }}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable style={[styles.submitButton, saving && styles.disabled]} disabled={saving} onPress={submit}>
                {saving ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
                <Text style={styles.submitText}>{isEdit ? 'Update' : 'Submit'} Feedback</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 13, color: adTokens.textSecondary, marginTop: 2, marginBottom: 14 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  summaryBody: { flex: 1, gap: 2 },
  doctor: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  specialization: { fontSize: 12.5, color: adTokens.textSecondary },
  meta: { fontSize: 11.5, color: adTokens.textMuted },

  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary, marginTop: 16, marginBottom: 8 },
  required: { color: adTokens.danger },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  hint: { fontSize: 12, color: adTokens.textMuted, textAlign: 'center', marginTop: 6 },
  error: { fontSize: 12.5, color: adTokens.danger, textAlign: 'center', marginTop: 6 },
  textarea: {
    minHeight: 96,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    fontSize: 14,
    color: adTokens.textPrimary,
  },

  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  clearButton: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  clearText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: adTokens.primary,
  },
  submitText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
  disabled: { opacity: 0.6 },
});
