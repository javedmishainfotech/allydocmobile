import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { createChatRoom } from '../../services/chatService';
import { toast } from '../../utils/toast';
import { useManageAppointments } from '../../hooks/useManageAppointments';
import { getAppointmentDetails } from '../../services/pendingRequestDetailsService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { getAppointmentSymptom, STATUS_STYLE } from '../../utils/appointmentFields';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import NotesModal from '../NotesModal';
import QuestionnaireModal from '../QuestionnaireModal';
import ConfirmationModal from '../ConfirmationModal';
import RescheduleModal from './RescheduleModal';
import { colors, adTokens } from '../../theme/colors';

/**
 * One appointment's details as a bottom sheet: patient, date/time, status, notes,
 * questionnaire, Mark as Complete, and the chat / call / video buttons (visible on the
 * same API flags as the web). Chat opens the appointment's chat room; "Treatment Plan" opens the
 * shared staff Treatment Plan detail screen; calls / video are not built yet.
 *
 * Shared by every screen that lists appointments (Manage Appointments, the Appointments
 * list, ...) - the web likewise has one detail view that all its lists open. The parent
 * only decides WHICH appointment: `appointmentId` (null = closed). `onChanged` fires after
 * something the list shows has changed (marking complete), so the parent can refresh.
 */
