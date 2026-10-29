import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { getPendingRxChangeRequestsDetailed } from '../../services/doseSpotClinicalService';
import RxChangeDetailModal from './RxChangeDetailModal';
import { adTokens } from '../../theme/colors';

function RequestRow({ item, onOpen }) {
  return (
    <Pressable style={styles.row} onPress={() => onOpen(item)}>
      <View style={styles.flex1}>
        <Text style={styles.rowTitle}>{item.RxChangeType}</Text>
        <Text style={styles.rowSubtitle}>
          {[item.Patient?.FirstName, item.Patient?.LastName].filter(Boolean).join(' ')}
        </Text>
        <Text style={styles.rowMeta}>Requested {item.RequestedDate}</Text>
      </View>
      <View style={styles.chevronWrap}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

/** Port of AllyDocReactApp's RxChangePendingRequestsTab.jsx + its detailed
 * endpoint (used directly here so tapping a row has full detail without a
 * second round trip, same data the web app's "list" call produces).
 * `requestScope="clinic"` (used by the Doctor Requests page) omits `patientId`
 * entirely, same as web's `attachPatientIdToPendingParamsIfPatientScope`. */
export default function RxChangeTab({ doseSpotPatientId, requestScope = 'patient' }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = useCallback(async () => {
    if (requestScope === 'patient' && !doseSpotPatientId) return;
    setIsLoading(true);
    const response = await getPendingRxChangeRequestsDetailed(
      requestScope === 'clinic' ? {} : { patientId: doseSpotPatientId },
    );
    const items = response.data?.Items;
    setRequests(response.success && Array.isArray(items) ? items : []);
    setIsLoading(false);
  }, [doseSpotPatientId, requestScope]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <View>
      <Text style={styles.sectionTitle}>RxChange Requests</Text>
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No pending RxChange requests.</Text>
        </View>
      ) : (
        requests.map((item, index) => (
          <RequestRow key={item.RxChangeRequestId ?? item.RxChangeId ?? index} item={item} onOpen={setSelectedRequest} />
        ))
      )}

      <RxChangeDetailModal
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
  rowSubtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  rowMeta: { fontSize: 11, color: adTokens.textMuted, marginTop: 2 },
  chevronWrap: { paddingHorizontal: 4 },
  chevron: { fontSize: 20, color: adTokens.textMuted },
});
