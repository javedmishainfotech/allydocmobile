import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getClinicianFavorites, getClinicFavorites, FAVORITE_TYPE } from '../../services/prescriptionService';
import MedicationFavoriteModal from '../../components/favorites/MedicationFavoriteModal';
import SupplyFavoriteModal from '../../components/favorites/SupplyFavoriteModal';
import CompoundFavoriteModal from '../../components/favorites/CompoundFavoriteModal';
import { adTokens } from '../../theme/colors';
import { useDockInset } from '../../navigation/DockInsetContext';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

const CATEGORY_TABS = [
  { key: 'medications', label: 'Medications', type: FAVORITE_TYPE.MEDICATIONS },
  { key: 'supplies', label: 'Supplies', type: FAVORITE_TYPE.SUPPLIES },
  { key: 'compounds', label: 'Compounds', type: FAVORITE_TYPE.COMPOUNDS },
];
const PAGE_SIZE = 20;

function FavoriteRow({ item, onEdit }) {
  const name = item.Title || item.MedDisplayName || item.Name || 'Favorite';
  const directions = item.Directions || item.directions;
  const meta = [item.Quantity != null ? `Qty ${item.Quantity}` : null, item.Refills != null ? `${item.Refills} refills` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable style={styles.row} onPress={() => onEdit(item)}>
      <View style={styles.flex1}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {directions ? <Text style={styles.rowMeta} numberOfLines={1}>{directions}</Text> : null}
        {meta ? <Text style={styles.rowMetaSmall}>{meta}</Text> : null}
      </View>
      <Feather name="edit-2" size={16} color={adTokens.primaryDark} />
    </Pressable>
  );
}

/**
 * Port of AllyDocReactApp's Doctor/Pages/Favorites (clinician-wide, `scope="clinician"`) and
 * Doctor/Pages/Clinics/ClinicFavorites (clinic-wide, `scope="clinic"`) - full create/update CRUD
 * for Medications/Supplies/Compounds favorites. No "Order Sets" tab (commented out on web, shows
 * only a static "coming soon" message) and no Delete (no delete endpoint exists on web either -
 * its delete buttons just show a "coming soon" toast).
 */
export default function FavoritesPage({ scope = 'clinician' }) {
  const dockInset = useDockInset();
  const { profile } = useAuth();
  const scopeId = scope === 'clinic' ? profile?.clinicDoseSpotId || profile?.doseSpotRefrenceId : profile?.doseSpotRefrenceId;

  const [activeTab, setActiveTab] = useState('medications');
  const [searchText, setSearchText] = useState('');
  const [searchName, setSearchName] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageResult, setPageResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const activeType = CATEGORY_TABS.find((t) => t.key === activeTab)?.type;

  const load = useCallback(async () => {
    if (!scopeId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = { pageNumber: page, pageSize: PAGE_SIZE, searchName, favoriteType: activeType };
    const res = scope === 'clinic' ? await getClinicFavorites(scopeId, params) : await getClinicianFavorites(scopeId, params);
    setItems(res.success ? res.data?.Items || [] : []);
    setPageResult(res.success ? res.data?.PageResult || null : null);
    setLoading(false);
  }, [scope, scopeId, page, searchName, activeType]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const runSearch = () => {
    setPage(1);
    setSearchName(searchText.trim());
  };

  const handleSaved = () => {
    setAddModalOpen(false);
    setEditingFavorite(null);
    load();
  };

  const totalPages = pageResult?.TotalPages || 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{scope === 'clinic' ? 'Clinic Favorites' : 'Favorites'}</Text>
        <Text style={styles.subtitle}>Manage your saved prescription favorites</Text>
      </View>

      <SegmentedTabs tabs={CATEGORY_TABS} activeKey={activeTab} onChange={switchTab} style={styles.tabBar} />

      <View style={styles.toolbarRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={14} color={adTokens.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={runSearch}
          />
        </View>
        <Pressable style={styles.searchButton} onPress={runSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <Pressable style={styles.addButton} onPress={() => setAddModalOpen(true)}>
        <Feather name="plus" size={14} color={adTokens.white} />
        <Text style={styles.addButtonText}>Add New Item to Favorites</Text>
      </Pressable>

      {!scopeId ? (
        <Text style={styles.emptyText}>Your DoseSpot account is not linked yet.</Text>
      ) : loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.Id ?? item.id ?? index)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + dockInset }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="star-outline" size={28} color={adTokens.textMuted} />
              <Text style={styles.emptyStateText}>No favorites found.</Text>
            </View>
          }
          renderItem={({ item }) => <FavoriteRow item={item} onEdit={setEditingFavorite} />}
        />
      )}

      {totalPages > 1 ? (
        <View style={styles.pagination}>
          <Pressable style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]} disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            <Feather name="chevron-left" size={16} color={page <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
          </Pressable>
          <Text style={styles.pageLabel}>Page {page} of {totalPages}</Text>
          <Pressable style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]} disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
            <Feather name="chevron-right" size={16} color={page >= totalPages ? adTokens.textMuted : adTokens.primaryDark} />
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'medications' ? (
        <MedicationFavoriteModal
          visible={addModalOpen || Boolean(editingFavorite)}
          scope={scope}
          scopeId={scopeId}
          favorite={editingFavorite}
          onClose={() => {
            setAddModalOpen(false);
            setEditingFavorite(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
      {activeTab === 'supplies' ? (
        <SupplyFavoriteModal
          visible={addModalOpen || Boolean(editingFavorite)}
          scope={scope}
          scopeId={scopeId}
          favorite={editingFavorite}
          onClose={() => {
            setAddModalOpen(false);
            setEditingFavorite(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
      {activeTab === 'compounds' ? (
        <CompoundFavoriteModal
          visible={addModalOpen || Boolean(editingFavorite)}
          scope={scope}
          scopeId={scopeId}
          favorite={editingFavorite}
          onClose={() => {
            setAddModalOpen(false);
            setEditingFavorite(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.gray50 },
  flex1: { flex: 1 },
  header: { padding: 16, backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  tabBar: { margin: 16, marginBottom: 8 },
  toolbarRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: adTokens.white },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, color: adTokens.textPrimary },
  searchButton: { backgroundColor: adTokens.primary, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: adTokens.primaryDark, borderRadius: 10, marginHorizontal: 16, marginBottom: 12, paddingVertical: 10 },
  addButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
  loader: { marginTop: 40 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', padding: 24 },
  listContent: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  rowMeta: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 2 },
  rowMetaSmall: { fontSize: 11, color: adTokens.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyStateText: { fontSize: 13, color: adTokens.textSecondary },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  pageButton: { padding: 8, borderRadius: 999, backgroundColor: adTokens.gray100 },
  pageButtonDisabled: { opacity: 0.5 },
  pageLabel: { fontSize: 12.5, color: adTokens.textSecondary },
});
