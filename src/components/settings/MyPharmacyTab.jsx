import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import {
  addMyPharmacy,
  deleteMyPharmacy,
  getMyPharmacies,
  searchPharmacies,
} from '../../services/patientPharmacyService';
import { openExternalLink } from '../../utils/openExternalLink';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const MIN_SEARCH_LENGTH = 3;
const SEARCH_PAGE_SIZE = 20;
const SECTIONS = { SEARCH: 'search', DEFAULT: 'default', PREFERRED: 'preferred' };

const getPharmacyId = (pharmacy) => pharmacy?.PharmacyId ?? pharmacy?.pharmacyId;
const isDefaultPharmacy = (pharmacy) => pharmacy?.IsDefault === true || pharmacy?.isDefault === true;
const getPharmacyName = (pharmacy) => pharmacy?.StoreName || 'Pharmacy';

/** Full street address + city/state/zip, so the map pin lands on the actual building. */
const getMapQuery = (pharmacy) =>
  [getPharmacyName(pharmacy), pharmacy?.Address1, pharmacy?.City, pharmacy?.State, pharmacy?.ZipCode]
    .filter(Boolean)
    .join(', ');

const openMap = (pharmacy) =>
  openExternalLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getMapQuery(pharmacy))}`);

function Badge({ variant, label }) {
  const isDefault = variant === 'default';
  return (
    <View style={[styles.badge, isDefault ? styles.badgeDefault : styles.badgePreferred]}>
      {isDefault ? <Feather name="check" size={11} color={adTokens.successDark} /> : null}
      <Text style={[styles.badgeText, { color: isDefault ? adTokens.successDark : adTokens.primaryDark }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, icon, tone = 'primary', busy, disabled, onPress }) {
  const palette = {
    primary: { bg: adTokens.primary, color: adTokens.white, border: adTokens.primary },
    outline: { bg: adTokens.white, color: adTokens.primaryDark, border: adTokens.primary },
    danger: { bg: adTokens.white, color: adTokens.danger, border: adTokens.danger },
  }[tone];
  return (
    <Pressable
      style={[styles.action, { backgroundColor: palette.bg, borderColor: palette.border }, (busy || disabled) && styles.actionDisabled]}
      disabled={busy || disabled}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator size="small" color={palette.color} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={15} color={palette.color} />
      ) : null}
      <Text style={[styles.actionText, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

function PharmacyCard({ pharmacy, badges = [], children }) {
  const addressLine = [pharmacy?.City, pharmacy?.State, pharmacy?.ZipCode].filter(Boolean).join(', ');
  const hasLocation = Boolean(pharmacy?.Address1 || addressLine);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons name="store-outline" size={22} color={adTokens.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{getPharmacyName(pharmacy)}</Text>
          {badges.length > 0 ? (
            <View style={styles.badges}>
              {badges.map((badge) => (
                <Badge key={badge.label} {...badge} />
              ))}
            </View>
          ) : null}
          {hasLocation ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>
                {pharmacy?.Address1}
                {pharmacy?.Address1 && addressLine ? ', ' : ''}
                {addressLine}
              </Text>
            </View>
          ) : null}
          {pharmacy?.PrimaryPhone ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="phone-outline" size={14} color={adTokens.textMuted} />
              <Text style={styles.metaText}>{pharmacy.PrimaryPhone}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        {hasLocation ? <ActionButton label="View map" icon="map-marker-outline" tone="outline" onPress={() => openMap(pharmacy)} /> : null}
        {children}
      </View>
    </View>
  );
}

function EmptyBox({ icon, text, onGoSearch }) {
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={28} color={adTokens.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
      {onGoSearch ? <ActionButton label="Go to Search Pharmacies" onPress={onGoSearch} /> : null}
    </View>
  );
}

/**
 * Patient "My Pharmacy" - port of AllyDocReactApp's module/Patient/Pages/Setting/Tab/MyPharmacyTab:
 * search the pharmacy directory (`GET /api/Pharmacies/SearchPharmacies`, min 3 characters, 20 a page),
 * save one as Default and/or Preferred (`POST /api/Pharmacies/MyPharmacies/{id}?setAsDefault=`),
 * remove it (`DELETE ...`), and see the saved list (`GET /api/Pharmacies/MyPharmacies`). Every saved
 * pharmacy is implicitly Preferred; the Default one is where prescriptions are sent. "View map"
 * opens the address in Google Maps (the web embeds a map).
 */
export default function MyPharmacyTab() {
  const [section, setSection] = useState(SECTIONS.SEARCH);

  const [myPharmacies, setMyPharmacies] = useState([]);
  const [isLoadingMine, setIsLoadingMine] = useState(true);
  const [mineError, setMineError] = useState('');
  const [busyKey, setBusyKey] = useState(null); // `${pharmacyId}:${action}`
  const [sortOrder, setSortOrder] = useState('name-asc');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [searchPagination, setSearchPagination] = useState(null);

  const loadMine = useCallback(async () => {
    setIsLoadingMine(true);
    setMineError('');
    const result = await getMyPharmacies();
    if (result.success) {
      const data = result.data || {};
      const items = data?.Items || (Array.isArray(data) ? data : []);
      setMyPharmacies(Array.isArray(items) ? items : []);
    } else {
      // A failed call must not look like "no pharmacies" (e.g. DoseSpot reference missing).
      setMyPharmacies([]);
      setMineError(result.message || result.raw?.providerMessage || 'Could not load your pharmacies.');
    }
    setIsLoadingMine(false);
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
    setSearchError('');
    setSearchPage(1);
    setSearchPagination(null);
  };

  const performSearch = async (page) => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setSearchError(`Please enter at least ${MIN_SEARCH_LENGTH} characters to search.`);
      return;
    }
    setSearchError('');
    setIsSearching(true);
    setHasSearched(true);
    const result = await searchPharmacies({ name: trimmed, pageNumber: page, pageSize: SEARCH_PAGE_SIZE });
    if (result.success) {
      const data = result.data || {};
      setSearchResults(Array.isArray(data.Items) ? data.Items : []);
      setSearchPagination(data.PageResult || null);
      setSearchPage(page);
    } else {
      toast.error(result.message || 'Failed to search pharmacies');
    }
    setIsSearching(false);
  };

  // Adds (or promotes / demotes) a pharmacy in the saved list. A pharmacy can be Default AND
  // Preferred at once - it never leaves the saved list just because it is or stops being Default.
  const handleAdd = async (pharmacy, setAsDefault, actionKey) => {
    const pharmacyId = getPharmacyId(pharmacy);
    if (!pharmacyId) return;
    setBusyKey(actionKey);
    const result = await addMyPharmacy(pharmacyId, setAsDefault);
    if (result.success) {
      toast.success(result.message || 'Pharmacy saved');
      await loadMine();
    } else {
      toast.error(result.message || 'Failed to save pharmacy');
    }
    setBusyKey(null);
  };

  // "Remove Default" only demotes - it stays saved / Preferred.
  const handleRemoveDefault = (pharmacy) => handleAdd(pharmacy, false, `${getPharmacyId(pharmacy)}:removeDefault`);

  // "Remove from Preferred" un-saves it entirely (it can still be found by searching again).
  const handleRemove = async (pharmacy) => {
    const pharmacyId = getPharmacyId(pharmacy);
    if (!pharmacyId) return;
    setBusyKey(`${pharmacyId}:remove`);
    const result = await deleteMyPharmacy(pharmacyId);
    if (result.success) {
      toast.success(result.message || 'Pharmacy removed');
      await loadMine();
    } else {
      toast.error(result.message || 'Failed to remove pharmacy');
    }
    setBusyKey(null);
  };

  const sortedPharmacies = useMemo(() => {
    const list = [...myPharmacies];
    list.sort((a, b) => {
      // The Default pharmacy always stays on top regardless of the sort order.
      if (isDefaultPharmacy(a) && !isDefaultPharmacy(b)) return -1;
      if (!isDefaultPharmacy(a) && isDefaultPharmacy(b)) return 1;
      const nameA = getPharmacyName(a).toLowerCase();
      const nameB = getPharmacyName(b).toLowerCase();
      return sortOrder === 'name-desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
    });
    return list;
  }, [myPharmacies, sortOrder]);

  const defaultPharmacy = myPharmacies.find(isDefaultPharmacy) || null;
  const goSearch = () => setSection(SECTIONS.SEARCH);

  const navItems = [
    { key: SECTIONS.SEARCH, icon: 'magnify', label: 'Search', count: hasSearched ? searchResults.length : null },
    { key: SECTIONS.DEFAULT, icon: 'shield-check-outline', label: 'Default', count: defaultPharmacy ? 1 : 0 },
    { key: SECTIONS.PREFERRED, icon: 'star-outline', label: 'Preferred', count: myPharmacies.length },
  ];

  const searchBadges = (pharmacy) => {
    const saved = myPharmacies.find((p) => getPharmacyId(p) === getPharmacyId(pharmacy));
    if (!saved) return [];
    return isDefaultPharmacy(saved)
      ? [{ label: 'DEFAULT', variant: 'default' }]
      : [{ label: 'PREFERRED', variant: 'preferred' }];
  };

  const renderSearch = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Search Pharmacies</Text>
      <Text style={styles.sectionHint}>Find and add pharmacies to your list.</Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={adTokens.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pharmacy by name..."
            placeholderTextColor={adTokens.textMuted}
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (searchError) setSearchError('');
            }}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(1)}
          />
          {searchTerm ? (
            <Pressable onPress={clearSearch} hitSlop={8} accessibilityLabel="Clear search">
              <MaterialCommunityIcons name="close-circle" size={18} color={adTokens.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <ActionButton label="Search" busy={isSearching} onPress={() => performSearch(1)} />
      </View>
      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

      {isSearching ? (
        <ActivityIndicator style={styles.loader} color={adTokens.primary} />
      ) : hasSearched ? (
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>Search Results ({searchResults.length})</Text>
            <Pressable onPress={clearSearch}>
              <Text style={styles.linkText}>Clear results</Text>
            </Pressable>
          </View>
          {searchResults.length === 0 ? (
            <EmptyBox icon="store-search-outline" text="No pharmacies found for that search." />
          ) : (
            searchResults.map((pharmacy) => {
              const pharmacyId = getPharmacyId(pharmacy);
              const saved = myPharmacies.some((p) => getPharmacyId(p) === pharmacyId);
              const defaultKey = `${pharmacyId}:default`;
              const preferredKey = `${pharmacyId}:preferred`;
              const anyBusy = busyKey === defaultKey || busyKey === preferredKey;
              return (
                <PharmacyCard key={pharmacyId} pharmacy={pharmacy} badges={searchBadges(pharmacy)}>
                  {saved ? null : (
                    <>
                      <ActionButton
                        label="Set as Default"
                        busy={busyKey === defaultKey}
                        disabled={anyBusy}
                        onPress={() => handleAdd(pharmacy, true, defaultKey)}
                      />
                      <ActionButton
                        label="Add to Preferred"
                        tone="outline"
                        busy={busyKey === preferredKey}
                        disabled={anyBusy}
                        onPress={() => handleAdd(pharmacy, false, preferredKey)}
                      />
                    </>
                  )}
                </PharmacyCard>
              );
            })
          )}
          {searchPagination && searchPagination.TotalPages > 1 ? (
            <View style={styles.pager}>
              <ActionButton
                label="Previous"
                tone="outline"
                disabled={!searchPagination.HasPrevious}
                onPress={() => performSearch(searchPage - 1)}
              />
              <Text style={styles.pagerInfo}>
                Page {searchPage} of {searchPagination.TotalPages}
              </Text>
              <ActionButton
                label="Next"
                tone="outline"
                disabled={!searchPagination.HasNext}
                onPress={() => performSearch(searchPage + 1)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderDefault = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Default Pharmacy</Text>
      <Text style={styles.sectionHint}>
        Your default pharmacy is used automatically when a doctor sends you a prescription.
      </Text>
      {isLoadingMine ? (
        <ActivityIndicator style={styles.loader} color={adTokens.primary} />
      ) : mineError ? (
        <Text style={styles.errorText}>{mineError}</Text>
      ) : !defaultPharmacy ? (
        <EmptyBox icon="shield-check-outline" text="You don't have a default pharmacy yet." onGoSearch={goSearch} />
      ) : (
        <>
          <PharmacyCard pharmacy={defaultPharmacy} badges={[{ label: 'DEFAULT', variant: 'default' }]}>
            <ActionButton
              label="Remove Default"
              icon="close-circle-outline"
              tone="danger"
              busy={busyKey === `${getPharmacyId(defaultPharmacy)}:removeDefault`}
              onPress={() => handleRemoveDefault(defaultPharmacy)}
            />
          </PharmacyCard>
          <View style={styles.note}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={adTokens.successDark} />
            <Text style={styles.noteText}>This is your default pharmacy. Your prescriptions are sent here.</Text>
          </View>
          <Text style={styles.sectionHint}>
            Want to switch? Search for another pharmacy and set it as Default.
          </Text>
        </>
      )}
    </View>
  );

  const renderPreferred = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferred Pharmacies ({myPharmacies.length})</Text>
      <Text style={styles.sectionHint}>All pharmacies you&apos;ve saved to your list.</Text>
      {myPharmacies.length > 1 ? (
        <View style={styles.sortRow}>
          <Text style={styles.sectionHint}>Sort by</Text>
          {[
            { value: 'name-asc', label: 'Name (A - Z)' },
            { value: 'name-desc', label: 'Name (Z - A)' },
          ].map((option) => (
            <Pressable
              key={option.value}
              style={[styles.sortChip, sortOrder === option.value && styles.sortChipActive]}
              onPress={() => setSortOrder(option.value)}
            >
              <Text style={[styles.sortChipText, sortOrder === option.value && styles.sortChipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {isLoadingMine ? (
        <ActivityIndicator style={styles.loader} color={adTokens.primary} />
      ) : mineError ? (
        <Text style={styles.errorText}>{mineError}</Text>
      ) : sortedPharmacies.length === 0 ? (
        <EmptyBox icon="star-outline" text="You haven't added a pharmacy yet." onGoSearch={goSearch} />
      ) : (
        sortedPharmacies.map((pharmacy) => {
          const pharmacyId = getPharmacyId(pharmacy);
          const badges = isDefaultPharmacy(pharmacy)
            ? [
                { label: 'DEFAULT', variant: 'default' },
                { label: 'PREFERRED', variant: 'preferred' },
              ]
            : [{ label: 'PREFERRED', variant: 'preferred' }];
          return (
            <PharmacyCard key={pharmacyId} pharmacy={pharmacy} badges={badges}>
              <ActionButton
                label="Remove from Preferred"
                icon="trash-can-outline"
                tone="danger"
                busy={busyKey === `${pharmacyId}:remove`}
                onPress={() => handleRemove(pharmacy)}
              />
            </PharmacyCard>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="store-outline" size={24} color={adTokens.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>My Pharmacies</Text>
          <Text style={styles.sectionHint}>
            Manage your preferred pharmacies and choose where your prescriptions are sent.
          </Text>
        </View>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = section === item.key;
          return (
            <Pressable key={item.key} style={[styles.navItem, active && styles.navItemActive]} onPress={() => setSection(item.key)}>
              <MaterialCommunityIcons name={item.icon} size={16} color={active ? adTokens.white : adTokens.textSecondary} />
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
              {item.count !== null ? (
                <View style={[styles.navCount, active && styles.navCountActive]}>
                  <Text style={[styles.navCountText, active && styles.navCountTextActive]}>{item.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {section === SECTIONS.SEARCH ? renderSearch() : null}
      {section === SECTIONS.DEFAULT ? renderDefault() : null}
      {section === SECTIONS.PREFERRED ? renderPreferred() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },

  nav: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 14, backgroundColor: adTokens.gray100 },
  navItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 11 },
  navItemActive: { backgroundColor: adTokens.primary },
  navText: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary },
  navTextActive: { color: adTokens.white },
  navCount: { minWidth: 18, paddingHorizontal: 5, borderRadius: 999, backgroundColor: adTokens.white, alignItems: 'center' },
  navCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  navCountText: { fontSize: 11, fontWeight: '800', color: adTokens.primaryDark },
  navCountTextActive: { color: adTokens.white },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  sectionHint: { fontSize: 12.5, color: adTokens.textSecondary, lineHeight: 17 },
  errorText: { fontSize: 13, color: adTokens.danger },
  loader: { paddingVertical: 28 },
  linkText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary },

  card: { padding: 12, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: adTokens.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  badgeDefault: { backgroundColor: adTokens.successLight },
  badgePreferred: { backgroundColor: adTokens.primaryLight },
  badgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  metaText: { flex: 1, fontSize: 12.5, color: adTokens.textSecondary, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  actionDisabled: { opacity: 0.55 },
  actionText: { fontSize: 12.5, fontWeight: '700' },

  empty: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: adTokens.border },
  emptyText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: adTokens.successLight },
  noteText: { flex: 1, fontSize: 12.5, color: adTokens.successDark },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sortChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  sortChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  sortChipText: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary },
  sortChipTextActive: { color: adTokens.white },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pagerInfo: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
});
