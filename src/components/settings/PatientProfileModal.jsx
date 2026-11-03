import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { useFormik } from 'formik';
import { useAuth } from '../../hooks/useAuth';
import { createPatientProfile, updatePatientProfile } from '../../services/profileService';
import { getCitiesByStateId, getStates } from '../../services/identityProofingService';
import { getPatientProfileValidationSchema } from '../../utils/validationSchema';
import { getItem, setItem } from '../../utils/storage';
import { localDateOnlyToApiString, formatDateLabel } from '../../utils/dateOnly';
import { IdpSelectField } from '../identityProofing/IdpUi';
import DatePickerSheet from '../DatePickerSheet';
import Avatar from '../Avatar';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const BLOOD_GROUPS = [
  { label: 'O Positive (O+)', value: 'O+' },
  { label: 'O Negative (O-)', value: 'O-' },
  { label: 'A Positive (A+)', value: 'A+' },
  { label: 'A Negative (A-)', value: 'A-' },
  { label: 'B Positive (B+)', value: 'B+' },
  { label: 'B Negative (B-)', value: 'B-' },
  { label: 'AB Positive (AB+)', value: 'AB+' },
  { label: 'AB Negative (AB-)', value: 'AB-' },
];
const PHONE_TYPES = [
  { label: 'Beeper', value: '1' },
  { label: 'Cell', value: '2' },
  { label: 'Fax', value: '3' },
  { label: 'Home', value: '4' },
  { label: 'Work', value: '5' },
  { label: 'Night', value: '6' },
];
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];
const HEIGHT_UNITS = [
  { label: 'INCH', value: '1' },
  { label: 'CM', value: '2' },
];
const WEIGHT_UNITS = [
  { label: 'LB', value: '1' },
  { label: 'KG', value: '2' },
];

// Same limits as the web modal's PATIENT_FIELD_LIMITS.
const FIELD_LIMITS = { FirstName: 35, MiddleName: 35, LastName: 35, phoneNo: 25, address: 35, zipCode: 10 };
const DIGITS_ONLY = ['phoneNo', 'zipCode'];
const FIELD_LABELS = {
  FirstName: 'First name',
  MiddleName: 'Middle name',
  LastName: 'Last name',
  phoneNo: 'Phone number',
  address: 'Address',
  zipCode: 'Zip code',
};

const getStateCode = (state) => state?.stateCode ?? state?.StateCode ?? state?.code ?? state?.Code ?? '';
const getStateName = (state) => state?.stateName ?? state?.StateName ?? state?.name ?? state?.Name ?? '';

const parseDay = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const calculateAge = (dateOfBirth) => {
  const birth = parseDay(dateOfBirth);
  if (!birth) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
};

/** Strips a leading US country code from the phone sent to the API. */
const normalizePhoneForApi = (phone) => String(phone ?? '').trim().replace(/^\+1\s?/, '');

const heightMetricOf = (data) => {
  const metric = data?.heightMetric ?? data?.heightUnit;
  if (metric === 'INCH') return '1';
  if (metric === 'CM') return '2';
  return metric != null ? String(metric) : '';
};
const weightMetricOf = (data) => {
  const metric = data?.weightMetric ?? data?.weightUnit;
  if (metric === 'LB') return '1';
  if (metric === 'KG') return '2';
  return metric != null ? String(metric) : '';
};

