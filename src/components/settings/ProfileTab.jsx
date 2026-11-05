import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getUserDetails } from '../../services/settingsService';
import DocumentPreviewModal from '../DocumentPreviewModal';
import RingtoneSelector from './RingtoneSelector';
import { adTokens } from '../../theme/colors';

const PHONE_TYPE_MAP = { 1: 'Beeper', 2: 'Cell', 3: 'Fax', 4: 'Home', 5: 'Work', 6: 'Night' };

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function FileRow({ icon = 'file-document-outline', name, onPreview }) {
  return (
    <Pressable style={styles.fileRow} onPress={onPreview}>
      <MaterialCommunityIcons name={icon} size={18} color={adTokens.primaryDark} />
      <Text style={styles.fileText} numberOfLines={1}>
        {name}
      </Text>
      <Feather name="eye" size={15} color={adTokens.primaryDark} />
    </Pressable>
  );
}

/**
 * Port of AllyDocReactApp's Settings/MyProfile.jsx for the Freelancer Doctor
 * variant: read-only display only. The web version's "Edit Details" button
 * (which opens the CreateProfileDoctor modal) is gated OFF for the Doctor
 * role (hideDoctorFields check), so freelancer doctors never see it either -
 * nothing is missing here by leaving editing out.
 */
export default function ProfileTab({ userId }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    getUserDetails(userId).then((response) => {
      setDetails(response.success ? response.data : null);
      setIsLoading(false);
    });
  }, [userId]);

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
        <Text style={styles.mutedText}>Unable to load profile details.</Text>
      </View>
    );
  }

  const dea = details.deaNumbers?.[0];
  const nadea = details.nadeaNumbers?.[0];
  const phoneTypeLabel = PHONE_TYPE_MAP[details.primaryPhoneType] || details.primaryPhoneType;

  return (
    <View>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(details.fullName || 'D').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name}>{details.fullName}</Text>
          <Text style={styles.email}>{details.email}</Text>
          {details.phoneNumber || details.phoneNo ? (
            <Text style={styles.phone}>{details.phoneNumber || details.phoneNo}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <InfoRow label="First Name" value={details.firstName} />
        <InfoRow label="Middle Name" value={details.middleName} />
        <InfoRow label="Last Name" value={details.lastName} />
        <InfoRow label="Date of Birth" value={details.dateOfBirth?.slice?.(0, 10)} />
        <InfoRow label="Gender" value={details.gender === 'M' ? 'Male' : details.gender === 'F' ? 'Female' : details.gender} />
        <InfoRow label="Address" value={details.address} />
        <InfoRow label="City" value={details.city} />
        <InfoRow label="State" value={details.state} />
        <InfoRow label="Zip Code" value={details.zipCode ?? details.zipcode} />
        <InfoRow label="Primary Phone Type" value={phoneTypeLabel} />
        <InfoRow label="Primary Fax" value={details.primaryFax} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Professional Details</Text>
        <InfoRow label="Specialization" value={details.specializationName} />
        <InfoRow label="Licence Number" value={details.licenceNumber} />
        <InfoRow label="NPI Number" value={details.npiNumber} />
        <InfoRow label="DEA Number" value={dea ? `${dea.deaNumber} (${dea.state})` : null} />
        <InfoRow label="NADEA Number" value={nadea ? `${nadea.nadeaNumber} (${nadea.state})` : null} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ringtone</Text>
        <RingtoneSelector />
      </View>

      {details.uploadLicence ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Licence File</Text>
          <FileRow
            name={String(details.uploadLicence).split('/').pop()}
            onPreview={() => setPreviewFile({ url: details.uploadLicence, name: 'Licence' })}
          />
        </View>
      ) : null}

      {Array.isArray(details.qualificationName) && details.qualificationName.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Qualifications</Text>
          {details.qualificationName.map((qual, index) => {
            // Mirrors MyProfile.jsx's own fallback chain - the real API only
            // ever returns `qualificationsName: null`, so this almost always
            // lands on the "Qualification N" fallback, same as web.
            const displayName =
              qual.qualificationsName ||
              qual.fileName ||
              qual.filename ||
              qual.documentName ||
              qual.name ||
              `Qualification ${index + 1}`;
            return (
              <FileRow
                key={qual.documentId ?? index}
                name={displayName}
                onPreview={() => setPreviewFile({ url: qual.qualificationsPath, name: displayName })}
              />
            );
          })}
        </View>
      ) : null}

      <DocumentPreviewModal
        visible={Boolean(previewFile)}
        fileUrl={previewFile?.url}
        fileName={previewFile?.name}
        onClose={() => setPreviewFile(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingWrap: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13.5, color: adTokens.textSecondary },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: adTokens.white,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: adTokens.cardBorderRadius,
    padding: 16,
    marginBottom: 14,
    ...adTokens.cardShadow,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: adTokens.primaryDark },
  name: { fontSize: 16.5, fontWeight: '700', color: adTokens.textPrimary },
  email: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  phone: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 1 },

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
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray100,
  },
  infoLabel: { fontSize: 12.5, color: adTokens.textSecondary, flexShrink: 0 },
  infoValue: { fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, flexShrink: 1, textAlign: 'right' },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 8,
  },
  fileText: { flex: 1, fontSize: 12.5, color: adTokens.primaryDark },
});
