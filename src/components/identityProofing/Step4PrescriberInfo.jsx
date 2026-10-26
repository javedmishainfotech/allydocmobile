import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useIdentityProofing } from './IdentityProofingContext';
import { IdpScreen, IdpButton, IdpCheckbox, IdpLoading, IdpTextField, IdpSelectField, idpColors } from './IdpUi';
import AttemptModal from './AttemptModal';
import { createIdp, getStates, getCitiesByStateId } from '../../services/identityProofingService';
import { getItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const MAX_ATTEMPT = 3;

const getStateCode = (state) => state?.stateCode ?? state?.StateCode ?? state?.code ?? state?.Code ?? '';
const getStateName = (state) => state?.stateName ?? state?.StateName ?? state?.name ?? state?.Name ?? '';

const resolveStateCode = (value, states = []) => {
  const rawValue = value === null || value === undefined ? '' : String(value).trim();
  if (!rawValue) return '';
  const matched = states.find((state) => {
    const code = String(getStateCode(state)).trim().toLowerCase();
    const name = String(getStateName(state)).trim().toLowerCase();
    return code === rawValue.toLowerCase() || name === rawValue.toLowerCase();
  });
  return getStateCode(matched) || rawValue;
};

const formatDateToYYYYMMDD = (date) => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  const dateObj = date instanceof Date ? date : typeof date === 'string' ? new Date(date) : null;
  if (!dateObj || Number.isNaN(dateObj.getTime())) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** As the user types digits, lays them out as YYYY-MM-DD. */
const maskDateInput = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

const digitsOnly = (text, max) => text.replace(/\D/g, '').slice(0, max);

/** Normalises a stored phone (may carry a leading country code / formatting) to the 10-digit US number the form edits. */
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 && digits.startsWith('1') ? digits.slice(1, 11) : digits.slice(0, 10);
};

/**
 * Mobile equivalent of web's saveStep4FormDataToLocalStorage: the login
 * response is persisted key-by-key in storage (see authSlice.loginUser), so
 * the prescriber's details are read back from there (handling the same API
 * key typos: middleNmae / lastNmae).
 */
async function loadStoredPrescriberData() {
  const keys = [
    'firstName', 'firstname', 'middleNmae', 'middlename', 'middleName', 'MiddleName',
    'lastName', 'lastNmae', 'lastname', 'phoneNumber', 'phoneNo', 'dateOfBirth',
    'address', 'city', 'state', 'zipCode',
  ];
  const entries = await Promise.all(keys.map(async (key) => [key, (await getItem(key)) || '']));
  const raw = Object.fromEntries(entries);

  let dateOfBirth = '';
  if (raw.dateOfBirth) {
    const parsed = new Date(raw.dateOfBirth);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
      dateOfBirth = formatDateToYYYYMMDD(parsed);
    }
  }

  return {
    firstName: raw.firstName || raw.firstname || '',
    middleName: raw.middleNmae || raw.middlename || raw.MiddleName || raw.middleName || '',
    lastName: raw.lastName || raw.lastNmae || raw.lastname || '',
    phoneNumber: raw.phoneNumber || raw.phoneNo || '',
    dateOfBirth,
    address: raw.address || '',
    city: raw.city || '',
    state: raw.state || '',
    zipCode: raw.zipCode || '',
  };
}

const today = new Date();
const minDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

