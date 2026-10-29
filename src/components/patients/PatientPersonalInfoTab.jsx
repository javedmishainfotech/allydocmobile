import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { usePatients } from '../../hooks/usePatients';
import { updatePatientProfile } from '../../services/profileService';
import OptionPicker from '../prescriptions/OptionPicker';
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

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const GENDER_VALUE_BY_LABEL = { Male: 'male', Female: 'female', Other: 'other' };
const GENDER_LABEL_BY_VALUE = { male: 'Male', female: 'Female', other: 'Other' };
const WEIGHT_METRIC_OPTIONS = ['LB', 'KG'];
const HEIGHT_METRIC_OPTIONS = ['INCH', 'CM'];

function EditField({ label, children }) {
  return (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * Port of ViewPatientPage.jsx's "personal" tab + PersonalInfoTab.jsx's edit form. Web's
 * `canEditPatientProfile = !isFreelancerDoctorAppointmentFilter` - only a freelancer doctor is
 * read-only; clinic/hospital doctors (and doctor-admin/doctor-sub) can edit. Saved via the same
 * `PUT /UpdateProfile` multipart endpoint the first-visit Create Profile form uses.
 */
export default function PatientPersonalInfoTab({ patientId, onDoseSpotIdResolved }) {
  const { profile } = useAuth();
  const { getUserDetails, getPatientPharmacies } = usePatients();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const userType = String(profile?.userType || '').toLowerCase().trim();
  const canEditProfile = !(userType === 'freelancer' && roleName === 'doctor');

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState(null);

  const loadDetails = () => {
    if (!patientId) return;
    setIsLoading(true);
    getUserDetails(patientId)
      .then((data) => {
        setDetails(data);
        setIsLoading(false);
        const doseSpotId = data?.doseSpotRefrenceId;
        if (doseSpotId) {
          onDoseSpotIdResolved?.(doseSpotId);
          setPharmacyLoading(true);
          getPatientPharmacies(doseSpotId)
            .then((pharmacyData) => {
              const list = Array.isArray(pharmacyData) ? pharmacyData : pharmacyData?.Items;
              setPharmacy(Array.isArray(list) && list.length ? list[0] : null);
            })
            .catch(() => setPharmacy(null))
            .finally(() => setPharmacyLoading(false));
        }
      })
      .catch(() => {
        setDetails(null);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const startEdit = () => {
    setForm({
      FirstName: details.firstName || '',
      MiddleName: details.middleName || '',
      LastName: details.lastName || '',
      Dob: details.dateOfBirth ? details.dateOfBirth.slice(0, 10) : '',
      Gender: GENDER_LABEL_BY_VALUE[String(details.gender || '').toLowerCase()] || '',
      BloodGroup: details.bloodGroup || '',
      PhonePrimary: details.phoneNo || details.phoneNumber || '',
      Email: details.email || '',
      Weight: details.weight != null ? String(details.weight) : '',
      WeightMetric: details.weightMetric === '2' || details.weightUnit === 'KG' ? 'KG' : 'LB',
      Height: details.height != null ? String(details.height) : '',
      HeightMetric: details.heightMetric === '2' || details.heightUnit === 'CM' ? 'CM' : 'INCH',
      Address: details.address || '',
      City: details.city || '',
      State: details.state || '',
      ZipCode: details.zipCode ?? details.zipcode ?? '',
    });
    setIsEditMode(true);
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setEditLoading(true);
    const formData = new FormData();
    formData.append('userId', String(patientId));
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'Gender') {
        formData.append(key, GENDER_VALUE_BY_LABEL[value] || '');
        return;
      }
      if (key === 'WeightMetric') {
        formData.append(key, value === 'KG' ? '2' : '1');
        return;
      }
      if (key === 'HeightMetric') {
        formData.append(key, value === 'CM' ? '2' : '1');
        return;
      }
      formData.append(key, value ?? '');
    });
    const res = await updatePatientProfile(formData);
    setEditLoading(false);
    if (res.success) {
      toast.success(res.message || 'Profile updated successfully.');
      setIsEditMode(false);
      loadDetails();
    } else {
      toast.error(res.message || 'Unable to update profile.');
    }
  };

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
          {canEditProfile ? (
            isEditMode ? (
              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={() => setIsEditMode(false)} disabled={editLoading}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={editLoading}>
                  {editLoading ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editButton} onPress={startEdit}>
                <Feather name="edit-2" size={13} color={adTokens.primaryDark} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </Pressable>
            )
          ) : null}
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

        {isEditMode ? (
          <View style={styles.editGrid}>
            <EditField label="First Name">
              <TextInput style={styles.input} value={form.FirstName} onChangeText={(v) => updateField('FirstName', v)} />
            </EditField>
            <EditField label="Middle Name">
              <TextInput style={styles.input} value={form.MiddleName} onChangeText={(v) => updateField('MiddleName', v)} />
            </EditField>
            <EditField label="Last Name">
              <TextInput style={styles.input} value={form.LastName} onChangeText={(v) => updateField('LastName', v)} />
            </EditField>
            <EditField label="Date of Birth (YYYY-MM-DD)">
              <TextInput style={styles.input} value={form.Dob} onChangeText={(v) => updateField('Dob', v)} placeholder="YYYY-MM-DD" />
            </EditField>
            <OptionPicker label="Gender" value={form.Gender} options={GENDER_OPTIONS} onChange={(v) => updateField('Gender', v)} />
            <EditField label="Blood Group">
              <TextInput style={styles.input} value={form.BloodGroup} onChangeText={(v) => updateField('BloodGroup', v)} />
            </EditField>
            <EditField label="Phone Number">
              <TextInput style={styles.input} value={form.PhonePrimary} onChangeText={(v) => updateField('PhonePrimary', v)} keyboardType="phone-pad" />
            </EditField>
            <EditField label="Email Address">
              <TextInput style={styles.input} value={form.Email} onChangeText={(v) => updateField('Email', v)} keyboardType="email-address" autoCapitalize="none" />
            </EditField>
            <View style={styles.row2}>
              <View style={styles.flex1}>
                <EditField label="Weight">
                  <TextInput style={styles.input} value={form.Weight} onChangeText={(v) => updateField('Weight', v)} keyboardType="decimal-pad" />
                </EditField>
              </View>
              <View style={styles.flex1}>
                <OptionPicker label="Weight Metric" value={form.WeightMetric} options={WEIGHT_METRIC_OPTIONS} onChange={(v) => updateField('WeightMetric', v)} />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.flex1}>
                <EditField label="Height">
                  <TextInput style={styles.input} value={form.Height} onChangeText={(v) => updateField('Height', v)} keyboardType="decimal-pad" />
                </EditField>
              </View>
              <View style={styles.flex1}>
                <OptionPicker label="Height Metric" value={form.HeightMetric} options={HEIGHT_METRIC_OPTIONS} onChange={(v) => updateField('HeightMetric', v)} />
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Address & Physicals</Text>
            <EditField label="Home Address">
              <TextInput style={styles.input} value={form.Address} onChangeText={(v) => updateField('Address', v)} />
            </EditField>
            <View style={styles.row2}>
              <View style={styles.flex1}>
                <EditField label="City">
                  <TextInput style={styles.input} value={form.City} onChangeText={(v) => updateField('City', v)} />
                </EditField>
              </View>
              <View style={styles.flex1}>
                <EditField label="State">
                  <TextInput style={styles.input} value={form.State} onChangeText={(v) => updateField('State', v)} />
                </EditField>
              </View>
            </View>
            <EditField label="Zip Code">
              <TextInput style={styles.input} value={String(form.ZipCode)} onChangeText={(v) => updateField('ZipCode', v)} keyboardType="number-pad" />
            </EditField>
          </View>
        ) : (
          <>
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
          </>
        )}
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  sectionSubtitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary, marginTop: 10, marginBottom: 6 },

  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.primary },
  editButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.primaryDark },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  saveButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: adTokens.primary, minWidth: 54, alignItems: 'center' },
  saveButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.white },

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

  editGrid: { gap: 4 },
  editField: { marginBottom: 12 },
  editLabel: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11, fontSize: 13, color: adTokens.textPrimary },
  row2: { flexDirection: 'row', gap: 10 },

  pharmacyName: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  pharmacyDetail: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  manageLinkText: { fontSize: 12.5, fontWeight: '600', color: adTokens.primaryDark },
});
