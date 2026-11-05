import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFormik } from 'formik';
import { signUpValidationSchema, clinicSetupValidationSchema } from '../../utils/validationSchema';
import { registerUser, verifyRegistrationOtp } from '../../services/registerService';
import { resendResetCode } from '../../services/forgotPasswordService';
import { getStates, getCitiesByStateId } from '../../services/identityProofingService';
import { PASSWORD_MAX_LENGTH } from '../../utils/passwordValidation';
import { colors } from '../../theme/colors';
import { toast } from '../../utils/toast';
import AuthLayout from '../../components/AuthLayout';
import RoleCard from '../../components/RoleCard';
import FormField from '../../components/FormField';
import AuthButton from '../../components/AuthButton';
import OtpVerificationStep from '../../components/OtpVerificationStep';
import { IdpSelectField } from '../../components/identityProofing/IdpUi';

// Port of ROLE_INFO in SignUp/New/CreateAccountForm.jsx
const ROLE_INFO = {
  patient: {
    icon: 'account-heart-outline',
    label: 'Patient',
    desc: 'Book appointments & view records',
    hint: 'Registering as a Patient — access appointments, records & prescriptions',
  },
  doctor: {
    icon: 'stethoscope',
    label: 'Clinician',
    desc: 'Manage patients & consultations',
    hint: 'Registering as a Clinician — set up your practice and start consulting',
  },
};

// roleId / userTypeId the backend expects (web Register.jsx + DoctorType.jsx).
const PATIENT_ROLE_ID = 9;
const FREELANCE_CLINICIAN = { roleId: 8, userTypeId: '1' };
const CLINIC_OWNER = { roleId: 11, userTypeId: '2' };
const DEFAULT_COUNTRY_CODE = '+1';

const PHONE_TYPES = [
  { value: '1', label: 'Beeper' },
  { value: '2', label: 'Cell' },
  { value: '3', label: 'Fax' },
  { value: '4', label: 'Home' },
  { value: '5', label: 'Work' },
  { value: '6', label: 'Night' },
];

const getStateCode = (state) => state?.stateCode ?? state?.StateCode ?? state?.code ?? state?.Code ?? '';
const getStateName = (state) => state?.stateName ?? state?.StateName ?? state?.name ?? state?.Name ?? '';

/**
 * Port of the web's Register.jsx wizard: CreateAccountForm -> (clinicians) DoctorType ->
 * (clinic owners) ClinicSetup -> OTPVerification -> AccountCreated, as one screen with a `step`.
 * Hospital/clinic staff never self-register (web hides Register on org logins), so this is only
 * reachable from the non-org login.
 */
