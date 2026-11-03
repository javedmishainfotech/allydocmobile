import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { getPatientEligibilities } from '../../services/doseSpotClinicalService';
import { adTokens } from '../../theme/colors';

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

/** "1990-05-14T00:00:00Z" -> "May 14, 1990" (falls back to the raw value if it doesn't parse). */
function formatDateOfBirth(value) {
  if (!value) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/** Port of AllyDocReactApp's CoverageTab.jsx - read-only, GET
 * /api/Eligibilities/{doseSpotPatientId}/eligibilities. If multiple plans
 * exist, a chip selector switches between them (default: first). */
export default function CoverageTab({ doseSpotPatientId }) {
  const [eligibilities, setEligibilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!doseSpotPatientId) return;
    setIsLoading(true);
    getPatientEligibilities(doseSpotPatientId).then((response) => {
      const items = response.data?.Items;
      setEligibilities(response.success && Array.isArray(items) ? items : []);
      setSelectedIndex(0);
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

  if (eligibilities.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.mutedText}>No coverage/eligibility records on file.</Text>
      </View>
    );
  }

  const plan = eligibilities[selectedIndex];
  const demographics = plan.Demographics;

  return (
    <View>
      {eligibilities.length > 1 ? (
        <View style={styles.chipRow}>
          {eligibilities.map((item, index) => (
            <Pressable
              key={index}
              style={[styles.chip, selectedIndex === index && styles.chipActive]}
              onPress={() => setSelectedIndex(index)}
            >
              <Text style={[styles.chipText, selectedIndex === index && styles.chipTextActive]} numberOfLines={1}>
                {item.PayerName} - {item.PlanName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {plan.ErrorMessage ? (
        <View style={[styles.banner, styles.bannerDanger]}>
          <Text style={styles.bannerText}>{plan.ErrorMessage}</Text>
        </View>
      ) : null}
      {plan.InfoMessage ? (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Text style={styles.bannerText}>{plan.InfoMessage}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Insurance Plan</Text>
        <InfoRow label="Payer" value={plan.PayerName} />
        <InfoRow label="Plan" value={plan.PlanName} />
        <InfoRow label="Member ID" value={plan.MemberId} />
        <InfoRow label="Coverage ID" value={plan.CoverageId} />
        <InfoRow label="BIN" value={plan.BIN} />
        <InfoRow label="PCN" value={plan.PCN} />
        <InfoRow label="Group ID" value={plan.GroupId} />
      </View>

      {Array.isArray(plan.PharmacyEligibilities) && plan.PharmacyEligibilities.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Eligibility Status</Text>
          {plan.PharmacyEligibilities.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.PharmacyType}</Text>
              <View
                style={[
                  styles.statusBadge,
                  item.EligibilityStatus === 'Covered' ? styles.statusBadgeSuccess : styles.statusBadgeNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: item.EligibilityStatus === 'Covered' ? adTokens.successDark : adTokens.textSecondary },
                  ]}
                >
                  {item.EligibilityStatus}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {demographics ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Demographic Information</Text>
          <InfoRow label="Name" value={[demographics.FirstName, demographics.LastName].filter(Boolean).join(' ')} />
          <InfoRow label="Date of Birth" value={formatDateOfBirth(demographics.DateOfBirth)} />
          <InfoRow label="Gender" value={demographics.Gender} />
          <InfoRow
            label="Address"
            value={[demographics.Address?.AddressLine1, demographics.Address?.City, demographics.Address?.State, demographics.Address?.ZipCode]
              .filter(Boolean)
              .join(', ')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border, maxWidth: 220 },
  chipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  chipText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  banner: { borderRadius: 10, padding: 10, marginBottom: 12 },
  bannerDanger: { backgroundColor: adTokens.dangerLight },
  bannerInfo: { backgroundColor: adTokens.infoLight },
  bannerText: { fontSize: 12.5, color: adTokens.textPrimary },

  sectionCard: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  infoLabel: { fontSize: 12.5, color: adTokens.textSecondary, flexShrink: 0 },
  infoValue: { fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, flexShrink: 1, textAlign: 'right' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  statusBadgeSuccess: { backgroundColor: adTokens.successLight },
  statusBadgeNeutral: { backgroundColor: adTokens.gray100 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
});
