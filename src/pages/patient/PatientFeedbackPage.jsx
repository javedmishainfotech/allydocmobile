import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getPatientAppointmentsList } from '../../services/patientAppointmentsService';
import { extractAppointmentList } from '../../utils/appointmentListApi';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import Avatar from '../../components/Avatar';
import ReviewSheet from '../../components/feedback/ReviewSheet';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const COMPLETED_ONLY = { status: ['completed'] };

// "physicalMedicine" -> "Physical Medicine"
const formatSpecialization = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
};

function Stars({ rating }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons key={n} name="star" size={16} color={n <= rating ? '#F59E0B' : adTokens.border} />
      ))}
    </View>
  );
}

function FeedbackCard({ appointment, onReview }) {
  const display = getAppointmentDisplay(appointment);
  const specialization = formatSpecialization(appointment.specialization);
  const rating = appointment.feedbackRating ?? appointment.isFeedback;
  const isReviewed = rating !== null && rating !== undefined;
  const feedbackText = appointment.feedbackComment || appointment.comment;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={appointment.name} imageUrl={appointment.profileImage} size={52} />
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>
            Dr. {appointment.name}
          </Text>
          {specialization ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="stethoscope" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>{specialization}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={adTokens.textMuted} />
            <Text style={styles.metaText}>{display.date}</Text>
            <MaterialCommunityIcons name="clock-outline" size={14} color={adTokens.textMuted} style={styles.metaGap} />
            <Text style={styles.metaText}>{display.timeWithZone}</Text>
          </View>
        </View>
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Completed</Text>
        </View>
      </View>

      {appointment.remarks ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="note-text-outline" size={14} color={adTokens.textMuted} />
          <Text style={[styles.metaText, styles.flex1]}>{appointment.remarks}</Text>
        </View>
      ) : null}

      {isReviewed ? (
        <View style={styles.review}>
          <Stars rating={Number(rating)} />
          {feedbackText ? <Text style={styles.quote}>&quot;{feedbackText}&quot;</Text> : null}
        </View>
      ) : null}

      {!appointment.isFeedback ? (
        <Pressable style={styles.reviewButton} onPress={() => onReview(appointment)}>
          <MaterialCommunityIcons name="star-outline" size={18} color={adTokens.white} />
          <Text style={styles.reviewButtonText}>Give Review</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Patient "Feedback" - port of AllyDocReactApp's module/Patient/Pages/Feedback: the patient's
 * completed appointments (`GET /PatientAppointments?AppointmentStatus=completed`) split into
 * Pending (no feedback yet) and Reviewed, with Give Review on a pending one (`POST /AddFeedback`).
 * Not yet ported: the web's `?appointmentId=` deep link that auto-opens the review sheet (it is
 * driven by notifications, which arrive with the push-notification work).
 */
export default function PatientFeedbackPage() {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const patientId = profile?.userId;

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewTarget, setReviewTarget] = useState(null);
  const requestCounter = useRef(0);

  const load = useCallback(async () => {
    if (!patientId) return;
    const requestId = (requestCounter.current += 1);
    setIsLoading(true);
    setLoadError(null);
    const result = await getPatientAppointmentsList(patientId, COMPLETED_ONLY);
    if (requestId !== requestCounter.current) return;
    if (!result.success) {
      setAppointments([]);
      setLoadError(result.message || 'Unable to load your appointments.');
    } else {
      setAppointments(extractAppointmentList(result.raw));
    }
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const { pending, reviewed } = useMemo(
    () => ({
      pending: appointments.filter((a) => a?.isFeedback === null),
      reviewed: appointments.filter((a) => a?.isFeedback !== null),
    }),
    [appointments],
  );
  const currentList = activeTab === 'pending' ? pending : reviewed;

  const tabs = (
    <View style={styles.tabs}>
      {[
        { key: 'pending', label: 'Pending', icon: 'message-processing-outline', count: pending.length },
        { key: 'reviewed', label: 'Reviewed', icon: 'check-all', count: reviewed.length },
      ].map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <MaterialCommunityIcons name={tab.icon} size={16} color={active ? adTokens.white : adTokens.textSecondary} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            {tab.count > 0 ? (
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{tab.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.flex1}>
      <FlatList
        data={isLoading || loadError ? [] : currentList}
        keyExtractor={(appointment, index) => String(appointment.appointmentId ?? appointment.id ?? index)}
        renderItem={({ item }) => <FeedbackCard appointment={item} onReview={setReviewTarget} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>Provide and manage your feedback about completed appointments.</Text>
            {tabs}
          </View>
        }
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading && appointments.length > 0} onRefresh={load} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={adTokens.primary} />
              <Text style={styles.stateText}>Loading feedback...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
              <Text style={styles.stateText}>{loadError}</Text>
              <Pressable style={styles.retryButton} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.state}>
              <MaterialCommunityIcons name="message-star-outline" size={30} color={adTokens.textMuted} />
              <Text style={styles.stateTitle}>No records found</Text>
              <Text style={styles.stateText}>There are no items to display here yet</Text>
            </View>
          )
        }
      />

      <ReviewSheet
        visible={reviewTarget != null}
        appointment={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSaved={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16 },
  separator: { height: 10 },

  header: { gap: 12, marginBottom: 14 },
  subtitle: { fontSize: 13, color: adTokens.textSecondary },
  tabs: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 14, backgroundColor: adTokens.gray100 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 11 },
  tabActive: { backgroundColor: adTokens.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: adTokens.textSecondary },
  tabTextActive: { color: adTokens.white },
  tabCount: { minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: adTokens.white, alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11.5, fontWeight: '800', color: adTokens.primaryDark },
  tabCountTextActive: { color: adTokens.white },

  card: {
    padding: 12,
    gap: 10,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaGap: { marginLeft: 8 },
  metaText: { fontSize: 12.5, color: adTokens.textSecondary },
  completedBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#D1FAE5' },
  completedText: { fontSize: 11.5, fontWeight: '700', color: '#10B981' },
  review: { gap: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  quote: { fontSize: 12.5, fontStyle: 'italic', color: adTokens.textSecondary, lineHeight: 18 },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: adTokens.primary,
  },
  reviewButtonText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 6, paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
