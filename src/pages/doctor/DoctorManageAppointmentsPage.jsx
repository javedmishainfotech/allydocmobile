import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  getAppointmentsBasedOnDate,
  getDoctorAppointments,
  markAppointmentComplete,
} from '../../services/manageAppointmentsService';
import { getAppointmentDetails } from '../../services/pendingRequestDetailsService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { formatDateLabel } from '../../utils/dateOnly';
import StatusBadge from '../../components/StatusBadge';
import AppointmentInfoButton from '../../components/AppointmentInfoButton';
import InlineCalendar from '../../components/InlineCalendar';
import NotesModal from '../../components/NotesModal';
import QuestionnaireModal from '../../components/QuestionnaireModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { colors, adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';

/** Same consult/symptom-field preference order as AllyDocReactApp's getAppointmentSymptom. */
function getAppointmentSymptom(item) {
  return String(
    item?.consultReason ||
      item?.ConsultReason ||
      item?.symptom ||
      item?.symtom ||
      item?.appointmentReason ||
      item?.symptonName ||
      '',
  ).trim();
}

function getInfoButtonProps(item) {
  return {
    rescheduleReason: item?.rescheduleReason ?? item?.RescheduleReason,
    cancelReason: item?.cancelReason ?? item?.CancelReason,
    remarks: item?.remarks ?? item?.Remarks,
    feedbackRating: item?.feedbackRating ?? item?.FeedbackRating,
    feedbackComment: item?.feedbackComment ?? item?.FeedbackComment,
  };
}

const STATUS_STYLE = {
  completed: { color: '#10B981', bg: '#D1FAE5', label: 'COMPLETED' },
  inprogress: { color: '#F59E0B', bg: '#FEF3C7', label: 'IN PROGRESS' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'CANCELLED' },
  scheduled: { color: '#3B82F6', bg: '#EFF6FF', label: 'SCHEDULED' },
  rescheduled: { color: '#8B5CF6', bg: '#EDE9FE', label: 'RE-SCHEDULED' },
};

/** Exact port of ManageAppointments.jsx's row - name, symptom badge, date/time,
 * StatusBadge + AppointmentInfoButton, reference. */
function AppointmentRow({ item, isSelected, onPress }) {
  const symptom = getAppointmentSymptom(item);
  const display = getAppointmentDisplay(item);
  return (
    <Pressable style={[styles.row, isSelected && styles.rowSelected]} onPress={onPress}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{(item.name || 'P').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex1}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.doctorName || item.name || 'Patient'}
          </Text>
          {item.reference ? <Text style={styles.rowRef}>#{item.reference}</Text> : null}
        </View>
        <Text style={styles.rowDate}>
          {display.date} · {display.timeWithZone}
        </Text>
        <View style={styles.rowMetaLine}>
          <StatusBadge status={item.appointmentStatus} />
          <AppointmentInfoButton {...getInfoButtonProps(item)} />
          {symptom ? (
            <View style={styles.symptomBadge}>
              <MaterialCommunityIcons name="thermometer" size={11} color={adTokens.primaryDark} />
              <Text style={styles.symptomBadgeText} numberOfLines={1}>
                {symptom}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={adTokens.textMuted} />
    </Pressable>
  );
}

function SectionListCard({ title, subtitle, loading, emptyText, items, selectedId, onSelectItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.cardScroll}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={adTokens.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="information-outline" size={22} color={adTokens.textMuted} />
            <Text style={styles.emptyStateText}>{emptyText}</Text>
          </View>
        ) : (
          items.map((item) => (
            <AppointmentRow
              key={item.appointmentId}
              item={item}
              isSelected={selectedId === item.appointmentId}
              onPress={() => onSelectItem(item.appointmentId)}
            />
          ))
        )}
      </View>
    </View>
  );
}

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/ManageAppointments.jsx. The web
 * version is a 3-column desktop layout (date list | in-progress list | detail
 * panel); on mobile the two lists stack vertically and tapping a row opens the
 * detail panel as a bottom sheet instead of a fixed third column - same
 * sections/data/actions, mobile-appropriate layout.
 *
 * Reschedule is intentionally not built: AllyDocReactApp explicitly hides the
 * Reschedule button for the freelancer doctor variant (the only variant this
 * app currently supports), so there is nothing to port for it yet.
 *
 * Chat/Call/Video buttons are rendered (same visibility flags as web) but show
 * a "Coming soon" notice when tapped - Daily.co video calling and the
 * WebSocket chat transport are separate, not-yet-built integrations per the
 * migration plan, not something skipped for this page specifically.
 */
export default function DoctorManageAppointmentsPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const doctorId = profile?.userId;
  const roleName = (profile?.roleName || '').toLowerCase().trim();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateAppointments, setDateAppointments] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);

  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [isSubmitLoader, setIsSubmitLoader] = useState(false);

  const fetchDateAppointments = useCallback(async (date) => {
    setDateLoading(true);
    const response = await getAppointmentsBasedOnDate(date);
    setDateAppointments(response.success && Array.isArray(response.data) ? response.data : []);
    setDateLoading(false);
  }, []);

  const fetchPendingAppointments = useCallback(async () => {
    if (!doctorId) return;
    setPendingLoading(true);
    const response = await getDoctorAppointments(doctorId, 'pending');
    const list = response.data?.data || response.data;
    setPendingAppointments(response.success && Array.isArray(list) ? list : []);
    setPendingLoading(false);
  }, [doctorId]);

  useEffect(() => {
    fetchDateAppointments(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPendingAppointments();
  }, [fetchPendingAppointments]);

  const loadDetails = useCallback(async (appointmentId) => {
    setDetailsLoading(true);
    setDetailsVisible(true);
    const response = await getAppointmentDetails(appointmentId);
    setAppointmentDetails(response.success ? response.data : null);
    setDetailsLoading(false);
  }, []);

  const handleSelectAppointment = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    loadDetails(appointmentId);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchDateAppointments(date);
  };

  const refreshAll = async () => {
    await Promise.all([fetchDateAppointments(selectedDate), fetchPendingAppointments()]);
  };

  const handleComplete = async () => {
    if (!appointmentDetails) return;
    setIsSubmitLoader(true);
    const response = await markAppointmentComplete({
      appointmentId: appointmentDetails.appointmentId,
      remarks: completeRemarks || undefined,
    });
    setIsSubmitLoader(false);
    if (response.success) {
      setIsConfirmationModalOpen(false);
      setCompleteRemarks('');
      setDetailsVisible(false);
      setAppointmentDetails(null);
      await fetchPendingAppointments();
    }
  };

  const comingSoon = (feature) =>
    Alert.alert('Coming soon', `${feature} is not available in the app yet.`);

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
    <View style={styles.flex1}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={dateLoading || pendingLoading} onRefresh={refreshAll} />}
      >
        {/* No repeated "Manage Appointments" title here - the navbar above already shows it. */}
        <Text style={styles.pageSubtitle}>View, manage, and take action on patient appointments</Text>

        <View style={styles.card}>
          <InlineCalendar selectedDate={selectedDate} onSelectDate={handleDateChange} />
          <View style={styles.selectedDateRow}>
            <View style={styles.selectedDateLabel}>
              <MaterialCommunityIcons name="calendar-check-outline" size={14} color={adTokens.primaryDark} />
              <Text style={styles.selectedDateText}>{formatDateLabel(selectedDate)}</Text>
            </View>
            <Pressable style={styles.todayButton} onPress={() => handleDateChange(new Date())}>
              <MaterialCommunityIcons name="calendar-today" size={13} color={adTokens.primaryDark} />
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          </View>
        </View>

        <SectionListCard
          title="Appointments"
          subtitle={`for ${formatDateLabel(selectedDate)}`}
          loading={dateLoading}
          emptyText="No appointments found for selected date."
          items={dateAppointments}
          selectedId={selectedAppointmentId}
          onSelectItem={handleSelectAppointment}
        />

        <SectionListCard
          title="In-Progress Appointments"
          subtitle="Active and pending appointments"
          loading={pendingLoading}
          emptyText="No in-progress appointments found."
          items={pendingAppointments}
          selectedId={selectedAppointmentId}
          onSelectItem={handleSelectAppointment}
        />
      </ScrollView>

      {/* Detail bottom sheet - mobile equivalent of the web's fixed third column.
          Uses RN's Modal (like every other modal in this app) so the dimmed
          backdrop truly covers the entire screen, not just the area below
          this screen's own header. */}
      <Modal visible={detailsVisible} animationType="slide" transparent onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.detailBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailsVisible(false)} />
          <View style={styles.detailSheet}>
            <ScrollView contentContainerStyle={styles.detailScroll}>
              <View style={styles.detailHandleRow}>
                <View style={styles.detailHandle} />
                <Pressable style={styles.detailCloseButton} onPress={() => setDetailsVisible(false)} hitSlop={8}>
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

                  {(appointmentDetails.isMarkAsCompleteVisible || appointmentDetails.isTreatmentPlanVisible) ? (
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
                        <Pressable style={styles.primaryButton} onPress={() => comingSoon('Treatment Plan')}>
                          <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={colors.white} />
                          <Text style={styles.actionButtonText}>Treatment Plan</Text>
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
                          disabled={isRealtimeActionDisabled}
                          onPress={() => comingSoon('Chat')}
                        >
                          <MaterialCommunityIcons name="message-text-outline" size={18} color={adTokens.textPrimary} />
                          <Text style={styles.commButtonText}>Chat</Text>
                        </Pressable>
                      ) : null}
                      {roleName !== 'nurse' && appointmentDetails.isAudioVisible ? (
                        <Pressable
                          style={[styles.commButton, isRealtimeActionDisabled && styles.commButtonDisabled]}
                          disabled={isRealtimeActionDisabled}
                          onPress={() => comingSoon('Audio call')}
                        >
                          <MaterialCommunityIcons name="phone-outline" size={18} color={adTokens.textPrimary} />
                          <Text style={styles.commButtonText}>Call</Text>
                        </Pressable>
                      ) : null}
                      {roleName !== 'nurse' && appointmentDetails.isVideoVisible ? (
                        <Pressable
                          style={[styles.commButton, isRealtimeActionDisabled && styles.commButtonDisabled]}
                          disabled={isRealtimeActionDisabled}
                          onPress={() => comingSoon('Video call')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  pageSubtitle: { fontSize: 13, color: adTokens.textSecondary, marginBottom: 16 },

  card: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 14,
    marginBottom: 14,
    ...adTokens.cardShadow,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  cardSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2, marginBottom: 10 },
  cardScroll: { gap: 8 },

  selectedDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  selectedDateLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedDateText: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: adTokens.primaryTint,
  },
  todayButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.primaryDark },

  emptyState: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyStateText: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },

  // ── Appointment row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  rowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: adTokens.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, flexShrink: 1 },
  rowRef: { fontSize: 10.5, color: adTokens.textMuted },
  rowDate: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  symptomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: adTokens.primaryTint,
    maxWidth: 140,
  },
  symptomBadgeText: { fontSize: 10.5, fontWeight: '600', color: adTokens.primaryDark },

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
