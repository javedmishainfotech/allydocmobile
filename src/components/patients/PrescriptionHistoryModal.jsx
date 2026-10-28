import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getPrescriptionLog } from '../../services/prescriptionService';
import { getPrescriptionStatusTone } from '../../utils/treatmentPlanFields';
import { formatPrescriptionLogDateTime, getPrescriptionLogMessage, sortPrescriptionLogs } from '../../utils/prescriptionLog';
import { adTokens } from '../../theme/colors';

const TONE_COLORS = {
  info: adTokens.infoDark,
  primary: adTokens.primaryDark,
  warning: adTokens.warningDark,
  success: adTokens.successDark,
  danger: adTokens.danger,
  neutral: adTokens.textMuted,
};

/** Port of web's PrescriptionHistoryModal: the prescription's audit trail (`GET /prescriptions/{id}/log`), oldest first. */
export default function PrescriptionHistoryModal({ visible, doseSpotPatientId, prescriptionId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !doseSpotPatientId || !prescriptionId) return;
    setIsLoading(true);
    setError('');
    getPrescriptionLog(doseSpotPatientId, prescriptionId).then((result) => {
      if (result.success) {
        const items = Array.isArray(result.data) ? result.data : Array.isArray(result.data?.Items) ? result.data.Items : [];
        setLogs(sortPrescriptionLogs(items));
      } else {
        setLogs([]);
        setError(result.message || 'Unable to load this prescription’s history.');
      }
      setIsLoading(false);
    });
  }, [visible, doseSpotPatientId, prescriptionId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Prescription History</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={adTokens.primary} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="alert-circle-outline" size={26} color={adTokens.danger} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="history" size={26} color={adTokens.textMuted} />
              <Text style={styles.emptyText}>No history recorded for this prescription yet.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.timeline}>
              {logs.map((item, index) => {
                const tone = TONE_COLORS[getPrescriptionStatusTone(item?.Status || item?.MedicationStatus)] || TONE_COLORS.neutral;
                const isLast = index === logs.length - 1;
                return (
                  <View key={`${item?.DateTimeStamp || 'log'}-${index}`} style={styles.item}>
                    <View style={styles.dotColumn}>
                      <View style={[styles.dot, { backgroundColor: tone }]} />
                      {!isLast ? <View style={styles.line} /> : null}
                    </View>
                    <View style={styles.card}>
                      <Text style={styles.message}>{getPrescriptionLogMessage(item)}</Text>
                      <View style={styles.metaRow}>
                        <Feather name="calendar" size={12} color={adTokens.textSecondary} />
                        <Text style={styles.metaText}>{formatPrescriptionLogDateTime(item?.DateTimeStamp)}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Feather name="user" size={12} color={adTokens.textSecondary} />
                        <Text style={styles.metaText}>Performed by: {item?.User || 'System'}</Text>
                      </View>
                      {item?.WasRefillRequest ? (
                        <View style={styles.refillBadge}>
                          <Text style={styles.refillBadgeText}>REFILL REQUEST</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  center: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  timeline: { paddingBottom: 12 },
  item: { flexDirection: 'row', gap: 10 },
  dotColumn: { alignItems: 'center', width: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: adTokens.border, marginTop: 2, marginBottom: 2 },
  card: { flex: 1, gap: 4, paddingBottom: 16 },
  message: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: adTokens.textSecondary },
  refillBadge: { alignSelf: 'flex-start', marginTop: 2, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.warningLight },
  refillBadgeText: { fontSize: 10, fontWeight: '800', color: adTokens.warningDark, letterSpacing: 0.4 },
});
