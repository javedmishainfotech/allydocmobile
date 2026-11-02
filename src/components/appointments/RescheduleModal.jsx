import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import InlineCalendar from '../InlineCalendar';
import { getScheduleList } from '../../services/bookingService';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import { getSlotRangeLabel, getSlotValue } from '../../utils/slotLabel';
import { localDateOnlyToApiString } from '../../utils/dateOnly';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';

/**
 * Port of DoctorTreatmentDetail.jsx's Reschedule modal (AllyDocReactApp): an inline calendar to pick a
 * new day, that day's slots (`GET /ScheduleList?UserId=<patient id>&...`, same endpoint and patient-id
 * convention the booking flow's date/time step uses), a required reason, and `PUT /UpdateAppointment`
 * (`{ appointmentId, appointmentDate, appointMentTime, rescheduleReason }`) to confirm.
 */
export default function RescheduleModal({ visible, appointmentId, patientId, initialDate, onClose, onRescheduled }) {
  const { updateAppointment } = useManageAppointments();
  const [selectedDate, setSelectedDate] = useState(() => initialDate || new Date());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = useCallback(
    async (date) => {
      if (!patientId || !date) return;
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const result = await getScheduleList({ userId: patientId, day, appointmentDate: localDateOnlyToApiString(date) });
      setSlots(result.success && Array.isArray(result.data) ? result.data : []);
      setSlotsLoading(false);
    },
    [patientId],
  );

  useEffect(() => {
    if (!visible) return;
    const date = initialDate || new Date();
    setSelectedDate(date);
    setSelectedSlot(null);
    setReason('');
    fetchSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pickDate = (date) => {
    setSelectedDate(date);
    fetchSlots(date);
  };

  const pickSlot = (slot) => {
    const value = getSlotValue(slot);
    setSelectedSlot((prev) => (prev && getSlotValue(prev) === value ? null : slot));
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const canConfirm = Boolean(selectedSlot) && reason.trim().length > 0 && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    const dateSource = selectedSlot?.clinicLocalDate || selectedDate;
    try {
      const result = await updateAppointment(
        appointmentId,
        localDateOnlyToApiString(dateSource),
        getSlotValue(selectedSlot),
        reason.trim(),
      );
      toast.success(result.message || 'Appointment rescheduled.');
      onRescheduled?.();
    } catch (message) {
      toast.error(message || 'Unable to reschedule this appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Reschedule Appointment</Text>
              <Text style={styles.subtitle}>Pick a new date and time</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} disabled={submitting}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <InlineCalendar selectedDate={selectedDate} onSelectDate={pickDate} />

            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            {slotsLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={adTokens.primary} />
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.noSlots}>
                <MaterialCommunityIcons name="information-outline" size={18} color={adTokens.textMuted} />
                <Text style={styles.noSlotsText}>No available slots for the selected day</Text>
              </View>
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot, index) => {
                  const value = getSlotValue(slot);
                  const active = selectedSlot && getSlotValue(selectedSlot) === value;
                  return (
                    <Pressable
                      key={`${value}-${index}`}
                      style={[styles.slotChip, active && styles.slotChipActive]}
                      onPress={() => pickSlot(slot)}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>{getSlotRangeLabel(slot)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Reason for reschedule</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Please explain why this appointment is being rescheduled..."
              placeholderTextColor={adTokens.textMuted}
            />
            {!reason.trim() && selectedSlot ? <Text style={styles.validationText}>A reason is required.</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '90%' },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  body: { gap: 12, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary, marginTop: 4 },
  loadingWrap: { paddingVertical: 20, alignItems: 'center' },
  noSlots: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, justifyContent: 'center' },
  noSlotsText: { fontSize: 12.5, color: adTokens.textMuted },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, maxHeight: 180 },
  slotChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.gray50 },
  slotChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  slotText: { fontSize: 12, fontWeight: '600', color: adTokens.textPrimary },
  slotTextActive: { color: colors.white },
  textArea: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, minHeight: 80, fontSize: 13.5, color: adTokens.textPrimary },
  validationText: { fontSize: 11.5, color: adTokens.danger, marginTop: -6 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  cancelButtonText: { fontSize: 13.5, fontWeight: '700', color: adTokens.textSecondary },
  confirmButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});