function Field({ label, required, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * Create / edit the patient profile - port of the web's CreateProfilePatientModal. `edit` is the
 * "Edit Profile" form (`PUT /UpdateProfile`, closable, photo optional); otherwise it is the blocking
 * first-visit "Create Profile" (`POST /CreateProfileV4`, photo required, with a Logout escape).
 * Same fields, limits and rules as the web: names, phone + type, gender, date of birth (age is
 * calculated), height / weight with their units, blood group, address, state -> city, zip.
 *
 * @param {{ visible: boolean, edit?: boolean, data?: object, onClose: Function, onSaved?: Function }} props
 */
export default function PatientProfileModal({ visible, edit = false, data, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const { profile, updateProfileState, logout } = useAuth();

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [manualErrors, setManualErrors] = useState({});
  const [previewUri, setPreviewUri] = useState(null);
  const [storedPhone, setStoredPhone] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    getItem('phoneNo').then((value) => setStoredPhone(value || ''));
  }, []);

  const initialValues = useMemo(() => {
    const phone = edit
      ? data?.phoneNo || data?.phoneNumber || data?.primaryPhone || storedPhone || ''
      : storedPhone || '';
    return {
      fullName: edit ? data?.fullName || profile?.fullName || '' : profile?.fullName || '',
      age: edit && data?.age != null ? String(data.age) : '',
      phoneNo: phone,
      height: edit && data?.height != null ? String(data.height) : '',
      weight: edit && data?.weight != null ? String(data.weight) : '',
      bloodGroup: edit ? data?.bloodGroup || '' : '',
      address: edit ? data?.address || '' : '',
      city: edit ? data?.city || '' : '',
      zipCode: edit ? String(data?.zipCode || data?.zipcode || '') : '',
      gender: edit ? data?.gender || '' : '',
      userId: profile?.userId,
      weightMetric: edit ? weightMetricOf(data) : '',
      heightMetric: edit ? heightMetricOf(data) : '',
      email: edit ? data?.email || profile?.email || '' : profile?.email || '',
      DateOfBirth: edit && data?.dateOfBirth ? String(data.dateOfBirth).split('T')[0] : '',
      state: edit ? data?.state || '' : '',
      primaryPhoneType: edit && data?.primaryPhoneType != null ? String(data.primaryPhoneType) : '',
      FirstName: (edit ? data?.firstName : profile?.firstName) || profile?.firstName || '',
      LastName: (edit ? data?.lastName : profile?.lastName) || profile?.lastName || '',
      MiddleName: (edit ? data?.middleName ?? data?.MiddleName : profile?.middleName) || '',
      profileImage: null,
    };
  }, [edit, data, profile, storedPhone]);

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: getPatientProfileValidationSchema(edit),
    onSubmit: async (values, { setSubmitting }) => {
      const phone = normalizePhoneForApi(values.phoneNo);
      const payload = {
        ...values,
        phoneNo: phone,
        primaryPhone: phone,
        // The backend expects the capitalised metric ids.
        HeightMetric: values.heightMetric,
        WeightMetric: values.weightMetric,
      };
      delete payload.heightMetric;
      delete payload.weightMetric;
      delete payload.profileImage;

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        formData.append(key, String(value));
      });
      const photo = values.profileImage;
      if (photo?.uri) {
        formData.append('profileImage', {
          uri: photo.uri,
          name: photo.fileName || photo.uri.split('/').pop() || 'profile.jpg',
          type: photo.mimeType || 'image/jpeg',
        });
      }

      const result = await (edit ? updatePatientProfile(formData) : createPatientProfile(formData));
      setSubmitting(false);
      if (!result.success) {
        toast.error(result.message || 'Unable to save your profile.');
        return;
      }
      // Like login, keep every returned field in the persisted session (isFirstVisit flips here).
      const userData = result.data || {};
      await Promise.all(
        Object.entries(userData)
          .filter(([, value]) => value != null && typeof value !== 'object')
          .map(([key, value]) => setItem(key, String(value))),
      );
      updateProfileState({
        fullName: userData.fullName?.trim?.() ?? userData.fullName ?? values.fullName,
        firstName: userData.firstName?.trim?.() ?? userData.firstName ?? values.FirstName,
        lastName: userData.lastName?.trim?.() ?? userData.lastName ?? values.LastName,
        middleName: userData.middleName?.trim?.() ?? userData.middleName ?? values.MiddleName,
        profileImage: userData.profileImage ?? profile?.profileImage,
        phoneNo: userData.phoneNumber ?? phone,
      });
      toast.success(result.message || 'Profile saved');
      onSaved?.();
      onClose();
    },
  });

  const { values, errors, touched, setFieldValue, setFieldTouched, handleSubmit, isSubmitting } = formik;

  // Reset the form-only state each time the modal opens.
  useEffect(() => {
    if (visible) {
      setManualErrors({});
      setPreviewUri(edit ? data?.profileImage || null : null);
      setLocationError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setLoadingStates(true);
    getStates().then((result) => {
      setLoadingStates(false);
      if (result.success && Array.isArray(result.data)) setStates(result.data);
      else setLocationError('Error loading states. Please try again.');
    });
  }, [visible]);

  // Editing: load the cities of the saved state once the states are in.
  useEffect(() => {
    if (!visible || !edit || !values.state || states.length === 0 || cities.length > 0) return;
    const selected = states.find((state) => getStateCode(state) === values.state);
    if (selected?.stateId) loadCities(selected.stateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, edit, states, values.state]);

  const loadCities = async (stateId) => {
    setLoadingCities(true);
    const result = await getCitiesByStateId(stateId);
    setLoadingCities(false);
    if (result.success && Array.isArray(result.data)) setCities(result.data);
    else setLocationError('Error loading cities. Please try again.');
  };

  const onStateChange = async (stateCode) => {
    setFieldValue('state', stateCode);
    setFieldTouched('state', true, false);
    setFieldValue('city', '');
    setCities([]);
    setLocationError('');
    const selected = states.find((state) => getStateCode(state) === stateCode);
    if (selected?.stateId) await loadCities(selected.stateId);
  };

  const err = (name) => (touched[name] ? manualErrors[name] || errors[name] : undefined);

  // Names / phone / address / zip: enforce the web's limits (digits-only for phone and zip) with the same message.
  const onLimitedChange = (name, raw) => {
    const limit = FIELD_LIMITS[name];
    let next = DIGITS_ONLY.includes(name) ? raw.replace(/\D/g, '') : raw;
    setFieldTouched(name, true, false);
    if (next.length > limit) {
      setManualErrors((prev) => ({ ...prev, [name]: `${FIELD_LABELS[name]} must not exceed ${limit} characters` }));
      next = next.slice(0, limit);
    } else {
      setManualErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setFieldValue(name, next);
  };

  const onDobSelect = (date) => {
    const dob = localDateOnlyToApiString(date);
    setFieldValue('DateOfBirth', dob);
    setFieldTouched('DateOfBirth', true, false);
    const age = calculateAge(dob);
    if (age) setFieldValue('age', age);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setPreviewUri(asset.uri);
    setFieldValue('profileImage', asset);
    setFieldTouched('profileImage', true, false);
  };

  const dobDay = parseDay(values.DateOfBirth);
  const numberInput = (name, placeholder) => (
    <TextInput
      style={styles.input}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={adTokens.textMuted}
      value={String(values[name] ?? '')}
      onChangeText={(text) => setFieldValue(name, text.replace(/[^0-9.]/g, ''))}
      onBlur={() => setFieldTouched(name, true)}
    />
  );
  const textInput = (name, extra = {}) => (
    <TextInput
      style={[styles.input, extra.multiline && styles.multiline]}
      value={values[name]}
      onChangeText={(text) => onLimitedChange(name, text)}
      onBlur={() => setFieldTouched(name, true)}
      {...extra}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={edit ? onClose : undefined}>
      <Toast />
      <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{edit ? 'Update' : 'Create'} Profile</Text>
          {edit ? (
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={24} color={adTokens.textSecondary} />
            </Pressable>
          ) : (
            <Pressable style={styles.logout} onPress={logout}>
              <MaterialCommunityIcons name="lock-outline" size={15} color={adTokens.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <View style={styles.photoBlock}>
            <Pressable onPress={pickPhoto} accessibilityLabel="Choose profile photo">
              <Avatar name={values.fullName || `${values.FirstName} ${values.LastName}`} imageUrl={previewUri} size={108} />
              <View style={styles.photoEdit}>
                <MaterialCommunityIcons name="camera-outline" size={16} color={adTokens.white} />
              </View>
            </Pressable>
            <Text style={styles.label}>
              Profile Photo{!edit ? <Text style={styles.required}> *</Text> : null}
            </Text>
            {touched.profileImage && errors.profileImage ? <Text style={styles.error}>{errors.profileImage}</Text> : null}
          </View>

          <Field label="Full Name" required>
            <TextInput style={[styles.input, styles.disabled]} value={values.fullName} editable={false} />
          </Field>
          <Field label="First Name" required error={err('FirstName')}>{textInput('FirstName')}</Field>
          <Field label="Middle Name" error={err('MiddleName')}>{textInput('MiddleName')}</Field>
          <Field label="Last Name" required error={err('LastName')}>{textInput('LastName')}</Field>
          <Field label="Email" required>
            <TextInput style={[styles.input, styles.disabled]} value={values.email} editable={false} />
          </Field>
          <Field label="Phone number" required error={err('phoneNo')}>{textInput('phoneNo', { keyboardType: 'number-pad' })}</Field>
          <Field label="Primary Phone Type" required error={err('primaryPhoneType')}>
            <IdpSelectField
              options={PHONE_TYPES}
              value={values.primaryPhoneType}
              onChange={(value) => {
                setFieldValue('primaryPhoneType', value);
                setFieldTouched('primaryPhoneType', true, false);
              }}
            />
          </Field>
          <Field label="Gender" required error={err('gender')}>
            <IdpSelectField
              options={GENDERS}
              value={values.gender}
              onChange={(value) => {
                setFieldValue('gender', value);
                setFieldTouched('gender', true, false);
              }}
            />
          </Field>
          <Field label="Date of Birth" required error={err('DateOfBirth')}>
            <Pressable style={styles.dateField} onPress={() => setPicking(true)}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
              <Text style={[styles.dateText, !dobDay && styles.placeholder]}>{dobDay ? formatDateLabel(dobDay) : 'Select date'}</Text>
            </Pressable>
          </Field>
          <Field label="Age" required error={err('age')}>{numberInput('age', 'Age')}</Field>
          <Field label="Height" required error={err('height')}>{numberInput('height', 'Height')}</Field>
          <Field label="Height Unit" required error={err('heightMetric')}>
            <IdpSelectField
              options={HEIGHT_UNITS}
              value={values.heightMetric}
              onChange={(value) => {
                setFieldValue('heightMetric', value);
                setFieldTouched('heightMetric', true, false);
              }}
            />
          </Field>
          <Field label="Weight" required error={err('weight')}>{numberInput('weight', 'Weight')}</Field>
          <Field label="Weight Unit" required error={err('weightMetric')}>
            <IdpSelectField
              options={WEIGHT_UNITS}
              value={values.weightMetric}
              onChange={(value) => {
                setFieldValue('weightMetric', value);
                setFieldTouched('weightMetric', true, false);
              }}
            />
          </Field>
          <Field label="Blood Group" required error={err('bloodGroup')}>
            <IdpSelectField
              options={BLOOD_GROUPS}
              value={values.bloodGroup}
              onChange={(value) => {
                setFieldValue('bloodGroup', value);
                setFieldTouched('bloodGroup', true, false);
              }}
            />
          </Field>
          <Field label="Address" required error={err('address')}>{textInput('address', { multiline: true })}</Field>
          <Field label="State" required error={err('state') || locationError || undefined}>
            <IdpSelectField
              searchable
              loading={loadingStates}
              options={states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }))}
              value={values.state}
              onChange={onStateChange}
            />
          </Field>
          <Field label="City" required error={err('city')}>
            <IdpSelectField
              searchable
              loading={loadingCities}
              disabled={!values.state}
              options={cities.map((city) => ({ value: city.cityName, label: city.cityName }))}
              value={values.city}
              onChange={(value) => {
                setFieldValue('city', value);
                setFieldTouched('city', true, false);
              }}
            />
          </Field>
          <Field label="Zipcode" required error={err('zipCode')}>{textInput('zipCode', { keyboardType: 'number-pad' })}</Field>

          <Pressable style={[styles.save, isSubmitting && styles.saveOff]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
            <Text style={styles.saveText}>Save Profile</Text>
          </Pressable>
        </ScrollView>

        <DatePickerSheet
          visible={picking}
          title="Date of Birth"
          value={dobDay}
          onSelect={onDobSelect}
          onClose={() => setPicking(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.danger },
  logoutText: { fontSize: 13, fontWeight: '700', color: adTokens.danger },
  content: { padding: 16, gap: 14 },

  photoBlock: { alignItems: 'center', gap: 6 },
  photoEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: adTokens.primary,
    borderWidth: 2,
    borderColor: adTokens.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  required: { color: adTokens.danger },
  error: { fontSize: 12.5, color: adTokens.danger },
  input: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    fontSize: 14.5,
    color: adTokens.textPrimary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  disabled: { backgroundColor: adTokens.gray100, color: adTokens.textSecondary },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  dateText: { flex: 1, fontSize: 14.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },

  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: adTokens.primary, marginTop: 6 },
  saveOff: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: adTokens.white },
});
