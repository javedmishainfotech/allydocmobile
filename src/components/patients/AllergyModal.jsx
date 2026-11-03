import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  searchAllergens,
  addCodedAllergy,
  addFreeTextAllergy,
  editPatientAllergy,
  addNoKnownAllergy,
} from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { colors, adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

// AllergyReactionType / AllergyStatusType enums, per AllyDocReactApp.
const REACTION_TYPES = [
  { value: '1', label: 'Allergy' },
  { value: '2', label: 'Adverse Reaction' },
];
const STATUS_TYPES = [
  { value: '1', label: 'Active' },
  { value: '2', label: 'Inactive' },
];

function formatOnsetDate(value) {
  // Web sends onsetDate as "MM/DD/YY"; accepts a YYYY-MM-DD input here and reformats.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value || '';
  const [, year, month, day] = match;
  return `${month}/${day}/${year.slice(2)}`;
}

/** YYYY-MM-DD -> a readable "Jan 15, 2026" for the date field's display text. */
function displayOnsetDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Port of AllyDocReactApp's Add/Edit Allergy modal in AllergiesTab.jsx -
 * search allergens (>=3 chars, explicit Search button, not type-ahead) ->
 * coded path, or "Add as Custom Allergy" -> freetext path. Also supports
 * "No Known Allergy" as a checkbox that replaces the form with a confirm
 * panel, matching web. */
export default function AllergyModal({ visible, doseSpotPatientId, editing, onClose, onSaved }) {
  const bottomSafe = useBottomSafeSpacing();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAllergen, setSelectedAllergen] = useState(null); // { name, allergenId? }
  const [noKnownAllergy, setNoKnownAllergy] = useState(false);
  const [reaction, setReaction] = useState('');
  const [reactionType, setReactionType] = useState('1');
  const [statusType, setStatusType] = useState('1');
  const [onsetDate, setOnsetDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearchText('');
    setSearchResults([]);
    setHasSearched(false);
    setNoKnownAllergy(false);
    setShowDatePicker(false);
    if (editing) {
      setSelectedAllergen({ name: editing.DisplayName, allergenId: editing.AllergenId });
      setReaction(editing.Reaction || '');
      setReactionType(editing.ReactionType === 'AdverseReaction' ? '2' : '1');
      setStatusType(editing.StatusType === 'Inactive' ? '2' : '1');
      setOnsetDate(editing.OnsetDate || '');
    } else {
      setSelectedAllergen(null);
      setReaction('');
      setReactionType('1');
      setStatusType('1');
      setOnsetDate('');
    }
  }, [visible, editing]);

  const handleSearch = async () => {
    if (searchText.trim().length < 3) {
      toast.error('Enter at least 3 characters to search.');
      return;
    }
    setIsSearching(true);
    const response = await searchAllergens(searchText.trim());
    setIsSearching(false);
    setHasSearched(true);
    const items = response.data?.Items;
    setSearchResults(response.success && Array.isArray(items) ? items : []);
  };

  const handleSave = async () => {
    if (noKnownAllergy) {
      setIsSaving(true);
      const response = await addNoKnownAllergy(doseSpotPatientId);
      setIsSaving(false);
      if (response.success) {
        toast.success(response.message || 'Saved.');
        onSaved?.();
      } else {
        toast.error(response.message || 'Unable to save.');
      }
      return;
    }

    if (!selectedAllergen) {
      toast.error('Select or enter an allergen first.');
      return;
    }
    if (!reaction.trim()) {
      toast.error('Reaction is required.');
      return;
    }

    setIsSaving(true);
    const formattedOnset = formatOnsetDate(onsetDate);
    let response;
    if (editing) {
      response = await editPatientAllergy(doseSpotPatientId, editing.PatientAllergyId, {
        reaction: reaction.trim(),
        reactionType,
        statusType,
        onsetDate: formattedOnset,
      });
    } else if (selectedAllergen.allergenId) {
      response = await addCodedAllergy(doseSpotPatientId, {
        allergenId: selectedAllergen.allergenId,
        reaction: reaction.trim(),
        reactionType,
        statusType,
        onsetDate: formattedOnset,
      });
    } else {
      response = await addFreeTextAllergy(doseSpotPatientId, {
        freeTextDisplayName: selectedAllergen.name,
        reaction: reaction.trim(),
        reactionType,
        statusType,
        onsetDate: formattedOnset,
      });
    }
    setIsSaving(false);
    if (response.success) {
      toast.success(response.message || 'Allergy saved.');
      onSaved?.();
    } else {
      toast.error(response.message || 'Unable to save allergy.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
          <Text style={styles.title}>{editing ? 'Edit' : 'Add'} Allergy</Text>
          <ScrollView contentContainerStyle={styles.body}>
            {!editing ? (
              <Pressable style={styles.checkboxRow} onPress={() => setNoKnownAllergy((v) => !v)}>
                <View style={[styles.checkbox, noKnownAllergy && styles.checkboxChecked]} />
                <Text style={styles.checkboxLabel}>Patient has no known allergies</Text>
              </Pressable>
            ) : null}

            {noKnownAllergy ? (
              <Text style={styles.mutedText}>
                Saving will record that this patient has no known drug allergies.
              </Text>
            ) : !selectedAllergen ? (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search allergen (min 3 characters)"
                    placeholderTextColor={adTokens.textMuted}
                  />
                  <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
                    {isSearching ? <ActivityIndicator size={14} color={colors.white} /> : <Text style={styles.searchButtonText}>Search</Text>}
                  </Pressable>
                </View>
                {hasSearched && searchResults.length === 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.mutedText}>No matches found.</Text>
                    <Pressable
                      style={styles.customButton}
                      onPress={() => setSelectedAllergen({ name: searchText.trim(), allergenId: null })}
                    >
                      <Text style={styles.customButtonText}>Add as Custom Allergy</Text>
                    </Pressable>
                  </View>
                ) : null}
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, index) => String(item.AllergenId ?? index)}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.resultRow}
                      onPress={() => setSelectedAllergen({ name: item.Name, allergenId: item.AllergenId })}
                    >
                      <Text style={styles.resultText}>{item.Name}</Text>
                    </Pressable>
                  )}
                />
              </>
            ) : (
              <>
                <View style={styles.selectedRow}>
                  <Text style={styles.selectedText}>{selectedAllergen.name}</Text>
                  {!editing ? (
                    <Pressable onPress={() => setSelectedAllergen(null)}>
                      <Text style={styles.changeLink}>Change</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>Reaction</Text>
                <TextInput style={styles.input} value={reaction} onChangeText={setReaction} placeholderTextColor={adTokens.textMuted} />

                <Text style={styles.fieldLabel}>Reaction Type</Text>
                <View style={styles.chipRow}>
                  {REACTION_TYPES.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.chip, reactionType === opt.value && styles.chipActive]}
                      onPress={() => setReactionType(opt.value)}
                    >
                      <Text style={[styles.chipText, reactionType === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.chipRow}>
                  {STATUS_TYPES.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.chip, statusType === opt.value && styles.chipActive]}
                      onPress={() => setStatusType(opt.value)}
                    >
                      <Text style={[styles.chipText, statusType === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Onset Date</Text>
                <Pressable style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                  <MaterialCommunityIcons name="calendar-outline" size={16} color={adTokens.textMuted} />
                  <Text style={[styles.dateFieldText, !onsetDate && styles.dateFieldPlaceholder]}>
                    {onsetDate ? displayOnsetDate(onsetDate) : 'Select date'}
                  </Text>
                  {onsetDate ? (
                    <Pressable hitSlop={8} onPress={() => setOnsetDate('')}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={adTokens.textMuted} />
                    </Pressable>
                  ) : null}
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={onsetDate ? new Date(`${onsetDate}T00:00:00`) : new Date()}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (event.type !== 'dismissed' && date) setOnsetDate(toIsoDate(date));
                    }}
                  />
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose} disabled={isSaving}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            {noKnownAllergy || selectedAllergen ? (
              <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size={14} color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>{noKnownAllergy ? 'Save No Known Allergies' : 'Save'}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '88%', padding: 18 },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  body: { paddingBottom: 10 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: adTokens.border },
  checkboxChecked: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },
  mutedText: { fontSize: 12.5, color: adTokens.textSecondary },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },
  searchButton: { backgroundColor: adTokens.primary, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: colors.white, fontWeight: '700', fontSize: 12.5 },
  noResults: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  customButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: adTokens.primaryTint },
  customButtonText: { fontSize: 12, fontWeight: '700', color: adTokens.primaryDark },
  resultRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: adTokens.gray100 },
  resultText: { fontSize: 13, color: adTokens.textPrimary },

  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: adTokens.primaryTint, borderRadius: 10, padding: 10, marginBottom: 14 },
  selectedText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: adTokens.primaryDark },
  changeLink: { fontSize: 12, fontWeight: '600', color: adTokens.primaryDark },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary, marginBottom: 8 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dateFieldText: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },
  dateFieldPlaceholder: { color: adTokens.textMuted },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  footer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  closeButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeButtonText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.white },
});