const validationSchema = Yup.object().shape({
  firstName: Yup.string().trim().min(2, 'Too short').required('Required'),
  middleName: Yup.string().trim().nullable(),
  lastName: Yup.string().trim().min(2, 'Too short').required('Required'),
  dateOfBirth: Yup.date()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError('Enter a valid date (YYYY-MM-DD)')
    .required('Required')
    .max(minDob, 'You must be at least 18 years old'),
  phoneNumber: Yup.string().required('Required').matches(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  address: Yup.string().trim().required('Required'),
  city: Yup.string().trim().required('Required'),
  state: Yup.string().trim().required('Required'),
  zipCode: Yup.string().required('Required').matches(/^[0-9]{4,12}$/, 'Zip should be numeric (4-12 digits)'),
  socialSecurityNumber: Yup.string().required('Required').matches(/^[0-9]{9}$/, 'SSN must be exactly 9 digits'),
  creditCardNumber: Yup.string().trim().required('Required'),
});

/** Port of components/IdentityProofing/Step4PrescriberInfo.jsx. */
export default function Step4PrescriberInfo() {
  const {
    formData,
    updateFormData,
    cancelFlow,
    goToOverview,
    goToFacialSteps,
    navigate,
    updateIdpStatus,
    updateIdpAttemptCount,
    updateIdpStepCount,
  } = useIdentityProofing();

  const [stored, setStored] = useState(null);
  const [states, setStates] = useState([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [stateError, setStateError] = useState('');
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState('');
  const [otpAgreement, setOtpAgreement] = useState(false);
  const [attemptModal, setAttemptModal] = useState(null);

  const fetchCities = async (stateList, stateCode) => {
    const selected = stateList.find((state) => getStateCode(state) === stateCode);
    if (!selected?.stateId) return { list: [], failed: false };
    const result = await getCitiesByStateId(selected.stateId);
    return result.success && Array.isArray(result.data)
      ? { list: result.data, failed: false }
      : { list: [], failed: true };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [data, statesResult] = await Promise.all([loadStoredPrescriberData(), getStates()]);
      if (cancelled) return;

      const stateList = statesResult.success && Array.isArray(statesResult.data) ? statesResult.data : [];
      // A state prefilled from login needs its city list up front.
      const prefillState = resolveStateCode(formData.state || data.state, stateList);
      const prefillCities = prefillState ? await fetchCities(stateList, prefillState) : { list: [], failed: false };
      if (cancelled) return;

      setStored(data);
      setStates(stateList);
      if (!statesResult.success || !Array.isArray(statesResult.data)) {
        setStateError('Error loading states. Please try again.');
      }
      setCities(prefillCities.list);
      if (prefillCities.failed) setCityError('Error loading cities. Please try again.');
      setStatesLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount: the form's initial values are fixed from what is loaded here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCitiesForState = async (stateCode) => {
    setLoadingCities(true);
    setCityError('');
    const { list, failed } = await fetchCities(states, stateCode);
    setCities(list);
    if (failed) setCityError('Error loading cities. Please try again.');
    setLoadingCities(false);
  };

  const initialValues = useMemo(() => {
    if (!stored) return null;
    // formData (kept in memory across retries) wins over what login stored.
    return {
      firstName: formData.firstName || stored.firstName,
      middleName: formData.middleName || stored.middleName,
      lastName: formData.lastName || stored.lastName,
      dateOfBirth: formatDateToYYYYMMDD(formData.dateOfBirth || stored.dateOfBirth),
      phoneNumber: normalizePhone(formData.phoneNumber || stored.phoneNumber),
      address: formData.address || formData.homeAddress || stored.address,
      city: formData.city || stored.city,
      state: resolveStateCode(formData.state || stored.state, states),
      zipCode: formData.zipCode || stored.zipCode,
      socialSecurityNumber: formData.socialSecurityNumber || '',
      creditCardNumber: formData.creditCardNumber || '',
    };
    // Computed once the stored data and the states list are both in; later edits must not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, statesLoaded]);

  // Prefilled values from login are read-only; empty ones stay editable. Phone is always editable.
  const isLocked = (field) => !!(stored && String(stored[field] || '').trim() !== '');
  const isAddressLocked = () => isLocked('address') && !formData.address && !formData.homeAddress;

  const showAttemptModal = (options) => setAttemptModal(options);
  const closeAttemptModal = () => {
    setAttemptModal(null);
    goToOverview();
  };

  const buildPayload = (values) => ({
    firstName: values.firstName?.trim() || '',
    middleName: values.middleName?.trim() || '',
    lastName: values.lastName?.trim() || '',
    homeAddress: values.address?.trim() || '',
    city: values.city?.trim() || '',
    state: resolveStateCode(values.state, states),
    zipCode: values.zipCode?.trim() || '',
    dateOfBirth: formatDateToYYYYMMDD(values.dateOfBirth),
    socialSecurityNumber: values.socialSecurityNumber?.trim() || '',
    creditCardNumber: values.creditCardNumber?.trim() || '',
    phoneNumber: values.phoneNumber?.trim() || '',
    isMobileNumber: true,
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    const payload = buildPayload(values);

    const result = await createIdp(payload);
    const body = result.raw;

    if (!body) {
      toast.error(result.message || 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
      return;
    }

    updateFormData(payload);

    const questions = body.Questions || body.questions;
    const answers = body.Answers || body.answers;
    const sessionID = body.SessionID || body.sessionID || '';
    const idCapture = body.IDCapture ?? body.idCapture;
    const resultCode = body.result?.resultCode || body.resultCode;
    const errorMessage = body.result?.resultDescription || body.message || '';
    const isMaxAttemptsError = errorMessage.includes('Clinician has attempted Identity Proofing too many times');

    if (
      Array.isArray(questions) && questions.length > 0 &&
      Array.isArray(answers) && answers.length > 0 &&
      idCapture === false
    ) {
      navigate('questionnaire', { questions, answers, sessionID });
    } else if (!questions && !answers && idCapture === true && sessionID) {
      await updateIdpStatus('Pending', true);
      goToFacialSteps();
    } else if (resultCode === 'ERROR' && isMaxAttemptsError) {
      await updateIdpAttemptCount(MAX_ATTEMPT, true);
      await updateIdpStatus('IDPError', true);
      await updateIdpStepCount(0, true);
      showAttemptModal({
        attempt: MAX_ATTEMPT,
        type: 'Warning',
        header: 'Attempt 3 – Maximum Attempts Reached',
        content: 'You have reached the maximum number of attempts. Please contact your administrator to continue.',
      });
    } else if (resultCode === 'ERROR') {
      toast.error(errorMessage || 'An unexpected error occurred. Please try again.');
    } else if (!result.success) {
      toast.error(body.title || result.message || 'An unexpected error occurred. Please try again.');
    }

    setSubmitting(false);
  };

  if (!initialValues) {
    return (
      <IdpScreen>
        <IdpLoading label="Loading your information..." />
      </IdpScreen>
    );
  }

  const stateOptions = states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }));
  const cityOptions = cities.map((city) => ({ value: city.cityName, label: city.cityName }));

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, setFieldTouched, handleSubmit: submit, isSubmitting }) => {
          const err = (field) => (touched[field] && errors[field] ? errors[field] : undefined);

          return (
            <IdpScreen
              footer={
                <>
                  <IdpButton label="Cancel" variant="outline-danger" onPress={cancelFlow} disabled={isSubmitting} />
                  <IdpButton
                    label="Save & Next"
                    variant="success"
                    onPress={submit}
                    disabled={!otpAgreement}
                    loading={isSubmitting}
                    flex
                  />
                </>
              }
            >
              <Text style={styles.heading}>Confirm Prescriber Information</Text>
              <Text style={styles.intro}>
                To complete the identity proofing process, please confirm/complete in the following information below.
              </Text>

              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={20} color={idpColors.infoText} />
                <Text style={styles.infoText}>
                  Sensitive personal information such as social security, credit cards, etc. are used solely for the
                  identity proofing purposes. We do not retain this data at DoseSpot.
                </Text>
              </View>

              <IdpTextField
                label="Legal First Name"
                required
                placeholder="Enter First Name"
                value={values.firstName}
                onChangeText={handleChange('firstName')}
                onBlur={handleBlur('firstName')}
                disabled={isLocked('firstName')}
                autoCapitalize="words"
                error={err('firstName')}
              />
              <IdpTextField
                label="Legal Middle Name"
                placeholder="Enter Middle Name"
                value={values.middleName}
                onChangeText={handleChange('middleName')}
                onBlur={handleBlur('middleName')}
                disabled={isLocked('middleName')}
                autoCapitalize="words"
                error={err('middleName')}
              />
              <IdpTextField
                label="Legal Last Name"
                required
                placeholder="Enter Last Name"
                value={values.lastName}
                onChangeText={handleChange('lastName')}
                onBlur={handleBlur('lastName')}
                disabled={isLocked('lastName')}
                autoCapitalize="words"
                error={err('lastName')}
              />

              <IdpTextField
                label="Phone Number"
                required
                prefix="+1"
                placeholder="10-digit phone number"
                keyboardType="phone-pad"
                maxLength={10}
                value={values.phoneNumber}
                onChangeText={(text) => setFieldValue('phoneNumber', digitsOnly(text, 10))}
                onBlur={handleBlur('phoneNumber')}
                error={err('phoneNumber')}
              />
              <IdpTextField
                label="Date of Birth"
                required
                placeholder="YYYY-MM-DD"
                keyboardType="number-pad"
                maxLength={10}
                value={values.dateOfBirth}
                onChangeText={(text) => setFieldValue('dateOfBirth', maskDateInput(text))}
                onBlur={handleBlur('dateOfBirth')}
                disabled={isLocked('dateOfBirth')}
                error={err('dateOfBirth')}
              />
              <IdpTextField
                label="Address"
                required
                placeholder="Enter Address"
                value={values.address}
                onChangeText={handleChange('address')}
                onBlur={handleBlur('address')}
                disabled={isAddressLocked()}
                autoCapitalize="words"
                error={err('address')}
              />

              <IdpSelectField
                label="State"
                required
                searchable
                options={stateOptions}
                value={values.state}
                loading={!statesLoaded}
                disabled={isLocked('state')}
                error={err('state') || stateError || undefined}
                onChange={(code) => {
                  setFieldValue('state', code);
                  setFieldValue('city', '');
                  setCities([]);
                  setFieldTouched('state', true, false);
                  loadCitiesForState(code);
                }}
              />
              <IdpSelectField
                label="City"
                required
                searchable
                options={cityOptions}
                value={values.city}
                loading={loadingCities}
                disabled={isLocked('city') || !values.state}
                error={err('city') || cityError || undefined}
                onChange={(city) => {
                  setFieldValue('city', city);
                  setFieldTouched('city', true, false);
                }}
              />
              <IdpTextField
                label="Zip Code"
                required
                placeholder="Zip Code"
                keyboardType="number-pad"
                maxLength={12}
                value={values.zipCode}
                onChangeText={handleChange('zipCode')}
                onBlur={handleBlur('zipCode')}
                disabled={isLocked('zipCode')}
                error={err('zipCode')}
              />

              <IdpTextField
                label="Social Security Number"
                required
                secureToggle
                placeholder="Enter your SSN"
                keyboardType="number-pad"
                maxLength={9}
                value={values.socialSecurityNumber}
                onChangeText={(text) => setFieldValue('socialSecurityNumber', digitsOnly(text, 9))}
                onBlur={handleBlur('socialSecurityNumber')}
                error={err('socialSecurityNumber')}
              />
              <IdpTextField
                label="Credit Card Number"
                required
                secureToggle
                placeholder="Enter your Credit Card Number"
                keyboardType="number-pad"
                value={values.creditCardNumber}
                onChangeText={(text) => setFieldValue('creditCardNumber', digitsOnly(text, 19))}
                onBlur={handleBlur('creditCardNumber')}
                error={err('creditCardNumber')}
              />

              <IdpCheckbox checked={otpAgreement} onChange={setOtpAgreement}>
                By checking this inbox, I agree to receive the SMS on the registered phone number from the Experian to
                complete the IDP Facial recognition process.
              </IdpCheckbox>
            </IdpScreen>
          );
        }}
      </Formik>
      <AttemptModal options={attemptModal} onClose={closeAttemptModal} />
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '700', color: adTokens.textPrimary },
  intro: { fontSize: 14, lineHeight: 20, color: adTokens.textSecondary, marginTop: 6, marginBottom: 14 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 18,
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 5,
    borderLeftColor: '#4670ee',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#000' },
});
