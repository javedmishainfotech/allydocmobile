import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { getPatientEligibilities, getPharmacyById } from '../../services/doseSpotClinicalService';
import { getPrescriptionBenefits } from '../../services/prescriptionService';
import OptionPicker from './OptionPicker';
import ReplaceMedicationConfirmationModal from './ReplaceMedicationConfirmationModal';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const POLL_INTERVAL_MS = 3000;
const MAX_RETRIES = 10;

const MED_FILTER_OPTIONS = [
  { key: 'pricing', label: 'Pricing Alternatives' },
  { key: 'brand', label: 'Brand Name Alternatives' },
  { key: 'generic', label: 'Generic Alternatives' },
];
const PHARMACY_FILTER_OPTIONS = [
  { key: 'mail', label: 'Mail-in' },
  { key: 'retail', label: 'Retail' },
];

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function toggleInSet(set, key) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/**
 * Port of AllyDocReactApp's PrescriptionBenefitsModal.jsx: live DoseSpot real-time formulary/
 * benefits check for a coded prescription, with alternative-medication comparison and a
 * "Replace Medication" action. See `getPrescriptionBenefits` for the endpoint/polling contract.
 * The current-medication side intentionally always shows "Not covered" - that's web's own
 * dead/commented-out pricing display for the current side, ported as-is for parity.
 */
