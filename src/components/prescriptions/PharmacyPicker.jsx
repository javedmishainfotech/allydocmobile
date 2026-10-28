import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getPatientPharmacies } from '../../services/patientsService';
import { searchPharmaciesAdvanced, addPatientPharmacy, deletePatientPharmacy } from '../../services/prescriptionService';
import { getStates, getCitiesByStateId } from '../../services/identityProofingService';
import { openExternalLink } from '../../utils/openExternalLink';
import { toast } from '../../utils/toast';
import OptionPicker from './OptionPicker';
import { adTokens, colors } from '../../theme/colors';

export const getPharmacyId = (pharmacy) => pharmacy?.PharmacyId ?? pharmacy?.pharmacyId;
export const getPharmacyName = (pharmacy) => pharmacy?.StoreName || pharmacy?.storeName || pharmacy?.Name || 'Pharmacy';
export const isDefaultPharmacy = (pharmacy) => pharmacy?.IsDefault === true || pharmacy?.isDefault === true;

const getStateCode = (state) => state?.stateCode ?? state?.StateCode ?? state?.code ?? '';
const getStateName = (state) => state?.stateName ?? state?.StateName ?? state?.name ?? '';
const getCityName = (city) => city?.cityName ?? city?.CityName ?? city?.name ?? '';

// Web SelectPharmacy specialty filter (DoseSpot pharmacy specialty flags).
const SPECIALTIES = [
  { label: 'EPCS', value: '2048' },
  { label: 'Twenty Four Hour Pharmacy', value: '64' },
  { label: 'Long Term Care', value: '32' },
  { label: 'Specialty', value: '16' },
  { label: 'Retail', value: '8' },
  { label: 'Mail Order', value: '1' },
];
const specialtyLabel = (value) => SPECIALTIES.find((s) => s.value === value)?.label || '';
const specialtyValue = (label) => SPECIALTIES.find((s) => s.label === label)?.value || '';

const EMPTY_SEARCH = { Name: '', City: '', State: '', Zip: '', Address: '', PhoneOrFax: '', Specialty0: '', Specialty1: '' };
const TEXT_FIELDS = ['Name', 'City', 'Address', 'Zip', 'PhoneOrFax'];

const specialtiesText = (pharmacy) => {
  const raw = pharmacy?.PharmacySpecialties ?? pharmacy?.Specialties ?? pharmacy?.pharmacySpecialties;
  if (Array.isArray(raw)) return raw.filter(Boolean).join(', ');
  return raw ? String(raw) : '';
};