export default function AppointmentDetailSheet({ appointmentId, onClose, onChanged }) {
  const bottomSafe = useBottomSafeSpacing();
  const visible = appointmentId != null;
  const { profile } = useAuth();
  const { markAppointmentComplete } = useManageAppointments();
  const roleName = (profile?.roleName || '').toLowerCase().trim();
  const userType = (profile?.userType || '').toLowerCase().trim();
  // Web's showRescheduleButton: excludes a freelancer "doctor" and a clinic "doctor admin" even
  // when the backend's own isRescheduleVisible flag is true.
  const canSeeReschedule =
    !((roleName === 'doctor admin' && userType === 'clinic') || (roleName === 'doctor' && userType === 'freelancer'));
  const navigation = useNavigation();
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [isSubmitLoader, setIsSubmitLoader] = useState(false);

  const loadDetails = useCallback(async (id) => {
    setDetailsLoading(true);
    const response = await getAppointmentDetails(id);
    setAppointmentDetails(response.success ? response.data : null);
    setDetailsLoading(false);
  }, []);

  useEffect(() => {
    if (appointmentId != null) {
      setAppointmentDetails(null);
      loadDetails(appointmentId);
    }
  }, [appointmentId, loadDetails]);

  const handleComplete = async () => {
    if (!appointmentDetails) return;
    setIsSubmitLoader(true);
    try {
      await markAppointmentComplete(appointmentDetails.appointmentId, completeRemarks || undefined);
      setIsConfirmationModalOpen(false);
      setCompleteRemarks('');
      setAppointmentDetails(null);
      onClose();
      onChanged?.();
    } catch {
      // handled below by re-enabling the button; a toast isn't shown here because the web
      // confirmation modal itself doesn't surface one either - it just stays open to retry.
    } finally {
      setIsSubmitLoader(false);
    }
  };

  // Web: handleMessageClick -> CreateChatRoom. Opens (creating if needed) this appointment's chat
  // room with the patient, then shows it in the chat screen.
  const openChat = async () => {
    if (!appointmentDetails || isChatLoading) return;
    const senderId = parseInt(profile?.userId, 10);
    setIsChatLoading(true);
    const result = await createChatRoom({
      appointmentId: appointmentDetails.appointmentId ?? appointmentId,
      senderId,
      recieverId: appointmentDetails.userId,
    });
    setIsChatLoading(false);
    const chatRoomId = result.raw?.senderChatRoomId;
    if (!result.success || !chatRoomId) {
      toast.error(result.message || 'Unable to open the chat.');
      return;
    }
    const chat = {
      chatRoomId,
      appointmentId: appointmentDetails.appointmentId ?? appointmentId,
      senderId,
      receiverId: appointmentDetails.userId,
      lastMessage: '',
      recieverName: appointmentDetails.patientName,
      profileImage: appointmentDetails.patientImage,
    };
    onClose();
    navigation.navigate('ChatWindow', { chat });
  };

  const appointmentStartMs = useMemo(() => {
    const raw = appointmentDetails?.appointmentStartUtc;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }, [appointmentDetails]);

  const EARLY_JOIN_BUFFER_MS = 5 * 60 * 1000;
  const isRealtimeActionDisabled =
    appointmentStartMs != null && Date.now() < appointmentStartMs - EARLY_JOIN_BUFFER_MS;

  const symptom = appointmentDetails ? getAppointmentSymptom(appointmentDetails) : '';
  const statusKey = (appointmentDetails?.appointmentStatus || '').toLowerCase();
  const statusStyle = STATUS_STYLE[statusKey] || STATUS_STYLE.scheduled;
  const rescheduleReasonText = String(
    appointmentDetails?.rescheduleReason ?? appointmentDetails?.RescheduleReason ?? '',
  ).trim();
  const display = appointmentDetails ? getAppointmentDisplay(appointmentDetails) : null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onClose()}>
        <Toast />
        <View style={styles.detailBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose()} />
          <View style={styles.detailSheet}>
            <ScrollView contentContainerStyle={[styles.detailScroll, { paddingBottom: 18 + bottomSafe }]}>
              <View style={styles.detailHandleRow}>
                <View style={styles.detailHandle} />
                <Pressable style={styles.detailCloseButton} onPress={() => onClose()} hitSlop={8}>
                  <Feather name="x" size={18} color={adTokens.textSecondary} />
                </Pressable>
              </View>

              {detailsLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={adTokens.primary} />
                </View>
              ) : !appointmentDetails ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No details to display.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.detailHeader}>
                    <View style={styles.detailAvatar}>
                      <Text style={styles.detailAvatarText}>
                        {(appointmentDetails.patientName || 'P').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.detailName}>{appointmentDetails.patientName}</Text>
                      {display?.instantMs != null ? (
                        <Text style={styles.detailDatetime}>
                          {display.date} | {display.timeWithZone}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {(appointmentDetails.isMarkAsCompleteVisible ||
                    appointmentDetails.isTreatmentPlanVisible ||
                    (appointmentDetails.isRescheduleVisible && canSeeReschedule)) ? (
                    <View style={styles.detailActionsRow}>
                      {appointmentDetails.isMarkAsCompleteVisible ? (
                        <Pressable
                          style={styles.successButton}
                          onPress={() => {
                            setCompleteRemarks('');
                            setIsConfirmationModalOpen(true);
                          }}
                        >
                          <Feather name="check" size={14} color={colors.white} />
                          <Text style={styles.actionButtonText}>Mark as Complete</Text>
                        </Pressable>
                      ) : null}
                      {appointmentDetails.isTreatmentPlanVisible ? (
                        <Pressable
                          style={styles.primaryButton}
                          onPress={() => {
                            onClose();
                            navigation.navigate('TreatmentPlanDetail', { appointmentId: appointmentDetails.appointmentId });
                          }}
                        >
                          <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={colors.white} />
                          <Text style={styles.actionButtonText}>Treatment Plan</Text>
                        </Pressable>
                      ) : null}
                      {appointmentDetails.isRescheduleVisible && canSeeReschedule ? (
                        <Pressable style={styles.secondaryButton} onPress={() => setIsRescheduleOpen(true)}>
                          <MaterialCommunityIcons name="calendar-sync-outline" size={14} color={adTokens.primaryDark} />
                          <Text style={styles.secondaryButtonText}>Reschedule</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {(appointmentDetails.isMessageVisible ||
                    appointmentDetails.isAudioVisible ||
                    appointmentDetails.isVideoVisible ||
                    appointmentDetails.isNoteViewVisible) ? (
                    <View style={styles.commGrid}>
                      {appointmentDetails.isNoteViewVisible ? (
                        <Pressable style={styles.commButton} onPress={() => setIsNoteModalOpen(true)}>
                          <MaterialCommunityIcons name="notebook-outline" size={18} color={adTokens.textPrimary} />
                          <Text style={styles.commButtonText}>Notes</Text>
                        </Pressable>
                      ) : null}
                      {appointmentDetails.isMessageVisible ? (
                        <Pressable
                          style={[styles.commButton, isRealtimeActionDisabled && styles.commButtonDisabled]}
                          disabled={isRealtimeActionDisabled || isChatLoading}
                          onPress={openChat}
                        >
                          {isChatLoading ? (
                            <ActivityIndicator size="small" color={adTokens.primary} />
                          ) : (
                            <MaterialCommunityIcons name="message-text-outline" size={18} color={adTokens.textPrimary} />
                          )}
                          <Text style={styles.commButtonText}>Chat</Text>
                        </Pressable>
                      ) : null}
                      {roleName !== 'nurse' && appointmentDetails.isAudioVisible ? (
                        <Pressable
                          style={[styles.commButton, isRealtimeActionDisabled && styles.commButtonDisabled]}
                          disabled={isRealtimeActionDisabled}
                          onPress={() => {
                            onClose();
                            navigation.navigate('VideoCall', {
                              appointmentId: appointmentDetails.appointmentId,
                              isAudio: true,
                              counterpartName: appointmentDetails.patientName,
                            });
                          }}
                        >
                          <MaterialCommunityIcons name="phone-outline" size={18} color={adTokens.textPrimary} />
                          <Text style={styles.commButtonText}>Call</Text>
                        </Pressable>
                      ) : null}
                      {roleName !== 'nurse' && appointmentDetails.isVideoVisible ? (
                        <Pressable
                          style={[styles.commButton, isRealtimeActionDisabled && styles.commButtonDisabled]}
                          disabled={isRealtimeActionDisabled}
                          onPress={() => {
                            onClose();
                            navigation.navigate('VideoCall', {
                              appointmentId: appointmentDetails.appointmentId,
                              isAudio: false,
                              counterpartName: appointmentDetails.patientName,
                            });
                          }}
                        >
                          <MaterialCommunityIcons name="video-outline" size={18} color={adTokens.textPrimary} />
                          <Text style={styles.commButtonText}>Video</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {Array.isArray(appointmentDetails.questionAnwerLists) && appointmentDetails.questionAnwerLists.length > 0 ? (
                    <Pressable style={styles.questionnaireButton} onPress={() => setIsQuestionnaireModalOpen(true)}>
                      <Text style={styles.questionnaireButtonText}>Questionnaire</Text>
                      <Feather name="maximize-2" size={14} color={adTokens.primaryDark} />
                    </Pressable>
                  ) : null}

                  <View style={styles.detailInfo}>
                    {symptom ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Condition:</Text>
                        <View style={styles.conditionBadge}>
                          <MaterialCommunityIcons name="thermometer" size={11} color={adTokens.primaryDark} />
                          <Text style={styles.conditionBadgeText}>{symptom}</Text>
                        </View>
                      </View>
                    ) : null}
                    {appointmentDetails.appointmentStatus ? (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Status:</Text>
                          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                          </View>
                        </View>
                        {statusKey === 'rescheduled' && rescheduleReasonText ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reason:</Text>
                            <Text style={styles.detailValue}>{rescheduleReasonText}</Text>
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    {appointmentDetails.reference ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reference:</Text>
                        <Text style={styles.detailValue}>{appointmentDetails.reference}</Text>
                      </View>
                    ) : null}
                  </View>

                  {(statusKey === 'cancelled' && appointmentDetails.cancelReason) ||
                  (statusKey === 'completed' && appointmentDetails.remarks) ? (
                    <View style={styles.reasonSection}>
                      <Text style={styles.reasonLabel}>
                        {statusKey === 'cancelled' ? 'Cancellation Reason' : 'Remarks'}
                      </Text>
                      <Text style={styles.reasonText}>
                        {statusKey === 'cancelled' ? appointmentDetails.cancelReason : appointmentDetails.remarks}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NotesModal
        visible={isNoteModalOpen}
        appointmentId={appointmentDetails?.appointmentId}
        isEditable={appointmentDetails?.isNoteEditVisible}
        onClose={() => setIsNoteModalOpen(false)}
        onSaved={async () => {
          setIsNoteModalOpen(false);
          await loadDetails(appointmentDetails.appointmentId);
        }}
      />

      <QuestionnaireModal
        visible={isQuestionnaireModalOpen}
        questionAnswerList={appointmentDetails?.questionAnwerLists}
        onClose={() => setIsQuestionnaireModalOpen(false)}
      />

      <ConfirmationModal
        visible={isConfirmationModalOpen}
        type="completed"
        remarks={completeRemarks}
        onChangeRemarks={setCompleteRemarks}
        isSubmitting={isSubmitLoader}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={handleComplete}
      />

      <RescheduleModal
        visible={isRescheduleOpen}
        appointmentId={appointmentDetails?.appointmentId}
        patientId={appointmentDetails?.patitentId ?? appointmentDetails?.patientId ?? appointmentDetails?.userId}
        initialDate={appointmentStartMs != null ? new Date(appointmentStartMs) : null}
        onClose={() => setIsRescheduleOpen(false)}
        onRescheduled={async () => {
          setIsRescheduleOpen(false);
          await loadDetails(appointmentDetails.appointmentId);
          onChanged?.();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyState: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyStateText: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },

  // ── Detail bottom sheet ──
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  detailScroll: { padding: 18 },
  detailHandleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: adTokens.border },
  detailCloseButton: { position: 'absolute', right: 0, top: -4 },

  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  detailAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarText: { fontSize: 18, fontWeight: '700', color: adTokens.primaryDark },
  detailName: { fontSize: 16.5, fontWeight: '700', color: adTokens.textPrimary },
  detailDatetime: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },

  detailActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adTokens.success,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adTokens.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionButtonText: { color: colors.white, fontWeight: '700', fontSize: 12.5 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adTokens.gray50,
    borderWidth: 1,
    borderColor: adTokens.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryButtonText: { color: adTokens.primaryDark, fontWeight: '700', fontSize: 12.5 },

  commGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  commButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
    minWidth: 72,
  },
  commButtonDisabled: { opacity: 0.5 },
  commButtonText: { fontSize: 11, fontWeight: '600', color: adTokens.textPrimary },

  questionnaireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 14,
  },
  questionnaireButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },

  detailInfo: { gap: 8, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detailLabel: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  detailValue: { fontSize: 12.5, color: adTokens.textPrimary, flexShrink: 1 },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: adTokens.primaryLight,
  },
  conditionBadgeText: { fontSize: 11.5, fontWeight: '600', color: adTokens.primaryDark },
  statusPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  statusPillText: { fontSize: 11.5, fontWeight: '700' },

  reasonSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: adTokens.gray50,
  },
  reasonLabel: { fontSize: 11.5, fontWeight: '700', color: adTokens.textSecondary, marginBottom: 4 },
  reasonText: { fontSize: 13, color: adTokens.textPrimary },
});