export default function PrescriptionBenefitsModal({ visible, patientId, ndc, currentPrescription, onClose, onReplace }) {
  const [eligibilities, setEligibilities] = useState([]);
  const [selectedEligibilityId, setSelectedEligibilityId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollMessage, setPollMessage] = useState('');
  const [benefitsItem, setBenefitsItem] = useState(null);
  const [currentPharmacy, setCurrentPharmacy] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [medFilters, setMedFilters] = useState(new Set());
  const [pharmacyFilters, setPharmacyFilters] = useState(new Set());
  const [selectedRow, setSelectedRow] = useState(null);
  const [showFullCoverage, setShowFullCoverage] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const retryCountRef = useRef(0);
  const pollTimeoutRef = useRef(null);

  const pharmacyId = currentPrescription ? (currentPrescription.PharmacyId ?? currentPrescription.pharmacyId) : null;
  const quantity = currentPrescription ? String(currentPrescription.Quantity ?? currentPrescription.quantity ?? '30') : '30';
  const daysSupply = currentPrescription ? currentPrescription.DaysSupply ?? currentPrescription.daysSupply ?? 30 : 30;
  const dispenseUnitTypeId = currentPrescription
    ? currentPrescription.DispenseUnitTypeId ?? currentPrescription.DispenseUnitId ?? 1
    : 1;

  const fetchBenefits = async (eligibilityId) => {
    const res = await getPrescriptionBenefits({ patientId, patientEligibilityId: eligibilityId, ndc, pharmacyId, quantity, daysSupply, dispenseUnitTypeId });
    const item = res.success ? res.data?.Item : null;
    const status = item?.RealTimeFormularyRequestStatus;
    if (status === 1 || status === 2) {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        setPollMessage('Fetching real-time prescription benefit information...');
        pollTimeoutRef.current = setTimeout(() => fetchBenefits(eligibilityId), POLL_INTERVAL_MS);
      } else {
        setPollMessage('Unable to fetch prescription benefits at the moment. Please try again later.');
        setLoading(false);
      }
      return;
    }
    setPollMessage('');
    setLoading(false);
    setBenefitsItem(item || null);
  };

  useEffect(() => {
    if (!visible || !patientId) return;
    setEligibilities([]);
    setSelectedEligibilityId(null);
    setBenefitsItem(null);
    setCurrentPharmacy(null);
    setSearchQuery('');
    setMedFilters(new Set());
    setPharmacyFilters(new Set());
    setSelectedRow(null);
    setShowFullCoverage(false);
    retryCountRef.current = 0;

    (async () => {
      const res = await getPatientEligibilities(patientId);
      const items = res.success ? res.data?.Items || [] : [];
      if (items.length === 0) {
        toast.error('No eligibilities found');
        onClose();
        return;
      }
      setEligibilities(items);
      const firstId = items[0].PatientEligibilityId;
      setSelectedEligibilityId(firstId);
      setLoading(true);
      fetchBenefits(firstId);
      if (pharmacyId) {
        getPharmacyById(pharmacyId).then((pharmacyRes) => {
          setCurrentPharmacy(pharmacyRes.success ? pharmacyRes.data?.Item || pharmacyRes.data : null);
        });
      }
    })();

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, patientId]);

  const handleEligibilityChange = (eligibilityId) => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    retryCountRef.current = 0;
    setSelectedEligibilityId(eligibilityId);
    setBenefitsItem(null);
    setSelectedRow(null);
    setLoading(true);
    fetchBenefits(eligibilityId);
  };

  const currentName = currentPrescription?.DisplayName || currentPrescription?.displayName || 'Current medication';
  const currentStrength = currentPrescription?.Strength || currentPrescription?.strength || '';

  const allOptions = useMemo(() => {
    if (!benefitsItem) return [];
    const rows = [];
    (benefitsItem.PatientSpecificPricingCoverages || []).forEach((pricingSet, i) => {
      rows.push({
        key: `current-${i}`,
        isCurrent: true,
        isBrand: null,
        displayName: currentName,
        strength: currentStrength,
        dispensableDrugId: currentPrescription?.DispensableDrugId ?? currentPrescription?.dispensableDrugId,
        pricingSet,
      });
    });
    (benefitsItem.Alternatives || []).forEach((alt, altIndex) => {
      (alt.PatientSpecificPricingCoverages || []).forEach((pricingSet, i) => {
        rows.push({
          key: `alt-${altIndex}-${i}`,
          isCurrent: false,
          isBrand: Boolean(alt.Brand),
          displayName: alt.DisplayName,
          strength: alt.Strength || '',
          dispensableDrugId: alt.DispensableDrugId,
          pricingSet,
        });
      });
    });
    return rows;
  }, [benefitsItem, currentName, currentStrength, currentPrescription]);

  const hasAnyGeneric = allOptions.some((r) => r.isBrand === false);

  const filteredOptions = useMemo(() => {
    let rows = allOptions;
    if (medFilters.size > 0) {
      if (medFilters.has('generic') && medFilters.size === 1 && !hasAnyGeneric) {
        rows = [];
      } else {
        rows = rows.filter((r) => {
          if (medFilters.has('pricing') && r.isCurrent) return true;
          if (medFilters.has('brand') && (r.isCurrent || r.isBrand === true)) return true;
          if (medFilters.has('generic') && (r.isCurrent || r.isBrand === false)) return true;
          return false;
        });
      }
    }
    if (pharmacyFilters.size > 0) {
      rows = rows.filter((r) => {
        const type = r.pricingSet?.Pharmacy?.PharmacyType;
        if (pharmacyFilters.has('mail') && type === 'Mail') return true;
        if (pharmacyFilters.has('retail') && (type === 'Retail' || type === 'Independent')) return true;
        return false;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const pharmacy = r.pricingSet?.Pharmacy;
        return (
          r.displayName?.toLowerCase().includes(q) ||
          pharmacy?.StoreName?.toLowerCase().includes(q) ||
          pharmacy?.City?.toLowerCase().includes(q) ||
          pharmacy?.ZipCode?.toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [allOptions, medFilters, pharmacyFilters, searchQuery, hasAnyGeneric]);

  const handleConfirmReplace = () => {
    setReplaceConfirmOpen(false);
    onReplace(selectedRow);
  };

  const eligibilityOptions = eligibilities.map((e) => e.PlanName || e.PayerName || `Plan ${e.PatientEligibilityId}`);
  const selectedEligibilityLabel = eligibilityOptions[eligibilities.findIndex((e) => e.PatientEligibilityId === selectedEligibilityId)] || '';

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Prescription Benefits</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {eligibilities.length > 1 ? (
              <OptionPicker
                label="Coverage"
                value={selectedEligibilityLabel}
                options={eligibilityOptions}
                onChange={(label) => {
                  const idx = eligibilityOptions.indexOf(label);
                  if (idx >= 0) handleEligibilityChange(eligibilities[idx].PatientEligibilityId);
                }}
              />
            ) : null}

            <View style={styles.compareRow}>
              <View style={styles.compareCard}>
                <Text style={styles.compareCardLabel}>Current Medication</Text>
                <Text style={styles.compareCardName}>{currentName}</Text>
                {currentStrength ? <Text style={styles.compareCardMeta}>{currentStrength}</Text> : null}
                <Text style={styles.compareCardPay}>Estimated Patient Pay: Not covered</Text>
                {currentPharmacy ? (
                  <View style={styles.pharmacyBlock}>
                    <Text style={styles.pharmacyName}>{currentPharmacy.StoreName}</Text>
                    <Text style={styles.pharmacyMeta}>{currentPharmacy.PharmacyType || currentPharmacy.PharmacySpecialties || ''}</Text>
                    <Text style={styles.pharmacyMeta}>
                      {[currentPharmacy.Address1, currentPharmacy.City, currentPharmacy.State, currentPharmacy.ZipCode].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.compareCard}>
                <Text style={styles.compareCardLabel}>Selected Alternative</Text>
                {!selectedRow ? (
                  <Text style={styles.promptText}>Select an option below to compare.</Text>
                ) : (
                  <>
                    <Text style={styles.compareCardName}>{selectedRow.displayName}</Text>
                    {selectedRow.strength ? <Text style={styles.compareCardMeta}>{selectedRow.strength}</Text> : null}
                    <Text style={styles.compareCardMeta}>{selectedRow.pricingSet?.PricingCoverage?.DaysSupplyPriced} Day Supply</Text>
                    <Text style={styles.compareCardPay}>
                      Estimated Patient Pay: ${selectedRow.pricingSet?.PricingCoverage?.EstimatedPatientPayAmount ?? '-'}
                    </Text>
                    <Text style={styles.compareCardMeta}>
                      Prior Authorization: {selectedRow.pricingSet?.PricingCoverage?.PriorAuthRequired ? 'Required' : 'Not Required'}
                    </Text>
                    {selectedRow.pricingSet?.Pharmacy ? (
                      <View style={styles.pharmacyBlock}>
                        <Text style={styles.pharmacyName}>{selectedRow.pricingSet.Pharmacy.StoreName}</Text>
                        <Text style={styles.pharmacyMeta}>{selectedRow.pricingSet.Pharmacy.PharmacyType}</Text>
                        <Text style={styles.pharmacyMeta}>
                          {[selectedRow.pricingSet.Pharmacy.Address1, selectedRow.pricingSet.Pharmacy.City, selectedRow.pricingSet.Pharmacy.State, selectedRow.pricingSet.Pharmacy.ZipCode].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable onPress={() => setShowFullCoverage((v) => !v)}>
                      <Text style={styles.toggleLink}>{showFullCoverage ? 'Hide' : 'See'} full coverage factors</Text>
                    </Pressable>
                    {showFullCoverage ? (
                      <View style={styles.coverageDetails}>
                        <Text style={styles.coverageLine}>Drug status: {selectedRow.pricingSet?.PricingCoverage?.DrugStatusCode || '-'}</Text>
                        <Text style={styles.coverageLine}>Formulary status: {selectedRow.pricingSet?.PricingCoverage?.FormularyStatus || '-'}</Text>
                        <Text style={styles.coverageLine}>
                          Quantity priced: {selectedRow.pricingSet?.PricingCoverage?.QuantityPricedValue} {selectedRow.pricingSet?.PricingCoverage?.QuantityPricedUnitOfMeasureType}
                        </Text>
                        {(selectedRow.pricingSet?.PricingCoverage?.CoverageAlerts || []).map((alert, i) => (
                          <Text key={i} style={styles.coverageAlert}>
                            {alert.ReferenceCode}: {alert.ReferenceText}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            </View>

            <View style={styles.searchRow}>
              <Feather name="search" size={14} color={adTokens.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by pharmacy or medication..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterRow}>
              {MED_FILTER_OPTIONS.map((opt) => (
                <FilterChip key={opt.key} label={opt.label} active={medFilters.has(opt.key)} onPress={() => setMedFilters((prev) => toggleInSet(prev, opt.key))} />
              ))}
            </View>
            <View style={styles.filterRow}>
              {PHARMACY_FILTER_OPTIONS.map((opt) => (
                <FilterChip key={opt.key} label={opt.label} active={pharmacyFilters.has(opt.key)} onPress={() => setPharmacyFilters((prev) => toggleInSet(prev, opt.key))} />
              ))}
            </View>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="small" color={adTokens.primary} />
                <Text style={styles.pollText}>{pollMessage || 'Loading...'}</Text>
              </View>
            ) : pollMessage ? (
              <Text style={styles.errorText}>{pollMessage}</Text>
            ) : filteredOptions.length === 0 ? (
              <Text style={styles.emptyText}>
                {benefitsItem && !benefitsItem.PatientSpecificPricingCoverages?.length && !benefitsItem.Alternatives?.length
                  ? 'No prescription benefit information available for this medication.'
                  : 'No prescription benefits found for the selected coverage and medication.'}
              </Text>
            ) : (
              filteredOptions.map((row) => {
                const active = selectedRow?.key === row.key;
                return (
                  <Pressable
                    key={row.key}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      setSelectedRow(row);
                      setShowFullCoverage(false);
                    }}
                  >
                    <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                    <View style={styles.flex1}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {row.displayName}
                        {row.isCurrent ? ' (current)' : ''}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {row.pricingSet?.Pharmacy?.StoreName} · {row.pricingSet?.Pharmacy?.DistanceFromRequestedPharmacy ?? '-'} mi
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {row.pricingSet?.PricingCoverage?.DaysSupplyPriced} Day Supply
                      </Text>
                    </View>
                    <Text style={styles.rowPay}>{row.pricingSet?.PricingCoverage?.EstimatedPatientPayAmount ?? '-'}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.replaceButton, (!selectedRow || selectedRow.isCurrent) && styles.disabledButton]}
              disabled={!selectedRow || selectedRow.isCurrent}
              onPress={() => setReplaceConfirmOpen(true)}
            >
              <Text style={styles.replaceButtonText}>Replace Medication</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ReplaceMedicationConfirmationModal
        visible={replaceConfirmOpen}
        onCancel={() => setReplaceConfirmOpen(false)}
        onConfirm={handleConfirmReplace}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: adTokens.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { padding: 16 },

  compareRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 14 },
  compareCard: { flex: 1, borderWidth: 1, borderColor: adTokens.border, borderRadius: 12, padding: 12, gap: 4 },
  compareCardLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textMuted, textTransform: 'uppercase' },
  compareCardName: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginTop: 2 },
  compareCardMeta: { fontSize: 11.5, color: adTokens.textSecondary },
  compareCardPay: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark, marginTop: 4 },
  promptText: { fontSize: 12, color: adTokens.textMuted, marginTop: 8 },
  pharmacyBlock: { marginTop: 6, gap: 1 },
  pharmacyName: { fontSize: 12, fontWeight: '700', color: adTokens.textPrimary },
  pharmacyMeta: { fontSize: 11, color: adTokens.textSecondary },
  toggleLink: { fontSize: 11.5, fontWeight: '600', color: adTokens.primaryDark, marginTop: 6 },
  coverageDetails: { marginTop: 6, gap: 2 },
  coverageLine: { fontSize: 11, color: adTokens.textSecondary },
  coverageAlert: { fontSize: 11, color: adTokens.warningDark },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, color: adTokens.textPrimary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: adTokens.white },

  loaderWrap: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  pollText: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },
  errorText: { fontSize: 12.5, color: adTokens.danger, textAlign: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowActive: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: adTokens.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: adTokens.primary },
  radioDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: adTokens.primary },
  rowName: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  rowMeta: { fontSize: 11, color: adTokens.textSecondary, marginTop: 1 },
  rowPay: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },

  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  replaceButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: adTokens.primary },
  disabledButton: { opacity: 0.5 },
  replaceButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
