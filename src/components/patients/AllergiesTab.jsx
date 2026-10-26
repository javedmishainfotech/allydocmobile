import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getPatientAllergies, editPatientAllergy } from '../../services/doseSpotClinicalService';
import AllergyModal from './AllergyModal';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';

const STATUS_STYLE = {
  Active: { color: '#15803D', bg: '#DCFCE7' },
  Inactive: { color: '#475569', bg: adTokens.gray100 },
  Deleted: { color: '#B91C1C', bg: adTokens.dangerLight },
};

function AllergyRow({ item, onEdit, onDelete }) {
  const statusStyle = STATUS_STYLE[item.StatusType] || STATUS_STYLE.Active;
  return (
    <View style={styles.row}>
      <View style={styles.flex1}>
        <View style={styles.nameRow}>
          <MaterialCommunityIcons name="alert-circle" size={13} color="#DC2626" />
          <Text style={styles.allergyName} numberOfLines={1}>
            {item.DisplayName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{item.StatusType}</Text>
          </View>
        </View>
        <Text style={styles.metaText}>
          {item.Reaction} · {item.ReactionType} · {item.Severity || 'N/A'}
        </Text>
      </View>
      <Pressable style={styles.iconButton} onPress={() => onEdit(item)} hitSlop={8}>
        <Feather name="edit-2" size={14} color={adTokens.primaryDark} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => onDelete(item)} hitSlop={8}>
        <Feather name="trash-2" size={14} color={adTokens.danger} />
      </Pressable>
    </View>
  );
}

/** Port of AllyDocReactApp's AllergiesTab.jsx - GET
 * /api/Allergies/{doseSpotPatientId}/allergies, with Add/Edit/Delete/No
 * Known Allergy parity. "Delete" is an edit with statusType=Deleted (3),
 * there's no separate hard-delete endpoint - same as web. */
export default function AllergiesTab({ doseSpotPatientId }) {
  const [allergies, setAllergies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState(null);

  const loadAllergies = useCallback(async () => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    const response = await getPatientAllergies(doseSpotPatientId);
    const items = response.data?.Items;
    setAllergies(response.success && Array.isArray(items) ? items : []);
    setIsLoading(false);
  }, [doseSpotPatientId]);

  useEffect(() => {
    loadAllergies();
  }, [loadAllergies]);

  const handleDelete = (item) => {
    Alert.alert('Delete Allergy', `Remove "${item.DisplayName}" from this patient's allergy list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const response = await editPatientAllergy(doseSpotPatientId, item.PatientAllergyId, {
            reaction: item.Reaction,
            reactionType: item.ReactionType === 'AdverseReaction' ? '2' : '1',
            statusType: '3',
            onsetDate: item.OnsetDate,
          });
          if (response.success) {
            toast.success(response.message || 'Allergy removed.');
            loadAllergies();
          } else {
            toast.error(response.message || 'Unable to remove allergy.');
          }
        },
      },
    ]);
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Allergies</Text>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={14} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={adTokens.primary} />
        </View>
      ) : allergies.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.mutedText}>No known allergies on record.</Text>
        </View>
      ) : (
        allergies.map((item, index) => (
          <AllergyRow key={item.PatientAllergyId ?? index} item={item} onEdit={setEditingAllergy} onDelete={handleDelete} />
        ))
      )}

      <AllergyModal
        visible={modalVisible || Boolean(editingAllergy)}
        doseSpotPatientId={doseSpotPatientId}
        editing={editingAllergy}
        onClose={() => {
          setModalVisible(false);
          setEditingAllergy(null);
        }}
        onSaved={() => {
          setModalVisible(false);
          setEditingAllergy(null);
          loadAllergies();
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
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  allergyName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, flexShrink: 1 },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  statusBadgeText: { fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase' },
  metaText: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 4 },
  iconButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: adTokens.gray50, alignItems: 'center', justifyContent: 'center' },
});