function PharmacyCard({ pharmacy, selected, isDefault, isPreferred, dark, onPress, children }) {
  const address = [pharmacy?.Address1, pharmacy?.Address2, pharmacy?.City, pharmacy?.State, pharmacy?.ZipCode].filter(Boolean).join(', ');
  const specialties = specialtiesText(pharmacy);
  const mapQuery = [getPharmacyName(pharmacy), pharmacy?.Address1, pharmacy?.City, pharmacy?.State, pharmacy?.ZipCode].filter(Boolean).join(', ');

  const content = (
    <>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, dark && styles.cardIconDark]}>
          <MaterialCommunityIcons name="store-outline" size={20} color={dark ? adTokens.white : adTokens.primaryDark} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.cardName, dark && styles.cardNameDark]}>{getPharmacyName(pharmacy)}</Text>
          <View style={styles.badgeRow}>
            {isPreferred ? (
              <View style={[styles.badge, dark ? styles.badgePreferredDark : styles.badgePreferred]}>
                <Text style={[styles.badgeText, { color: dark ? adTokens.white : adTokens.successDark }]}>Preferred</Text>
              </View>
            ) : null}
            {isDefault ? (
              <View style={[styles.badge, dark ? styles.badgeDefaultDark : styles.badgeDefault]}>
                <Text style={[styles.badgeText, { color: dark ? adTokens.white : adTokens.primaryDark }]}>Current Default Pharmacy</Text>
              </View>
            ) : null}
          </View>
        </View>
        {selected ? <Feather name="check-circle" size={22} color={dark ? adTokens.white : adTokens.primaryDark} /> : null}
      </View>
      {address ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={15} color={dark ? 'rgba(255,255,255,0.75)' : adTokens.textSecondary} />
          <Text style={[styles.metaText, dark && styles.metaTextDark]}>{address}</Text>
        </View>
      ) : null}
      {pharmacy?.PrimaryPhone ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="phone-outline" size={15} color={dark ? 'rgba(255,255,255,0.75)' : adTokens.textSecondary} />
          <Text style={[styles.metaText, dark && styles.metaTextDark]}>{pharmacy.PrimaryPhone}</Text>
        </View>
      ) : null}
      {pharmacy?.PrimaryFax ? (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="fax" size={15} color={dark ? 'rgba(255,255,255,0.75)' : adTokens.textSecondary} />
          <Text style={[styles.metaText, dark && styles.metaTextDark]}>{pharmacy.PrimaryFax}</Text>
        </View>
      ) : null}
      {specialties ? (
        <View style={[styles.specialtyPill, dark && styles.specialtyPillDark]}>
          <Text style={[styles.specialtyText, dark && styles.specialtyTextDark]}>Specialties: {specialties}</Text>
        </View>
      ) : null}
      <View style={styles.cardActions}>
        {mapQuery ? (
          <Pressable onPress={() => openExternalLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`)} hitSlop={6}>
            <Text style={[styles.linkPrimary, dark && styles.linkPrimaryDark]}>View map</Text>
          </Pressable>
        ) : null}
        {children}
      </View>
    </>
  );

  if (dark) {
    return (
      <Pressable style={[styles.card, styles.cardDarkWrap, selected && styles.cardSelected]} onPress={onPress}>
        <LinearGradient colors={['#0B1E4D', '#1E3A8A', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <BlurView intensity={12} tint="light" style={[StyleSheet.absoluteFill, styles.cardDarkGlass]} />
        <View style={styles.cardDarkContent}>{content}</View>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.card, isDefault && styles.cardDefault, selected && styles.cardSelected]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

/**
 * Port of web's SelectPharmacy (`mode="select"` in the prescribe flow, `mode="manage"` on Manage Pharmacies):
 * a collapsible "Search Pharmacy" card (collapsed by default, re-collapses after a search with results) with
 * name / state / city / address / zip / phone-or-fax / two specialty filters (3+ characters per text field), then
 * the patient's pharmacies (default first) or the search results. Tapping a card selects it (again deselects).
 * Manage mode adds "Add as Preferred" / "Remove as Preferred" (with a confirmation) on non-default cards.
 */
export default function PharmacyPicker({ doseSpotPatientId, mode = 'select', selectedPharmacy, onSelect, onLoaded, reloadKey = 0 }) {
  const [patientPharmacies, setPatientPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const loadPatientPharmacies = useCallback(async () => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    const result = await getPatientPharmacies(doseSpotPatientId);
    const items = Array.isArray(result.data?.Items) ? result.data.Items : Array.isArray(result.data) ? result.data : [];
    setPatientPharmacies(items);
    setIsLoading(false);
    onLoaded?.(items);
  }, [doseSpotPatientId, onLoaded]);

  useEffect(() => {
    loadPatientPharmacies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doseSpotPatientId, reloadKey]);

  useEffect(() => {
    setStatesLoading(true);
    getStates().then((result) => {
      setStates(result.success && Array.isArray(result.data) ? result.data : []);
      setStatesLoading(false);
    });
  }, []);

  const pickState = async (label) => {
    const state = states.find((s) => stateOptionLabel(s) === label);
    const code = getStateCode(state);
    setSearch((prev) => ({ ...prev, State: code, City: '' }));
    setCities([]);
    if (!state?.stateId) return;
    setCitiesLoading(true);
    const result = await getCitiesByStateId(state.stateId);
    setCities(result.success && Array.isArray(result.data) ? result.data : []);
    setCitiesLoading(false);
  };

  const stateOptionLabel = (state) => {
    const name = getStateName(state);
    const code = getStateCode(state);
    return name && name !== code ? `${name} (${code})` : code;
  };
  const selectedStateLabel = search.State ? stateOptionLabel(states.find((s) => getStateCode(s) === search.State) || { stateCode: search.State }) : '';

  const shortField = TEXT_FIELDS.find((key) => search[key].trim() && search[key].trim().length < 3);
  const hasCriteria = Object.values(search).some((value) => String(value).trim());

  const runSearch = async (nextPage) => {
    if (!hasCriteria) {
      toast.info('Please provide at least one search value.');
      return;
    }
    if (shortField) return;
    setIsSearching(true);
    setHasSearched(true);
    const trimmed = Object.fromEntries(Object.entries(search).map(([key, value]) => [key, String(value).trim()]));
    const result = await searchPharmaciesAdvanced({ ...trimmed, PageNumber: nextPage });
    if (result.success) {
      const items = Array.isArray(result.data?.Items) ? result.data.Items : [];
      setResults(items);
      setPagination(result.data?.PageResult || null);
      setPage(nextPage);
      if (items.length > 0) setSearchOpen(false);
    } else {
      toast.error(result.message || 'Failed to search pharmacies');
    }
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearch(EMPTY_SEARCH);
    setCities([]);
    setResults([]);
    setPagination(null);
    setHasSearched(false);
    setPage(1);
  };

  const savedFor = (pharmacy) => patientPharmacies.find((p) => String(getPharmacyId(p)) === String(getPharmacyId(pharmacy)));

  const addPreferred = async (pharmacy) => {
    const id = getPharmacyId(pharmacy);
    setBusyId(id);
    const result = await addPatientPharmacy(doseSpotPatientId, id, false);
    setBusyId(null);
    if (result.success) {
      toast.success(result.message || 'Pharmacy added successfully');
      loadPatientPharmacies();
    } else {
      toast.error(result.message || 'Failed to add pharmacy');
    }
  };

  const confirmRemove = async () => {
    const id = getPharmacyId(removeTarget);
    setBusyId(id);
    const result = await deletePatientPharmacy(doseSpotPatientId, id);
    setBusyId(null);
    setRemoveTarget(null);
    if (result.success) {
      toast.success(result.message || 'Pharmacy removed successfully');
      loadPatientPharmacies();
    } else {
      toast.error(result.message || 'Failed to remove pharmacy');
    }
  };

  const isSelected = (pharmacy) => selectedPharmacy && String(getPharmacyId(selectedPharmacy)) === String(getPharmacyId(pharmacy));
  const toggleSelect = (pharmacy) => onSelect?.(isSelected(pharmacy) ? null : pharmacy);

  const sortedPatientPharmacies = [...patientPharmacies].sort((a, b) => Number(isDefaultPharmacy(b)) - Number(isDefaultPharmacy(a)));
  const showingResults = hasSearched;
  const list = showingResults ? results : sortedPatientPharmacies;

  const renderCard = (pharmacy) => {
    const saved = savedFor(pharmacy);
    const isDefault = Boolean(saved && isDefaultPharmacy(saved)) || (!showingResults && isDefaultPharmacy(pharmacy));
    const isPreferred = Boolean(saved);
    const id = getPharmacyId(pharmacy);
    return (
      <PharmacyCard
        key={String(id)}
        pharmacy={pharmacy}
        selected={isSelected(pharmacy)}
        isDefault={isDefault}
        isPreferred={isPreferred}
        dark={mode === 'manage' && isDefault}
        onPress={() => toggleSelect(pharmacy)}
      >
        {mode === 'manage' && !isDefault ? (
          isPreferred ? (
            <Pressable style={styles.linkButton} onPress={() => setRemoveTarget(pharmacy)} disabled={busyId === id} hitSlop={6}>
              <Text style={styles.linkDanger}>Remove as Preferred</Text>
              {busyId === id ? <ActivityIndicator size="small" color={adTokens.danger} style={styles.buttonSpinner} /> : null}
            </Pressable>
          ) : (
            <Pressable style={styles.linkButton} onPress={() => addPreferred(pharmacy)} disabled={busyId === id} hitSlop={6}>
              <Text style={styles.linkSuccess}>Add as Preferred</Text>
              {busyId === id ? <ActivityIndicator size="small" color={adTokens.successDark} style={styles.buttonSpinner} /> : null}
            </Pressable>
          )
        ) : null}
      </PharmacyCard>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.searchCard}>
        <Pressable style={styles.collapseHeader} onPress={() => setSearchOpen((open) => !open)}>
          <MaterialCommunityIcons name="magnify" size={18} color={adTokens.primaryDark} />
          <Text style={styles.collapseTitle}>Search Pharmacy</Text>
          <Feather name={searchOpen ? 'chevron-up' : 'chevron-down'} size={18} color={adTokens.textSecondary} />
        </Pressable>
        {searchOpen ? (
          <View style={styles.form}>
            <Field label="Pharmacy name" value={search.Name} onChange={(t) => setSearch((p) => ({ ...p, Name: t }))} onSubmit={() => runSearch(1)} />
            <OptionPicker
              label="State"
              value={selectedStateLabel}
              placeholder={statesLoading ? 'Loading states...' : 'Select state'}
              options={states.map(stateOptionLabel)}
              onChange={(label) => (label ? pickState(label) : setSearch((p) => ({ ...p, State: '', City: '' })))}
            />
            <OptionPicker
              label="City"
              value={search.City}
              placeholder={citiesLoading ? 'Loading cities...' : search.State ? 'Select city' : 'Select a state first'}
              options={cities.map(getCityName).filter(Boolean)}
              onChange={(city) => setSearch((p) => ({ ...p, City: city }))}
            />
            <Field label="Address" value={search.Address} onChange={(t) => setSearch((p) => ({ ...p, Address: t }))} onSubmit={() => runSearch(1)} />
            <View style={styles.row2}>
              <View style={styles.flex1}>
                <Field label="Zip" value={search.Zip} onChange={(t) => setSearch((p) => ({ ...p, Zip: t }))} keyboardType="number-pad" onSubmit={() => runSearch(1)} />
              </View>
              <View style={styles.flex1}>
                <Field label="Phone or fax" value={search.PhoneOrFax} onChange={(t) => setSearch((p) => ({ ...p, PhoneOrFax: t }))} keyboardType="phone-pad" onSubmit={() => runSearch(1)} />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.flex1}>
                <OptionPicker
                  label="Specialty"
                  value={specialtyLabel(search.Specialty0)}
                  placeholder="Any"
                  options={SPECIALTIES.filter((s) => s.value !== search.Specialty1).map((s) => s.label)}
                  onChange={(label) => setSearch((p) => ({ ...p, Specialty0: specialtyValue(label) }))}
                />
              </View>
              <View style={styles.flex1}>
                <OptionPicker
                  label="Specialty 2"
                  value={specialtyLabel(search.Specialty1)}
                  placeholder="Any"
                  options={SPECIALTIES.filter((s) => s.value !== search.Specialty0).map((s) => s.label)}
                  onChange={(label) => setSearch((p) => ({ ...p, Specialty1: specialtyValue(label) }))}
                />
              </View>
            </View>
            {shortField ? <Text style={styles.validation}>Type 3 or more characters to search</Text> : null}
            <View style={styles.row2}>
              <Pressable style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
              <Pressable style={[styles.searchButton, (isSearching || Boolean(shortField)) && styles.disabled]} onPress={() => runSearch(1)} disabled={isSearching || Boolean(shortField)}>
                <Text style={styles.searchButtonText}>Search</Text>
                {isSearching ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {showingResults ? `Search Results ${pagination?.TotalCount ?? results.length}` : 'Patient Pharmacies'}
        </Text>
        {showingResults ? (
          <Pressable onPress={clearSearch} hitSlop={6}>
            <Text style={styles.linkPrimary}>Show patient pharmacies</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading && !showingResults ? (
        <ActivityIndicator color={adTokens.primary} style={styles.loader} />
      ) : isSearching ? (
        <ActivityIndicator color={adTokens.primary} style={styles.loader} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="store-search-outline" size={28} color={adTokens.textSecondary} />
          <Text style={styles.emptyText}>
            {showingResults
              ? 'No pharmacies found matching your search criteria. Try adjusting your search filters.'
              : 'Use the search form above to find pharmacies'}
          </Text>
        </View>
      ) : (
        list.map(renderCard)
      )}

      {showingResults && pagination && pagination.TotalPages > 1 ? (
        <View style={styles.pager}>
          <Pressable style={[styles.pageButton, !pagination.HasPrevious && styles.disabled]} disabled={!pagination.HasPrevious} onPress={() => runSearch(page - 1)}>
            <Text style={styles.pageButtonText}>Previous</Text>
          </Pressable>
          <Text style={styles.pageInfo}>
            Page {page} of {pagination.TotalPages}
          </Text>
          <Pressable style={[styles.pageButton, !pagination.HasNext && styles.disabled]} disabled={!pagination.HasNext} onPress={() => runSearch(page + 1)}>
            <Text style={styles.pageButtonText}>Next</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={Boolean(removeTarget)} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remove Preferred Pharmacy</Text>
            <Text style={styles.dialogBody}>Are you sure you want to remove this pharmacy from your preferred list?</Text>
            <View style={styles.dialogInfo}>
              <Text style={styles.dialogInfoText}>Name: {getPharmacyName(removeTarget)}</Text>
              <Text style={styles.dialogInfoText}>
                Address: {[removeTarget?.Address1, removeTarget?.City, removeTarget?.State, removeTarget?.ZipCode].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
            <View style={styles.dialogButtons}>
              <Pressable style={[styles.dangerButtonFull, busyId && styles.disabled]} disabled={Boolean(busyId)} onPress={confirmRemove}>
                <Text style={styles.dangerButtonFullText} numberOfLines={1}>
                  Remove Pharmacy
                </Text>
                {busyId ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
              </Pressable>
              <Pressable style={styles.clearButtonFull} disabled={Boolean(busyId)} onPress={() => setRemoveTarget(null)}>
                <Text style={styles.clearButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, onSubmit, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={adTokens.textMuted}
        keyboardType={keyboardType}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  flex1: { flex: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  loader: { paddingVertical: 16 },

  searchCard: { borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, overflow: 'hidden', ...adTokens.cardShadow },
  collapseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  collapseTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: adTokens.primaryDark },
  form: { gap: 10, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: adTokens.border, paddingTop: 12 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: adTokens.textPrimary, backgroundColor: adTokens.white },
  validation: { fontSize: 12.5, color: adTokens.danger },
  searchButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary },
  buttonSpinner: { marginLeft: 8 },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  clearButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  clearButtonText: { color: adTokens.textPrimary, fontWeight: '700', fontSize: 14 },
  dangerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.danger },
  dialogButtons: { gap: 10 },
  dangerButtonFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: adTokens.danger,
  },
  dangerButtonFullText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  clearButtonFull: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  listTitle: { fontSize: 15, fontWeight: '800', color: adTokens.textPrimary },

  card: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },
  cardDefault: { backgroundColor: '#E8F4FF' },
  cardSelected: { borderColor: adTokens.primary, borderWidth: 2, backgroundColor: adTokens.primaryLight },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: adTokens.white, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center', justifyContent: 'center' },
  cardIconDark: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' },
  cardName: { fontSize: 14.5, fontWeight: '800', color: adTokens.textPrimary },
  cardNameDark: { color: adTokens.white },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  badgePreferred: { backgroundColor: adTokens.successLight },
  badgePreferredDark: { backgroundColor: 'rgba(16,185,129,0.35)' },
  badgeDefault: { backgroundColor: '#DBEAFE' },
  badgeDefaultDark: { backgroundColor: 'rgba(37,99,235,0.45)' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  metaText: { flex: 1, fontSize: 13, color: adTokens.textSecondary, lineHeight: 18 },
  metaTextDark: { color: 'rgba(255,255,255,0.92)' },
  specialtyPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: adTokens.gray100 },
  specialtyPillDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  specialtyText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textPrimary },
  specialtyTextDark: { color: adTokens.white },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 2 },
  linkPrimary: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  linkPrimaryDark: { color: adTokens.white, textDecorationLine: 'underline' },
  linkButton: { flexDirection: 'row', alignItems: 'center' },
  linkSuccess: { fontSize: 13, fontWeight: '700', color: adTokens.successDark },
  linkDanger: { fontSize: 13, fontWeight: '700', color: adTokens.danger },

  // Manage Pharmacy's "Default Pharmacy" card: a darker, polished panel (blur + dark tint) so it reads
  // as the one card that matters most, per the design pass requested on top of the plain light card above.
  cardDarkWrap: { padding: 0, overflow: 'hidden', borderWidth: 0, borderColor: 'transparent' },
  cardDarkGlass: { opacity: 0.5 },
  cardDarkContent: { padding: 14, gap: 8 },

  empty: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: adTokens.border },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: adTokens.primary },
  pageButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  pageInfo: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  disabled: { opacity: 0.5 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, gap: 12, padding: 18, borderRadius: 14, backgroundColor: adTokens.white },
  dialogTitle: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  dialogBody: { fontSize: 13.5, color: adTokens.textSecondary, lineHeight: 19 },
  dialogInfo: { gap: 3, padding: 10, borderRadius: 10, backgroundColor: adTokens.gray100 },
  dialogInfoText: { fontSize: 13, color: adTokens.textPrimary },
});
