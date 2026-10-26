import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { getMedicationHistory } from '../../services/doseSpotClinicalService';
import { adTokens } from '../../theme/colors';

/** Port of AllyDocReactApp's MedicationHistory.jsx - read-only list, fetched
 * only after MedicationHistoryConsentModal confirmation (gated by the parent
 * PatientDetailModal, same as web gates it in ViewPatientPage.jsx). */
export default function MedicationHistoryTab({ doseSpotPatientId }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    getMedicationHistory(doseSpotPatientId).then((response) => {
      const items = response.data?.Items;
      setEntries(response.success && Array.isArray(items) ? items : []);
      setIsLoading(false);
    });
  }, [doseSpotPatientId]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={adTokens.primary} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.mutedText}>No medication history found.</Text>
      </View>
    );
  }

  return (
    <View>
      {entries.map((item, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.drugName}>{item.DisplayName || item.DrugName}</Text>
          <View style={styles.metaLine}>
            <Text style={styles.metaText}>Written {item.WrittenDate}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>Qty {item.Quantity}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>Days Supply {item.DaysSupply}</Text>
          </View>
          <Text style={styles.metaText}>Refills Remaining: {item.Refills}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },
  row: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  drugName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  metaLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  metaText: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  metaDot: { fontSize: 11.5, color: adTokens.textMuted },
});
