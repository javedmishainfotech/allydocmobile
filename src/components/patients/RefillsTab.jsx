import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { getPendingRefillRequestsDetailed } from '../../services/doseSpotClinicalService';
import RefillDetailModal from './RefillDetailModal';
import { adTokens } from '../../theme/colors';

function RequestRow({ item, onOpen }) {
  const isControlled = Boolean(item.refillRequestIsControlled ?? item.IsControlled);
  return (
    <Pressable style={styles.row} onPress={() => onOpen(item)}>
      <View style={styles.flex1}>
        <Text style={styles.rowTitle}>
          {[item.Patient?.FirstName, item.Patient?.LastName].filter(Boolean).join(' ')}
        </Text>
        <Text style={styles.rowMeta}>Requested {item.RequestedDate}</Text>
        {isControlled ? (
          <View style={styles.controlledBadge}>
            <Text style={styles.controlledBadgeText}>Controlled Substance</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/** Port of AllyDocReactApp's RefillPendingRequestsTab.jsx, backed by the
 * detailed endpoint directly (same approach as RxChangeTab). */
export default function RefillsTab({ doseSpotPatientId }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    const response = await getPendingRefillRequestsDetailed({ patientId: doseSpotPatientId });
    const items = response.data?.Items;
    setRequests(response.success && Array.isArray(items) ? items : []);
    setIsLoading(false);
  }, [doseSpotPatientId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <View>
      <Text style={styles.sectionTitle}>Refill Requests</Text>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No pending refill requests.</Text>
        </View>
      ) : (
        requests.map((item, index) => (
          <RequestRow key={item.RefillId ?? item.RefillRequestId ?? index} item={item} onOpen={setSelectedRequest} />
        ))
      )}

      <RefillDetailModal
        visible={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onResolved={() => {
          setSelectedRequest(null);
          loadRequests();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 14 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  rowMeta: { fontSize: 11, color: adTokens.textMuted, marginTop: 2 },
  controlledBadge: { alignSelf: 'flex-start', marginTop: 5, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.warningLight },
  controlledBadgeText: { fontSize: 9.5, fontWeight: '700', color: adTokens.warningDark },
  chevron: { fontSize: 20, color: adTokens.textMuted, paddingHorizontal: 4 },
});
