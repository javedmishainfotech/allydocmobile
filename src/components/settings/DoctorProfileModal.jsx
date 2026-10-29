import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFormik } from 'formik';
import { useAuth } from '../../hooks/useAuth';
import { createDoctorProfile, updateDoctorProfile } from '../../services/profileService';
import { getCitiesByStateId, getStates } from '../../services/identityProofingService';
import { getDoctorProfileValidationSchema } from '../../utils/validationSchema';
import { setItem } from '../../utils/storage';
import { localDateOnlyToApiString, formatDateLabel } from '../../utils/dateOnly';
import { IdpSelectField } from '../identityProofing/IdpUi';
import DatePickerSheet from '../DatePickerSheet';
import Avatar from '../Avatar';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const PHONE_TYPES = [
  { label: 'Beeper', value: '1' },
  { label: 'Cell', value: '2' },
  { label: 'Fax', value: '3' },
  { label: 'Home', value: '4' },
  { label: 'Work', value: '5' },
  { label: 'Night', value: '6' },
];
const GENDERS = [
  { label: 'Male', value: 'M' },
  { label: 'Female', value: 'F' },
  { label: 'Rather not to say', value: 'U' },
];
const SPECIALIZATIONS = [
  'Allergy and Immunology', 'Dermatology', 'Dentistry', 'Behavioral Health', 'Family Medicine',
  'Internal Medicine', 'Obstetrics & Gynecology', 'Orthopedics', 'Pediatrics', 'Physical Medicine',
  'Psychiatry', 'Urology',
].map((name) => ({ label: name, value: name }));

const FIELD_LIMITS = { firstName: 35, middleName: 35, lastName: 35, PhoneNo: 25, primaryFax: 25, address: 35, zipCode: 10, deaZipCode: 10, deaAddressLine1: 35, deaAddressLine2: 35, deaNumber: 9, nadeaNumber: 35, npiNumber: 35 };
const DIGITS_ONLY = ['PhoneNo', 'zipCode', 'deaZipCode', 'npiNumber'];
const FIELD_LABELS = {
  firstName: 'First name', middleName: 'Middle name', lastName: 'Last name', PhoneNo: 'Phone number',
  primaryFax: 'Primary fax', address: 'Address', zipCode: 'Zip code', deaZipCode: 'DEA zip code',
  deaAddressLine1: 'DEA address line 1', deaAddressLine2: 'DEA address line 2', deaNumber: 'DEA number',
  nadeaNumber: 'NADEA number', npiNumber: 'NPI number',
};
const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

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
const normalizePhoneForApi = (phone) => String(phone ?? '').trim().replace(/^\+1\s?/, '');

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

