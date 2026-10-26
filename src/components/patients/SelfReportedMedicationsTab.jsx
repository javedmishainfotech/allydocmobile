import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { getSelfReportedMedications } from '../../services/doseSpotClinicalService';
import SelfReportedMedicationModal from './SelfReportedMedicationModal';
import RemoveSelfReportedMedicationModal from './RemoveSelfReportedMedicationModal';
import { colors, adTokens } from '../../theme/colors';

function getTypeBadge(item) {
  if (item.DispensableDrugID != null) return { label: 'Coded', color: adTokens.primaryDark, bg: adTokens.primaryLight };
  if (item.RoutedDoseFormDrugID != null) return { label: 'Simple', color: adTokens.infoDark, bg: adTokens.infoLight };
  return { label: 'Freetext', color: adTokens.textSecondary, bg: adTokens.gray100 };
}

function MedicationRow({ item, onEdit, onRemove }) {
  const badge = getTypeBadge(item);
  return (
    <View style={styles.row}>
      <View style={styles.flex1}>
        <View style={styles.nameRow}>
          <Text style={styles.drugName} numberOfLines={1}>
            {item.DisplayName}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.metaText} numberOfLines={1}>
          {item.Directions}
        </Text>
        <Text style={styles.metaText}>
          Qty {item.Quantity} · Refills {item.Refills} · {item.Status}
        </Text>
      </View>
      <Pressable style={styles.iconButton} onPress={() => onEdit(item)} hitSlop={8}>
        <Feather name="edit-2" size={14} color={adTokens.primaryDark} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => onRemove(item)} hitSlop={8}>
        <Feather name="x-circle" size={16} color={adTokens.danger} />
      </Pressable>
    </View>
  );
}

/** Port of AllyDocReactApp's SelfReportedMedicationsTab.jsx - GET
 * /api/patients/{doseSpotPatientId}/selfReportedMedications, with full
 * Add/Edit/Remove parity. */
export default function SelfReportedMedicationsTab({ doseSpotPatientId }) {
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [removingMedication, setRemovingMedication] = useState(null);

  const loadMedications = useCallback(async () => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    const response = await getSelfReportedMedications(doseSpotPatientId);
    const items = response.data?.Items;
    setMedications(response.success && Array.isArray(items) ? items : []);
    setIsLoading(false);
  }, [doseSpotPatientId]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Self Reported Medications</Text>
        <Pressable style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Feather name="plus" size={14} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No self-reported medications.</Text>
        </View>
      ) : (
        medications.map((item, index) => (
          <MedicationRow
            key={item.SelfReportedMedicationId ?? index}
            item={item}
            onEdit={setEditingMedication}
            onRemove={setRemovingMedication}
          />
        ))
      )}

      <SelfReportedMedicationModal
        visible={addModalVisible || Boolean(editingMedication)}
        doseSpotPatientId={doseSpotPatientId}
        editing={editingMedication}
        onClose={() => {
          setAddModalVisible(false);
          setEditingMedication(null);
        }}
        onSaved={() => {
          setAddModalVisible(false);
          setEditingMedication(null);
          loadMedications();
        }}
      />

      <RemoveSelfReportedMedicationModal
        visible={Boolean(removingMedication)}
        doseSpotPatientId={doseSpotPatientId}
        medication={removingMedication}
        onClose={() => setRemovingMedication(null)}
        onRemoved={() => {
          setRemovingMedication(null);
          loadMedications();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: adTokens.primary, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  addButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },

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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drugName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, flexShrink: 1 },
  typeBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  metaText: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 3 },
  iconButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: adTokens.gray50, alignItems: 'center', justifyContent: 'center' },
});
