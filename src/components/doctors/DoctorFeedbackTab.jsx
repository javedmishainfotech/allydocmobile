import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDoctorFeedbackAppointments } from '../../services/doctorsListService';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import { adTokens } from '../../theme/colors';

// Mirrors toDisplayFiveScale in AllyDocReactApp's Feedback module: ratings above 10 are
// assumed to be on a 0-100 scale (divide by 20), else already 0-5.
function toDisplayFiveScale(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 10 ? n / 20 : n;
}

function StarRow({ value }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons key={n} name="star" size={14} color={n <= Math.round(value) ? '#F59E0B' : adTokens.border} />
      ))}
    </View>
  );
}

function CommentText({ comment }) {
  const [expanded, setExpanded] = useState(false);
  const text = String(comment || '').trim();
  if (!text) return <Text style={styles.noComment}>No comment provided</Text>;
  const isLong = text.length > 120;
  const shown = expanded || !isLong ? text : `${text.slice(0, 120)}...`;
  return (
    <View>
      <Text style={styles.commentText}>{shown}</Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.showMore}>{expanded ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Port of ClinicDoctorPatientFeedback.jsx (scoped-to-one-doctor case only - the no-id "hub"
 * state doesn't apply here since this is always opened from a specific doctor's detail). */
export default function DoctorFeedbackTab({ doctorId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    getDoctorFeedbackAppointments(doctorId).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.Items || [];
      const rated = list.filter((item) => {
        const r = toDisplayFiveScale(item.rating ?? item.feedbackRating);
        return r != null;
      });
      setRows(res.success ? rated : []);
      setLoading(false);
    });
  }, [doctorId]);

  const totalCount = rows.length;
  const avgRating =
    totalCount > 0
      ? rows.reduce((sum, item) => sum + (toDisplayFiveScale(item.rating ?? item.feedbackRating) || 0), 0) / totalCount
      : 0;

  if (loading) return <ActivityIndicator style={styles.loader} />;

  return (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Feedback</Text>
          <Text style={styles.statValue}>{totalCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Average Rating</Text>
          <Text style={styles.statValue}>★ {avgRating.toFixed(1)} / 5</Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No feedback submitted yet.</Text>
      ) : (
        rows.map((item, index) => {
          const name = item.patientName || item.name || 'Patient';
          const display = getAppointmentDisplay(item);
          const rating = toDisplayFiveScale(item.rating ?? item.feedbackRating) || 0;
          return (
            <View key={item.appointmentId ?? index} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.apptNum}>#{item.reference || item.appointmentId}</Text>
                <Text style={styles.meta}>{display.date} · {display.timeWithZone}</Text>
              </View>
              <Text style={styles.name}>{name}</Text>
              <View style={styles.ratingRow}>
                <StarRow value={rating} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}/5</Text>
              </View>
              <CommentText comment={item.comment ?? item.feedbackComment} />
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12 },
  statLabel: { fontSize: 11, color: adTokens.textSecondary },
  statValue: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginTop: 2 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, paddingVertical: 20, textAlign: 'center' },
  row: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 10, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  apptNum: { fontSize: 11, fontWeight: '700', color: adTokens.textMuted },
  meta: { fontSize: 11, color: adTokens.textSecondary },
  name: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  starRow: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 11.5, color: adTokens.textSecondary },
  noComment: { fontSize: 12, color: adTokens.textMuted, fontStyle: 'italic', marginTop: 4 },
  commentText: { fontSize: 12.5, color: adTokens.textPrimary, marginTop: 4, lineHeight: 17 },
  showMore: { fontSize: 11.5, color: adTokens.primaryDark, fontWeight: '600', marginTop: 2 },
});