export default function RegisterPage({ navigation, route }) {
  const [step, setStep] = useState('form'); // form | type | clinic | otp | created
  const [activeTab, setActiveTab] = useState(route?.params?.activeTab === 'doctor' ? 'doctor' : 'patient');
  const [accountData, setAccountData] = useState(null); // validated step-1 values, kept for the clinician steps
  const [clinicianType, setClinicianType] = useState(FREELANCE_CLINICIAN);
  const [registered, setRegistered] = useState(null); // { userId, email }
  const [submitting, setSubmitting] = useState(false);

  const goToLogin = () => navigation.navigate('Login');

  const submitRegistration = async (payload) => {
    setSubmitting(true);
    const result = await registerUser(payload);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.message || 'Registration failed. Please try again.');
      return;
    }
    if (result.message) toast.success(result.message);
    setRegistered({ userId: result.data?.userId, email: result.data?.email || payload.email });
    setStep('otp');
  };

  const basePayload = (values, extra) => ({
    FirstName: values.FirstName.trim(),
    LastName: values.LastName.trim(),
    fullName: '',
    email: values.email.trim(),
    phoneNo: values.phoneNo,
    countryCode: DEFAULT_COUNTRY_CODE,
    password: values.password,
    confirmPassword: values.confirmPassword,
    facilityName: '',
    ...extra,
  });

  // ── Step 1: account details ──
  const formik = useFormik({
    initialValues: { FirstName: '', LastName: '', email: '', phoneNo: '', password: '', confirmPassword: '' },
    validationSchema: signUpValidationSchema,
    onSubmit: async (values) => {
      if (activeTab === 'patient') {
        await submitRegistration(basePayload(values, { roleId: PATIENT_ROLE_ID, userTypeId: 1 }));
      } else {
        setAccountData(values);
        setClinicianType(FREELANCE_CLINICIAN);
        setStep('type');
      }
    },
  });

  const fieldError = (name) => (formik.touched[name] ? formik.errors[name] : undefined);
  const info = ROLE_INFO[activeTab];

  const renderForm = () => (
    <>
      <Text style={styles.heading}>Create Account</Text>
      <Text style={styles.desc}>Enter the following details to register</Text>

      <Text style={styles.roleLabel}>I AM REGISTERING AS A</Text>
      <View style={styles.roleCards}>
        {Object.entries(ROLE_INFO).map(([key, role]) => (
          <RoleCard
            key={key}
            icon={role.icon}
            label={role.label}
            description={role.desc}
            active={activeTab === key}
            onPress={() => setActiveTab(key)}
          />
        ))}
      </View>
      <View style={styles.hint}>
        <View style={styles.hintDot} />
        <Text style={styles.hintText}>{info.hint}</Text>
      </View>

      <FormField
        label="First Name"
        required
        icon="user"
        autoCapitalize="words"
        maxLength={35}
        placeholder="First Name"
        value={formik.values.FirstName}
        onChangeText={(v) => formik.setFieldValue('FirstName', v.replace(/[^A-Za-z]/g, ''))}
        onBlur={formik.handleBlur('FirstName')}
        error={fieldError('FirstName')}
      />
      <FormField
        label="Last Name"
        required
        icon="user"
        autoCapitalize="words"
        maxLength={35}
        placeholder="Last Name"
        value={formik.values.LastName}
        onChangeText={(v) => formik.setFieldValue('LastName', v.replace(/[^A-Za-z]/g, ''))}
        onBlur={formik.handleBlur('LastName')}
        error={fieldError('LastName')}
      />
      <FormField
        label="Email Address"
        required
        icon="mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={80}
        placeholder="Email Address"
        value={formik.values.email}
        onChangeText={formik.handleChange('email')}
        onBlur={formik.handleBlur('email')}
        error={fieldError('email')}
      />
      <FormField
        label={`Phone Number (${DEFAULT_COUNTRY_CODE})`}
        required
        icon="phone"
        keyboardType="number-pad"
        maxLength={10}
        placeholder="10-digit phone number"
        value={formik.values.phoneNo}
        onChangeText={(v) => formik.setFieldValue('phoneNo', v.replace(/\D/g, ''))}
        onBlur={formik.handleBlur('phoneNo')}
        error={fieldError('phoneNo')}
      />
      <FormField
        label="Password"
        required
        icon="lock"
        secureToggle
        autoCapitalize="none"
        maxLength={PASSWORD_MAX_LENGTH}
        placeholder="Password"
        value={formik.values.password}
        onChangeText={formik.handleChange('password')}
        onBlur={formik.handleBlur('password')}
        error={fieldError('password')}
      />
      <FormField
        label="Confirm Password"
        required
        icon="lock"
        secureToggle
        autoCapitalize="none"
        maxLength={PASSWORD_MAX_LENGTH}
        placeholder="Confirm Password"
        value={formik.values.confirmPassword}
        onChangeText={formik.handleChange('confirmPassword')}
        onBlur={formik.handleBlur('confirmPassword')}
        error={fieldError('confirmPassword')}
      />

      <AuthButton
        label={activeTab === 'patient' ? `Sign Up as ${info.label}` : 'Next'}
        onPress={formik.handleSubmit}
        loading={submitting}
        disabled={submitting}
      />

      <Pressable style={styles.switchRow} onPress={goToLogin}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <Text style={styles.switchLink}>Sign In</Text>
      </Pressable>
    </>
  );

  const renderTypeStep = () => (
    <>
      <BackLink label="Back to Register" onPress={() => setStep('form')} />
      <Text style={styles.heading}>Clinician Type</Text>
      <Text style={styles.desc}>Choose carefully, this cannot be changed once your profile is created.</Text>

      <TypeCard
        title="I am a freelance clinician"
        subtitle="Freelance clinician who provides services online."
        icon="account-tie"
        active={clinicianType.userTypeId === '1'}
        onPress={() => setClinicianType(FREELANCE_CLINICIAN)}
      />
      <TypeCard
        title="Setup Clinic"
        subtitle="Have own clinic and want to manage those on platform."
        icon="hospital-building"
        active={clinicianType.userTypeId === '2'}
        onPress={() => setClinicianType(CLINIC_OWNER)}
      />

      <AuthButton
        label={clinicianType.userTypeId === '1' ? 'Sign Up' : 'Setup Clinic'}
        loading={submitting}
        disabled={submitting}
        onPress={() => {
          if (clinicianType.userTypeId === '2') {
            setStep('clinic');
            return;
          }
          submitRegistration(basePayload(accountData, clinicianType));
        }}
      />
    </>
  );

  return (
    <AuthLayout hideFooter={step === 'otp' || step === 'created'}>
          {step === 'form' ? renderForm() : null}
          {step === 'type' ? renderTypeStep() : null}
          {step === 'clinic' ? (
            <ClinicSetupStep
              submitting={submitting}
              onBack={() => setStep('type')}
              onSubmit={(clinic) => submitRegistration(basePayload(accountData, { ...clinicianType, ...clinic }))}
            />
          ) : null}
          {step === 'otp' ? (
            <OtpVerificationStep
              email={registered?.email}
              onVerify={(otp) => verifyRegistrationOtp({ userId: registered?.userId, otpNumber: otp })}
              onResend={() => resendResetCode(registered?.email)}
              onVerified={() => setStep('created')}
            />
          ) : null}
          {step === 'created' ? (
            <View style={styles.doneWrap}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.accentDark} />
              <Text style={styles.heading}>Account Created Successfully</Text>
              <Text style={styles.desc}>Congratulations! Your account has been successfully created.</Text>
              <AuthButton label="Continue to Login" onPress={goToLogin} />
            </View>
          ) : null}
    </AuthLayout>
  );
}

