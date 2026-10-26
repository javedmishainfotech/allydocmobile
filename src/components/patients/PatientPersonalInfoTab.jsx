import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getUserDetails, getPatientPharmacies } from '../../services/patientsService';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

function IconInfoRow({ icon, label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon} size={16} color={adTokens.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>
        {String(value)}
      </Text>
    </View>
  );
}

/**
 * Port of ViewPatientPage.jsx's "personal" tab for the Freelancer Doctor
 * variant: read-only (web sets canEditProfile=false for freelancer doctors
 * too, via isFreelancerDoctorAppointmentFilter - no "Edit" action is shown,
 * matching that restriction), plus the pharmacy banner the web shows on this
 * page (GetPatientPharmaciesAction, "Manage Pharmacy" link visible for
 * freelancer doctor - only hidden for doctor-admin/nurse).
 */
export default function PatientPersonalInfoTab({ patientId, onDoseSpotIdResolved }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setIsLoading(true);
    getUserDetails(patientId).then((response) => {
      const data = response.success ? response.data : null;
      setDetails(data);
      setIsLoading(false);
      const doseSpotId = data?.doseSpotRefrenceId;
      if (doseSpotId) {
        onDoseSpotIdResolved?.(doseSpotId);
        setPharmacyLoading(true);
        getPatientPharmacies(doseSpotId).then((pharmacyResponse) => {
          setPharmacyLoading(false);
          const list = Array.isArray(pharmacyResponse.data) ? pharmacyResponse.data : pharmacyResponse.data?.Items;
          setPharmacy(pharmacyResponse.success && Array.isArray(list) && list.length ? list[0] : null);
        });
      }
    });
  }, [patientId]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={adTokens.primary} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.mutedText}>Unable to load patient details.</Text>
      </View>
    );
  }

  const fullName = [details.firstName, details.middleName, details.lastName].filter(Boolean).join(' ') || 'Patient';
  const genderLabel = details.gender === 'M' ? 'Male' : details.gender === 'F' ? 'Female' : details.gender;
  const addressLine = [details.address, details.city, details.state].filter(Boolean).join(', ');

  return (
    <View>
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.patientIdText}>Patient ID: P{patientId}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <IconInfoRow icon="calendar-outline" label="Date of Birth" value={details.dateOfBirth?.slice?.(0, 10)} />
        <IconInfoRow icon="gender-male-female" label="Gender" value={genderLabel} />
        <IconInfoRow icon="phone-outline" label="Phone Number" value={details.phoneNo || details.phoneNumber} />
        <IconInfoRow icon="email-outline" label="Email" value={details.email} />
        <IconInfoRow icon="map-marker-outline" label="Address" value={addressLine} />
        <IconInfoRow icon="pound" label="Zip Code" value={details.zipCode ?? details.zipcode} />
        <IconInfoRow icon="water-outline" label="Blood Group" value={details.bloodGroup} />
        <IconInfoRow
          icon="human-male-height"
          label="Height / Weight"
          value={
            details.height || details.weight
              ? `${details.height ? `${details.height} ${details.heightUnit || ''}`.trim() : '-'} / ${
                  details.weight ? `${details.weight} ${details.weightUnit || ''}`.trim() : '-'
                }`
              : null
          }
        />
        <IconInfoRow icon="pound-box-outline" label="DoseSpot ID" value={details.doseSpotRefrenceId} />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="pharmacy" size={16} color={adTokens.primaryDark} />
          <Text style={styles.sectionTitle}>Pharmacy</Text>
        </View>
        {pharmacyLoading ? (
          <ActivityIndicator size={16} color={adTokens.primary} />
        ) : pharmacy ? (
          <>
            <Text style={styles.pharmacyName}>{pharmacy.StoreName || pharmacy.storeName}</Text>
            <Text style={styles.pharmacyDetail}>{pharmacy.Address1 || pharmacy.address1}</Text>
            {pharmacy.PrimaryPhone || pharmacy.primaryPhone ? (
              <Text style={styles.pharmacyDetail}>{pharmacy.PrimaryPhone || pharmacy.primaryPhone}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.mutedText}>No default pharmacy on file.</Text>
        )}
        <Pressable
          style={styles.manageLink}
          onPress={() => toast.info('Pharmacy management is not available in the app yet.')}
        >
          <Text style={styles.manageLinkText}>Manage Pharmacy</Text>
          <Feather name="chevron-right" size={14} color={adTokens.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingWrap: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },

  sectionCard: {
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: adTokens.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: adTokens.primaryDark },
  name: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },
  patientIdText: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },

  divider: { height: 1, backgroundColor: adTokens.gray100, marginBottom: 6 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  infoLabel: { fontSize: 13, color: adTokens.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary, flexShrink: 1, textAlign: 'right' },

  pharmacyName: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  pharmacyDetail: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  manageLinkText: { fontSize: 12.5, fontWeight: '600', color: adTokens.primaryDark },
});