function FileRow({ file, onRemove }) {
  return (
    <View style={styles.fileRow}>
      <MaterialCommunityIcons name={file.mimeType === 'application/pdf' ? 'file-pdf-box' : 'file-image-outline'} size={16} color={adTokens.primaryDark} />
      <Text style={styles.fileName} numberOfLines={1}>
        {file.name}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Feather name="x" size={14} color={adTokens.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Create / edit the doctor (and nurse - same shared form on web) profile - port of web's
 * CreateProfileDoctorModal / CreateProfile.jsx. `edit` is the closable "Update Profile" form
 * (`PUT /UpdateProfile`); otherwise it is the blocking first-visit "Create Profile"
 * (`POST /CreateProfileV4`), with a Logout escape, same as the patient's own modal.
 *
 * Height / Weight / Blood Group are deliberately NOT ported: web's own `hideDoctorFields = true`
 * hard-codes them out of the rendered form, and its Certificates upload is dead code
 * (`{false && !edit && (...)}` - never renders). Both match web's actual behaviour by being absent
 * here too, not a gap.
 */
export default function DoctorProfileModal({ visible, edit = false, data, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const { profile, updateProfileState, logout } = useAuth();
  const isNurse = String(profile?.roleName || '').toLowerCase().trim() === 'nurse';

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [deaCities, setDeaCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDeaCities, setLoadingDeaCities] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [manualErrors, setManualErrors] = useState({});
  const [previewUri, setPreviewUri] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const initialValues = useMemo(
    () => ({
      firstName: (edit ? data?.firstName : profile?.firstName) || profile?.firstName || '',
      middleName: (edit ? data?.middleName : profile?.middleName) || '',
      lastName: (edit ? data?.lastName : profile?.lastName) || profile?.lastName || '',
      gender: edit ? data?.gender || 'M' : 'M',
      email: edit ? data?.email || profile?.email || '' : profile?.email || '',
      PhoneNo: edit ? data?.phoneNo || data?.phoneNumber || '' : profile?.phoneNo || '',
      primaryPhoneType: edit && data?.primaryPhoneType != null ? String(data.primaryPhoneType) : '',
      primaryFax: edit ? data?.primaryFax || '' : '',
      dateOfBirth: edit && data?.dateOfBirth ? String(data.dateOfBirth).split('T')[0] : '',
      age: edit && data?.age != null ? String(data.age) : '',
      address: edit ? data?.address || '' : '',
      state: edit ? data?.state || '' : '',
      city: edit ? data?.city || '' : '',
      zipCode: edit ? String(data?.zipCode || data?.zipcode || '') : '',
      npiNumber: edit ? data?.npiNumber || '' : '',
      specializationName: edit ? data?.specialization || data?.specializationName || '' : '',
      licenceNumber: edit ? data?.licenceNumber || '' : '',
      isClinicianAddress: edit ? Boolean(data?.isClinicianAddress) : false,
      deaAddressLine1: edit ? data?.deaAddressLine1 || '' : '',
      deaAddressLine2: edit ? data?.deaAddressLine2 || '' : '',
      deaCity: edit ? data?.deaCity || '' : '',
      deaState: edit ? data?.deaState || '' : '',
      deaZipCode: edit ? data?.deaZipCode || '' : '',
      deaNumber: edit ? data?.deaNumber || data?.deaNumbers?.[0]?.deaNumber || '' : '',
      nadeaNumber: edit ? data?.nadeaNumber || data?.nadeaNumbers?.[0]?.nadeaNumber || '' : '',
      nadeaState: edit ? data?.nadeaState || '' : '',
      profileImage: null,
      licenceFile: null,
      Qualifications: [],
    }),
    [edit, data, profile],
  );

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: getDoctorProfileValidationSchema(edit, isNurse),
    onSubmit: async (values, { setSubmitting }) => {
      const formData = new FormData();
      const phone = normalizePhoneForApi(values.PhoneNo);
      const submission = { ...values, primaryPhone: phone };
      if (values.isClinicianAddress) submission.deaState = values.state;

      const flatDeaNadeaKeys = new Set(['deaNumber', 'deaState', 'nadeaNumber', 'nadeaState']);
      const nurseExcludedKeys = new Set(['npiNumber', 'deaNumber', 'deaState', 'deaAddressLine1', 'deaAddressLine2', 'deaCity', 'deaZipCode', 'nadeaNumber', 'nadeaState', 'isClinicianAddress']);
      const fileKeys = new Set(['Qualifications', 'profileImage', 'licenceFile']);

      Object.keys(submission).forEach((key) => {
        if (fileKeys.has(key)) return;
        if (isNurse && nurseExcludedKeys.has(key)) return;
        if (!edit && flatDeaNadeaKeys.has(key)) return;
        if (submission[key] === null || submission[key] === undefined) return;
        formData.append(key, String(submission[key]));
      });

      if (!isNurse) {
        const deaNumber = String(values.deaNumber || '').trim();
        const deaState = String(submission.deaState || '').trim();
        const nadeaNumber = String(values.nadeaNumber || '').trim();
        const nadeaState = String(values.nadeaState || '').trim();
        if (deaNumber || deaState) {
          formData.append('DEANumber', deaNumber);
          formData.append('DEAState', deaState);
          formData.append('DEANumbers[0].DEANumber', deaNumber);
          formData.append('DEANumbers[0].State', deaState);
        }
        if (nadeaNumber || nadeaState) {
          formData.append('NADEANumber', nadeaNumber);
          formData.append('NADEAState', nadeaState);
          formData.append('NADEANumbers[0].NADEANumber', nadeaNumber);
          formData.append('NADEANumbers[0].State', nadeaState);
        }
      }

      if (values.profileImage?.uri) {
        formData.append('profileImage', { uri: values.profileImage.uri, name: values.profileImage.fileName || 'profile.jpg', type: values.profileImage.mimeType || 'image/jpeg' });
      }
      if (values.licenceFile?.uri) {
        formData.append('licenceFile', { uri: values.licenceFile.uri, name: values.licenceFile.name, type: values.licenceFile.mimeType || 'application/octet-stream' });
      }
      values.Qualifications.forEach((file) => {
        formData.append('Qualifications', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      });

      const result = await (edit ? updateDoctorProfile(formData) : createDoctorProfile(formData));
      setSubmitting(false);
      if (!result.success) {
        toast.error(result.message || 'Unable to save your profile.');
        return;
      }
      const userData = result.data || {};
      await Promise.all(
        Object.entries(userData)
          .filter(([, value]) => value != null && typeof value !== 'object')
          .map(([key, value]) => setItem(key, String(value))),
      );
      await setItem('isFirstVisit', 'false');
      updateProfileState({
        firstName: userData.firstName?.trim?.() ?? userData.firstName ?? values.firstName,
        lastName: userData.lastName?.trim?.() ?? userData.lastName ?? values.lastName,
        middleName: userData.middleName?.trim?.() ?? userData.middleName ?? values.middleName,
        profileImage: userData.profileImage ?? profile?.profileImage,
        phoneNo: userData.phoneNumber ?? phone,
      });
      toast.success(result.message || 'Profile saved');
      onSaved?.();
      onClose();
    },
  });

  const { values, errors, touched, setFieldValue, setFieldTouched, handleSubmit, isSubmitting } = formik;

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

  const loadCities = async (stateId, isDea) => {
    (isDea ? setLoadingDeaCities : setLoadingCities)(true);
    const result = await getCitiesByStateId(stateId);
    (isDea ? setLoadingDeaCities : setLoadingCities)(false);
    if (result.success && Array.isArray(result.data)) (isDea ? setDeaCities : setCities)(result.data);
    else setLocationError('Error loading cities. Please try again.');
  };

  const onStateChange = async (stateCode) => {
    setFieldValue('state', stateCode);
    setFieldTouched('state', true, false);
    setFieldValue('city', '');
    setCities([]);
    const selected = states.find((state) => getStateCode(state) === stateCode);
    if (selected?.stateId) await loadCities(selected.stateId, false);
  };

  const onDeaStateChange = async (stateCode) => {
    setFieldValue('deaState', stateCode);
    setFieldTouched('deaState', true, false);
    setFieldValue('deaCity', '');
    setDeaCities([]);
    const selected = states.find((state) => getStateCode(state) === stateCode);
    if (selected?.stateId) await loadCities(selected.stateId, true);
  };

  const onClinicianAddressToggle = (checked) => {
    setFieldValue('isClinicianAddress', checked);
    if (checked) {
      setFieldValue('deaAddressLine1', '');
      setFieldValue('deaAddressLine2', '');
      setFieldValue('deaCity', '');
      setFieldValue('deaState', '');
      setFieldValue('deaZipCode', '');
      setDeaCities([]);
    }
  };

  const err = (name) => (touched[name] ? manualErrors[name] || errors[name] : undefined);

  const onLimitedChange = (name, raw) => {
    const limit = FIELD_LIMITS[name];
    let next = DIGITS_ONLY.includes(name) ? raw.replace(/\D/g, '') : raw;
    setFieldTouched(name, true, false);
    if (limit && next.length > limit) {
      setManualErrors((prev) => ({ ...prev, [name]: `${FIELD_LABELS[name]} must not exceed ${limit} characters` }));
      next = next.slice(0, limit);
    } else {
      setManualErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setFieldValue(name, next);
  };

  const onDobSelect = (date) => {
    const dob = localDateOnlyToApiString(date);
    setFieldValue('dateOfBirth', dob);
    setFieldTouched('dateOfBirth', true, false);
    const age = calculateAge(dob);
    if (age) setFieldValue('age', age);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Allow photo access to choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setPreviewUri(asset.uri);
    setFieldValue('profileImage', asset);
    setFieldTouched('profileImage', true, false);
  };

  const pickLicenceFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    setFieldValue('licenceFile', result.assets[0]);
    setFieldTouched('licenceFile', true, false);
  };

  const pickQualifications = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_TYPES, multiple: true, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const oversize = result.assets.find((file) => file.size > 5 * 1024 * 1024);
    if (oversize) {
      toast.error(`${oversize.name}: larger than 5 MB.`);
      return;
    }
    setFieldValue('Qualifications', [...values.Qualifications, ...result.assets]);
    setFieldTouched('Qualifications', true, false);
  };

  const removeQualification = (index) => setFieldValue('Qualifications', values.Qualifications.filter((_, i) => i !== index));

  const dobDay = parseDay(values.dateOfBirth);
  const textInput = (name, extra = {}) => (
    <TextInput style={[styles.input, extra.multiline && styles.multiline]} value={values[name]} onChangeText={(text) => onLimitedChange(name, text)} onBlur={() => setFieldTouched(name, true)} {...extra} />
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={edit ? onClose : undefined}>
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
              <Avatar name={`${values.firstName} ${values.lastName}`} imageUrl={previewUri} size={108} />
              <View style={styles.photoEdit}>
                <MaterialCommunityIcons name="camera-outline" size={16} color={adTokens.white} />
              </View>
            </Pressable>
            <Text style={styles.label}>
              Profile Photo{!edit ? <Text style={styles.required}> *</Text> : null}
            </Text>
            {touched.profileImage && errors.profileImage ? <Text style={styles.error}>{errors.profileImage}</Text> : null}
          </View>

          <Field label="First Name" required error={err('firstName')}>{textInput('firstName')}</Field>
          <Field label="Middle Name" error={err('middleName')}>{textInput('middleName')}</Field>
          <Field label="Last Name" required error={err('lastName')}>{textInput('lastName')}</Field>
          <Field label="Gender" required error={err('gender')}>
            <IdpSelectField options={GENDERS} value={values.gender} onChange={(value) => { setFieldValue('gender', value); setFieldTouched('gender', true, false); }} />
          </Field>
          <Field label="Email" required>
            <TextInput style={[styles.input, styles.disabled]} value={values.email} editable={false} />
          </Field>
          <Field label="Phone Number" required error={err('PhoneNo')}>{textInput('PhoneNo', { keyboardType: 'number-pad' })}</Field>
          <Field label="Primary Phone Type" required error={err('primaryPhoneType')}>
            <IdpSelectField options={PHONE_TYPES} value={values.primaryPhoneType} onChange={(value) => { setFieldValue('primaryPhoneType', value); setFieldTouched('primaryPhoneType', true, false); }} />
          </Field>
          <Field label="Primary Fax" required error={err('primaryFax')}>{textInput('primaryFax', { keyboardType: 'number-pad' })}</Field>
          <Field label="Date of Birth" required error={err('dateOfBirth')}>
            <Pressable style={styles.dateField} onPress={() => setDatePickerOpen(true)}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
              <Text style={[styles.dateText, !dobDay && styles.placeholder]}>{dobDay ? formatDateLabel(dobDay) : 'Select date'}</Text>
            </Pressable>
          </Field>
          <Field label="Age">
            <TextInput style={[styles.input, styles.disabled]} value={values.age} editable={false} />
          </Field>
          <Field label="Address" required error={err('address')}>{textInput('address', { multiline: true })}</Field>
          <Field label="State" required error={err('state') || locationError || undefined}>
            <IdpSelectField searchable loading={loadingStates} options={states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }))} value={values.state} onChange={onStateChange} />
          </Field>
          <Field label="City" required error={err('city')}>
            <IdpSelectField searchable loading={loadingCities} disabled={!values.state} options={cities.map((city) => ({ value: city.cityName, label: city.cityName }))} value={values.city} onChange={(value) => { setFieldValue('city', value); setFieldTouched('city', true, false); }} />
          </Field>
          <Field label="Zip Code" required error={err('zipCode')}>{textInput('zipCode', { keyboardType: 'number-pad' })}</Field>

          {!isNurse ? (
            <Field label="NPI Number" required error={err('npiNumber')}>{textInput('npiNumber', { keyboardType: 'number-pad' })}</Field>
          ) : null}

          <Field label="Specialization" required error={err('specializationName')}>
            <IdpSelectField searchable options={SPECIALIZATIONS} value={values.specializationName} onChange={(value) => { setFieldValue('specializationName', value); setFieldTouched('specializationName', true, false); }} />
          </Field>

          {!isNurse ? (
            <>
              <Pressable style={styles.checkboxRow} onPress={() => onClinicianAddressToggle(!values.isClinicianAddress)}>
                <MaterialCommunityIcons name={values.isClinicianAddress ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={adTokens.primary} />
                <Text style={styles.checkboxLabel}>Is the clinician address the DEA registration address?</Text>
              </Pressable>

              {!values.isClinicianAddress ? (
                <View style={styles.deaBox}>
                  <Text style={styles.deaBoxTitle}>DEA Registration Address</Text>
                  <Field label="Address Line 1" required error={err('deaAddressLine1')}>{textInput('deaAddressLine1')}</Field>
                  <Field label="Address Line 2" error={err('deaAddressLine2')}>{textInput('deaAddressLine2')}</Field>
                  <Field label="State" required error={err('deaState')}>
                    <IdpSelectField searchable loading={loadingStates} options={states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }))} value={values.deaState} onChange={onDeaStateChange} />
                  </Field>
                  <Field label="City" required error={err('deaCity')}>
                    <IdpSelectField searchable loading={loadingDeaCities} disabled={!values.deaState} options={deaCities.map((city) => ({ value: city.cityName, label: city.cityName }))} value={values.deaCity} onChange={(value) => { setFieldValue('deaCity', value); setFieldTouched('deaCity', true, false); }} />
                  </Field>
                  <Field label="Zip Code" required error={err('deaZipCode')}>{textInput('deaZipCode', { keyboardType: 'number-pad' })}</Field>
                </View>
              ) : null}

              <Field label="DEA Number" required error={err('deaNumber')}>{textInput('deaNumber')}</Field>
              <Field label="NADEA Number" error={err('nadeaNumber')}>{textInput('nadeaNumber')}</Field>
              <Field label="NADEA State" error={err('nadeaState')}>
                <IdpSelectField searchable loading={loadingStates} options={states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }))} value={values.nadeaState} onChange={(value) => { setFieldValue('nadeaState', value); setFieldTouched('nadeaState', true, false); }} />
              </Field>
            </>
          ) : null}

          <Field label="Medical Licence Number" required error={err('licenceNumber')}>
            <TextInput style={styles.input} value={values.licenceNumber} onChangeText={(text) => setFieldValue('licenceNumber', text)} onBlur={() => setFieldTouched('licenceNumber', true)} />
          </Field>

          <Field label="Licence File" required error={touched.licenceFile ? errors.licenceFile : undefined}>
            <Pressable style={styles.uploadButton} onPress={pickLicenceFile}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={adTokens.primaryDark} />
              <Text style={styles.uploadButtonText}>{values.licenceFile ? 'Change file' : 'Upload licence file'}</Text>
            </Pressable>
            {values.licenceFile ? <FileRow file={values.licenceFile} onRemove={() => setFieldValue('licenceFile', null)} /> : null}
          </Field>

          {!edit ? (
            <Field label="Qualifications" required error={touched.Qualifications ? errors.Qualifications : undefined}>
              <Pressable style={styles.uploadButton} onPress={pickQualifications}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={16} color={adTokens.primaryDark} />
                <Text style={styles.uploadButtonText}>Upload qualification files</Text>
              </Pressable>
              <Text style={styles.hint}>Supported formats: JPG, PNG, PDF (Max 5MB each)</Text>
              {values.Qualifications.map((file, index) => (
                <FileRow key={`${file.name}-${index}`} file={file} onRemove={() => removeQualification(index)} />
              ))}
            </Field>
          ) : null}

          <Pressable style={[styles.save, isSubmitting && styles.saveOff]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
            <Text style={styles.saveText}>Save Profile</Text>
          </Pressable>
        </ScrollView>

        <DatePickerSheet visible={datePickerOpen} title="Date of Birth" value={dobDay} onSelect={onDobSelect} onClose={() => setDatePickerOpen(false)} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: adTokens.danger },
  logoutText: { fontSize: 13, fontWeight: '700', color: adTokens.danger },
  content: { padding: 16, gap: 14 },

  photoBlock: { alignItems: 'center', gap: 6 },
  photoEdit: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: adTokens.primary, borderWidth: 2, borderColor: adTokens.white, alignItems: 'center', justifyContent: 'center' },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  required: { color: adTokens.danger },
  error: { fontSize: 12.5, color: adTokens.danger },
  hint: { fontSize: 11.5, color: adTokens.textSecondary },
  input: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, fontSize: 14.5, color: adTokens.textPrimary },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  disabled: { backgroundColor: adTokens.gray100, color: adTokens.textSecondary },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border },
  dateText: { flex: 1, fontSize: 14.5, color: adTokens.textPrimary },
  placeholder: { color: adTokens.textMuted },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkboxLabel: { flex: 1, fontSize: 13.5, color: adTokens.textPrimary },
  deaBox: { gap: 12, padding: 14, borderRadius: 12, backgroundColor: adTokens.gray50, borderWidth: 1, borderColor: adTokens.border },
  deaBoxTitle: { fontSize: 14, fontWeight: '800', color: adTokens.textPrimary },

  uploadButton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  uploadButtonText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  fileName: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary },

  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: adTokens.primary, marginTop: 6 },
  saveOff: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: adTokens.white },
});