function BackLink({ label, onPress }) {
  return (
    <Pressable style={styles.backRow} onPress={onPress}>
      <Feather name="arrow-left" size={16} color={colors.accentDark} />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

function TypeCard({ title, subtitle, icon, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.typeCard, active && styles.typeCardActive]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.typeTitle}>{title}</Text>
        <Text style={styles.typeSub}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name={icon} size={34} color={active ? colors.accentDark : colors.placeholder} />
    </Pressable>
  );
}

// Port of SignUp/New/ClinicSetup.jsx: clinic details for a clinician who is setting up a clinic.
function ClinicSetupStep({ onBack, onSubmit, submitting }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState('');

  const formik = useFormik({
    initialValues: {
      facilityName: '',
      clinicAddress: '',
      clinicState: '',
      clinicCity: '',
      clinicZipCode: '',
      clinicPhoneNumber: '',
      phoneType: '',
      primaryFax: '',
    },
    validationSchema: clinicSetupValidationSchema,
    onSubmit: (values) =>
      onSubmit({
        facilityName: values.facilityName,
        clinicAddress: values.clinicAddress,
        clinicCity: values.clinicCity,
        clinicState: values.clinicState,
        clinicZipCode: values.clinicZipCode,
        clinicPhone: values.clinicPhoneNumber,
        clinicPhoneType: values.phoneType,
        primaryFax: values.primaryFax,
      }),
  });

  useEffect(() => {
    let cancelled = false;
    getStates().then((result) => {
      if (cancelled) return;
      setStates(result.success && Array.isArray(result.data) ? result.data : []);
      if (!result.success) setLocationError('Error loading states. Please try again.');
      setStatesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStateChange = async (stateCode) => {
    formik.setFieldValue('clinicState', stateCode);
    formik.setFieldValue('clinicCity', '');
    formik.setFieldTouched('clinicState', true, false);
    setCities([]);
    setLocationError('');
    const selected = states.find((state) => getStateCode(state) === stateCode);
    if (!selected?.stateId) return;
    setLoadingCities(true);
    const result = await getCitiesByStateId(selected.stateId);
    setLoadingCities(false);
    if (result.success && Array.isArray(result.data)) setCities(result.data);
    else setLocationError('Error loading cities. Please try again.');
  };

  const err = (name) => (formik.touched[name] ? formik.errors[name] : undefined);
  const text = (name, label, icon, extra = {}) => (
    <FormField
      label={label}
      required
      icon={icon}
      placeholder={label}
      value={formik.values[name]}
      onChangeText={(v) => formik.setFieldValue(name, extra.digitsOnly ? v.replace(/\D/g, '') : v)}
      onBlur={formik.handleBlur(name)}
      error={err(name)}
      {...extra.props}
    />
  );

  return (
    <>
      <BackLink label="Back" onPress={onBack} />
      <Text style={styles.heading}>Clinic Setup</Text>
      <Text style={styles.desc}>Tell us about your clinic.</Text>

      {text('facilityName', 'Clinic Name', 'briefcase', { props: { maxLength: 35 } })}
      {text('clinicAddress', 'Clinic Address', 'map-pin', { props: { maxLength: 35 } })}
      <IdpSelectField
        label="Clinic State"
        required
        searchable
        options={states.map((state) => ({ value: getStateCode(state), label: getStateName(state) }))}
        value={formik.values.clinicState}
        loading={!statesLoaded}
        error={err('clinicState') || locationError || undefined}
        onChange={handleStateChange}
      />
      <IdpSelectField
        label="Clinic City"
        required
        searchable
        options={cities.map((city) => ({ value: city.cityName, label: city.cityName }))}
        value={formik.values.clinicCity}
        loading={loadingCities}
        disabled={!formik.values.clinicState}
        error={err('clinicCity')}
        onChange={(city) => {
          formik.setFieldValue('clinicCity', city);
          formik.setFieldTouched('clinicCity', true, false);
        }}
      />
      {text('clinicZipCode', 'Clinic Zip Code', 'hash', {
        digitsOnly: true,
        props: { maxLength: 10, keyboardType: 'number-pad' },
      })}
      {text('clinicPhoneNumber', 'Clinic Phone Number', 'phone', {
        digitsOnly: true,
        props: { maxLength: 25, keyboardType: 'number-pad' },
      })}
      <IdpSelectField
        label="Phone Type"
        required
        options={PHONE_TYPES}
        value={formik.values.phoneType}
        error={err('phoneType')}
        onChange={(value) => {
          formik.setFieldValue('phoneType', value);
          formik.setFieldTouched('phoneType', true, false);
        }}
      />
      {text('primaryFax', 'Primary Fax', 'printer', { props: { maxLength: 25 } })}

      <AuthButton label="Continue" onPress={formik.handleSubmit} loading={submitting} disabled={submitting} />
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 22, lineHeight: 20 },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.roleLabel,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roleCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.hintBg,
    borderWidth: 1,
    borderColor: colors.hintBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  hintDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  hintText: { flex: 1, fontSize: 13.5, color: colors.hintText, lineHeight: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: colors.accentDark, fontSize: 14.5, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 14.5, color: colors.bodyText },
  switchLink: { fontSize: 14.5, color: colors.accentDark, fontWeight: '600' },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.hintBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  typeCardActive: { borderColor: colors.accentDark, backgroundColor: colors.hintBg },
  typeTitle: { fontSize: 16, fontWeight: '700', color: colors.heading, marginBottom: 2 },
  typeSub: { fontSize: 13.5, color: colors.bodyText, lineHeight: 18 },
  doneWrap: { alignItems: 'center', paddingTop: 12 },
});
