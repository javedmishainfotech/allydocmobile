import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getClinicianFavorites, getClinicFavorites } from '../../services/prescriptionService';
import { getItem } from '../../utils/storage';
import OptionPicker from './OptionPicker';
import { adTokens } from '../../theme/colors';

const TYPE_OPTIONS = [
  { label: 'All', value: 0 },
  { label: 'Medications', value: 1 },
  { label: 'Supplies', value: 2 },
  { label: 'Compounds', value: 3 },
];

const favoriteKind = (fav) => {
  if (fav?.IsCompound || fav?.CompoundId) return 'COMPOUND';
  if (fav?.DispensableDrugId) return 'MEDICATION';
  if (fav?.IsSupply && fav?.SupplyId) return 'SUPPLY';
  if (fav?.IsSupply) return 'CUSTOM SUPPLY';
  return 'MEDICATION';
};

const KIND_COLORS = {
  MEDICATION: { bg: adTokens.gray100, color: adTokens.textPrimary },
  SUPPLY: { bg: adTokens.infoLight, color: adTokens.infoDark },
  'CUSTOM SUPPLY': { bg: adTokens.warningLight, color: adTokens.warningDark },
  COMPOUND: { bg: '#1E293B', color: '#FFFFFF' },
};

/**
 * Web ClinicPresetsTab (`source="clinic"`, `GET /api/ClinicFavorites/{clinicId}/prescriptionFavorites`) and
 * FavoritesTab (`source="clinician"`, `GET /api/ClinicianFavorites/{clinicianId}/prescriptionFavorites`): a type filter,
 * then rows of "+" / display name + type badge / directions / "Qty • Refills • Strength", 20 a page.
 */
export default function FavoritesList({ source, searchName = '', refreshKey = 0, pendingId, onUse }) {
  const [type, setType] = useState(0);
  const [items, setItems] = useState([]);
  const [pageResult, setPageResult] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const clinicianId = await getItem('doseSpotRefrenceId');
    const clinicId = (await getItem('doseSpotClinicId')) || clinicianId;
    const ownerId = source === 'clinic' ? clinicId : clinicianId;
    if (!ownerId) {
      setItems([]);
      setLoading(false);
      setError('Your DoseSpot account is not linked yet.');
      return;
    }
    const params = { pageNumber: page, pageSize: 20, searchName, favoriteType: type };
    const result = source === 'clinic' ? await getClinicFavorites(ownerId, params) : await getClinicianFavorites(ownerId, params);
    if (result.success) {
      setItems(Array.isArray(result.data?.Items) ? result.data.Items : []);
      setPageResult(result.data?.PageResult || null);
    } else {
      setItems([]);
      setError(result.message || 'Unable to load favorites.');
    }
    setLoading(false);
  }, [source, page, searchName, type]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const title = source === 'clinic' ? 'Clinic Favorites' : 'Clinician Favorites';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.typePicker}>
          <OptionPicker
            value={TYPE_OPTIONS.find((o) => o.value === type)?.label}
            options={TYPE_OPTIONS.map((o) => o.label)}
            onChange={(label) => {
              setType(TYPE_OPTIONS.find((o) => o.label === label)?.value ?? 0);
              setPage(1);
            }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={adTokens.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="star-outline" size={28} color={adTokens.textSecondary} />
          <Text style={styles.emptyTitle}>{source === 'clinic' ? 'No Clinic Favorites Found' : 'No Favorites Found'}</Text>
          <Text style={styles.emptyText}>
            {source === 'clinic' ? 'No presets have been configured for this clinic yet.' : 'Try changing the filter or search on the main page'}
          </Text>
        </View>
      ) : (
        items.map((fav, index) => {
          const kind = favoriteKind(fav);
          const colors = KIND_COLORS[kind];
          const id = fav.FavoriteId ?? fav.Id ?? fav.PrescriptionFavoriteId ?? index;
          const details = [
            fav.Quantity != null ? `Qty ${fav.Quantity}` : null,
            fav.Refills != null ? `Refills ${fav.Refills}` : null,
            fav.MedStrengthString || null,
          ]
            .filter(Boolean)
            .join(' • ');
          return (
            <View key={String(id)} style={styles.row}>
              <Pressable style={styles.addButton} onPress={() => onUse(fav, id)} disabled={pendingId === id}>
                {pendingId === id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="plus" size={18} color="#FFFFFF" />}
              </Pressable>
              <View style={styles.flex1}>
                <Text style={styles.name}>{fav.MedDisplayName || fav.Title || fav.Name || 'Favorite'}</Text>
                {fav.MedFullName ? (
                  <Text style={styles.fullName} numberOfLines={2}>
                    {fav.MedFullName}
                  </Text>
                ) : null}
                <View style={[styles.kind, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.kindText, { color: colors.color }]}>{kind}</Text>
                </View>
                <Text style={styles.directions} numberOfLines={2}>
                  {fav.Directions || 'No directions specified'}
                </Text>
                {details ? <Text style={styles.details}>{details}</Text> : null}
              </View>
            </View>
          );
        })
      )}

      {pageResult && pageResult.TotalPages > 1 ? (
        <View style={styles.pager}>
          <Pressable style={[styles.pageButton, page <= 1 && styles.disabled]} disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            <Text style={styles.pageText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageInfo}>
            Page {page} of {pageResult.TotalPages}
          </Text>
          <Pressable
            style={[styles.pageButton, page >= pageResult.TotalPages && styles.disabled]}
            disabled={page >= pageResult.TotalPages}
            onPress={() => setPage((p) => p + 1)}
          >
            <Text style={styles.pageText}>Next</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: adTokens.textPrimary },
  typePicker: { width: 150 },
  loader: { paddingVertical: 20 },
  error: { fontSize: 13, color: adTokens.danger },
  empty: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: adTokens.border },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: adTokens.textPrimary },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  addButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.primary },
  name: { fontSize: 14, fontWeight: '800', color: adTokens.textPrimary },
  fullName: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 1 },
  kind: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  kindText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  directions: { fontSize: 13, color: adTokens.textPrimary, marginTop: 4 },
  details: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary, marginTop: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: adTokens.primary },
  pageText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pageInfo: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  disabled: { opacity: 0.5 },
});
