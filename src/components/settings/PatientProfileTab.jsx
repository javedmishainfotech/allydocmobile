import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserDetails } from '../../services/settingsService';
import Avatar from '../Avatar';
import PatientProfileModal from './PatientProfileModal';
import RingtoneSelector from './RingtoneSelector';
import { adTokens } from '../../theme/colors';

const PHONE_TYPES = { 1: 'Beeper', 2: 'Cell', 3: 'Fax', 4: 'Home', 5: 'Work', 6: 'Night' };

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

/** Height/weight arrive as a numeric metric id or already as a unit name (web normalisation). */
const heightUnit = (data) => {
  const metric = data?.heightMetric ?? data?.heightUnit;
  if (metric === 1 || metric === '1') return 'INCH';
  if (metric === 2 || metric === '2') return 'CM';
  return metric || '';
};
const weightUnit = (data) => {
  const metric = data?.weightMetric ?? data?.weightUnit;
  if (metric === 1 || metric === '1') return 'LB';
  if (metric === 2 || metric === '2') return 'KG';
  return metric || '';
};

const show = (value) => (value === undefined || value === null || value === '' ? '-' : String(value));

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

/**
 * Patient "My Profile" - port of AllyDocReactApp's module/Patient/Pages/Setting/Tab/PatientProfile:
 * the profile read from `GET /UserDetails?userid=` (hero with photo, name, email, phone and the
 * personal / contact / body details), Edit Profile (the web's Create Profile modal, in edit mode),
 * and the incoming-call ringtone picker (RingtoneSelector).
 */
export default function PatientProfileTab({ userId }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setLoadError(null);
    const result = await getUserDetails(userId);
    if (result.success && result.data) {
      setDetails(result.data);
    } else {
      setDetails(null);
      setLoadError(result.message || 'Unable to load your profile.');
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="large" color={adTokens.primary} />
      </View>
    );
  }

  if (loadError || !details) {
    return (
      <View style={styles.state}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
        <Text style={styles.stateText}>{loadError || 'Profile not found.'}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const fullName = `${details.firstName || ''} ${details.lastName || ''}`.trim() || details.fullName || '-';
  const hUnit = heightUnit(details);
  const wUnit = weightUnit(details);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Avatar name={fullName} imageUrl={details.profileImage} size={96} />
        <Text style={styles.name}>{fullName}</Text>
        {details.email ? (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="email-outline" size={15} color={adTokens.textMuted} />
            <Text style={styles.metaText}>{details.email}</Text>
          </View>
        ) : null}
        {details.phoneNumber ? (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="phone-outline" size={15} color={adTokens.textMuted} />
            <Text style={styles.metaText}>{details.phoneNumber}</Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          onPress={() => setEditing(true)}
        >
          <MaterialCommunityIcons name="square-edit-outline" size={16} color={adTokens.white} />
          <Text style={styles.editText}>Edit Profile</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal details</Text>
        <Field label="First Name" value={show(details.firstName)} />
        <Field label="Middle Name" value={show(details.middleName ?? details.MiddleName)} />
        <Field label="Last Name" value={show(details.lastName)} />
        <Field label="Gender" value={show(details.gender)} />
        <Field label="Age" value={show(details.age)} />
        <Field label="Date of Birth" value={formatDate(details.dateOfBirth)} />
        <Field label="Blood Group" value={show(details.bloodGroup)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <Field label="Email" value={show(details.email)} />
        <Field label="Phone number" value={show(details.phoneNumber)} />
        <Field label="Primary Phone Type" value={PHONE_TYPES[details.primaryPhoneType] ?? '-'} />
        <Field label="Address" value={show(details.address)} />
        <Field label="City" value={show(details.city)} />
        <Field label="State" value={show(details.state)} />
        <Field label="Zipcode" value={show(details.zipcode)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body</Text>
        <Field label="Height" value={show(details.height)} />
        <Field label="Height Metric" value={hUnit || '-'} />
        <Field label="Weight" value={show(details.weight)} />
        <Field label="Weight Metric" value={wUnit || '-'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ringtone</Text>
        <RingtoneSelector />
      </View>

      <PatientProfileModal visible={editing} edit data={details} onClose={() => setEditing(false)} onSaved={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  pressed: { opacity: 0.85 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  stateText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { paddingVertical: 9, paddingHorizontal: 22, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },

  hero: {
    alignItems: 'center',
    gap: 6,
    padding: 18,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.primaryLight,
  },
  name: { fontSize: 20, fontWeight: '800', color: adTokens.textPrimary, marginTop: 6, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: adTokens.textSecondary },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: adTokens.primary,
  },
  editText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },

  card: {
    padding: 14,
    gap: 12,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  field: { gap: 2, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  fieldLabel: { fontSize: 12, color: adTokens.textSecondary },
  fieldValue: { fontSize: 14.5, color: adTokens.textPrimary },
});
