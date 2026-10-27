import * as Yup from 'yup';

// Exact port of loginValidationSchema in AllyDocReactApp/src/components/ValidationSchema.js
export const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .max(80, 'Email must be at most 80 characters')
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(25, 'Password must be at most 25 characters'),
});

export const updatePasswordValidationSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(25, 'Password must be at most 25 characters'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
});

// ── Registration (ports of baseValidationSchema / getSignUpValidationSchema / clinicValidationSchema
// in AllyDocReactApp/src/components/ValidationSchema.js and SignUp/New/ClinicSetup.jsx) ──

const NAME_ONLY_LETTERS_REGEX = /^[A-Za-z]+$/;
const STRICT_EMAIL_REGEX =
  /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

const nameValidation = (label) =>
  Yup.string()
    .trim()
    .required(`${label} is required`)
    .matches(NAME_ONLY_LETTERS_REGEX, 'Name must contain only letters')
    .max(35, 'Maximum 35 characters allowed');

export const signUpValidationSchema = Yup.object().shape({
  FirstName: nameValidation('First name'),
  LastName: nameValidation('Last name'),
  email: Yup.string()
    .trim()
    .max(80, 'Maximum 80 characters allowed')
    .matches(STRICT_EMAIL_REGEX, 'Invalid email')
    .required('Email is required'),
  phoneNo: Yup.string()
    .matches(/^[0-9]{10}$/, 'Invalid mobile number')
    .required('Mobile number is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(25, 'Password must be at most 25 characters')
    .matches(/\d/, 'Password must include at least 1 number')
    .matches(/[a-z]/, 'Password must include at least 1 lowercase letter')
    .matches(/[A-Z]/, 'Password must include at least 1 uppercase letter')
    .matches(/[^A-Za-z0-9]/, 'Password must include at least 1 special character'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
});

export const clinicSetupValidationSchema = Yup.object().shape({
  facilityName: Yup.string()
    .required('Clinic name is required')
    .min(3, 'Clinic name must be at least 3 characters')
    .max(35, 'Clinic name must not exceed 35 characters'),
  clinicAddress: Yup.string()
    .required('Clinic address is required')
    .min(5, 'Clinic address must be at least 5 characters')
    .max(35, 'Clinic address must not exceed 35 characters'),
  clinicState: Yup.string().required('Clinic state is required').max(20, 'Clinic state must not exceed 20 characters'),
  clinicCity: Yup.string().required('Clinic city is required').max(35, 'Clinic city must not exceed 35 characters'),
  clinicZipCode: Yup.string()
    .required('Clinic zip code is required')
    .max(10, 'Clinic zip code must not exceed 10 characters'),
  clinicPhoneNumber: Yup.string()
    .required('Clinic phone number is required')
    .max(25, 'Clinic phone number must not exceed 25 characters'),
  phoneType: Yup.string().required('Phone type is required'),
  primaryFax: Yup.string().required('Primary fax is required').max(25, 'Primary fax must not exceed 25 characters'),
});

// ── Patient profile (port of getPatientProfileValidationSchema in AllyDocReactApp's ValidationSchema.js) ──

const PRIMARY_PHONE_TYPES = ['1', '2', '3', '4', '5', '6'];
const trimToString = (value) => (value === null || value === undefined ? '' : String(value).trim());
const trimToDigitsOnly = (value) => (value === null || value === undefined ? '' : String(value).trim().replace(/\D/g, ''));
const maxChars = (n) => `Maximum ${n} characters allowed`;
const emptyToUndefined = (value, originalValue) => (originalValue === '' || originalValue === null ? undefined : value);

/** Heights / weights are range-checked in the unit picked: height unit 2 = CM (1 = INCH), weight unit 2 = KG (1 = LB). */
export const getPatientProfileValidationSchema = (isUpdate = false) =>
  Yup.object().shape({
    FirstName: Yup.string().transform(trimToString).max(35, maxChars(35)).required('First name is required'),
    MiddleName: Yup.string().transform(trimToString).max(35, maxChars(35)),
    LastName: Yup.string().transform(trimToString).max(35, maxChars(35)).required('Last name is required'),
    phoneNo: Yup.string()
      .transform(trimToDigitsOnly)
      .matches(/^\d+$/, 'Phone number must contain only digits')
      .max(25, maxChars(25))
      .required('Phone number is required'),
    primaryPhoneType: Yup.string()
      .transform((value) => (value === null || value === undefined || value === '' ? '' : String(value)))
      .oneOf(PRIMARY_PHONE_TYPES, 'Select a valid primary phone type')
      .required('Primary phone type is required'),
    DateOfBirth: Yup.date()
      .typeError('Date of Birth is required')
      .required('Date of Birth is required')
      .max(new Date(), 'Date of Birth cannot be in the future'),
    age: Yup.number()
      .transform(emptyToUndefined)
      .typeError('Age must be a valid number')
      .min(0, 'Age must be between 0 and 150')
      .max(150, 'Age must be between 0 and 150')
      .required('Age is required'),
    height: Yup.number()
      .transform(emptyToUndefined)
      .typeError('Height must be a valid number')
      .when('heightMetric', {
        is: '2',
        then: (schema) => schema.min(30, 'Height must be between 30 and 300 cm').max(300, 'Height must be between 30 and 300 cm'),
        otherwise: (schema) => schema.min(12, 'Height must be between 12 and 118 in').max(118, 'Height must be between 12 and 118 in'),
      })
      .required('Height is required'),
    heightMetric: Yup.string().required('Height unit is required'),
    weight: Yup.number()
      .transform(emptyToUndefined)
      .typeError('Weight must be a valid number')
      .when('weightMetric', {
        is: '2',
        then: (schema) => schema.min(1, 'Weight must be between 1 and 300 kg').max(300, 'Weight must be between 1 and 300 kg'),
        otherwise: (schema) => schema.min(2, 'Weight must be between 2 and 660 lb').max(660, 'Weight must be between 2 and 660 lb'),
      })
      .required('Weight is required'),
    weightMetric: Yup.string().required('Weight unit is required'),
    address: Yup.string().transform(trimToString).max(35, maxChars(35)).required('Address is required'),
    state: Yup.string().transform(trimToString).max(50, maxChars(50)).required('State is required'),
    city: Yup.string().transform(trimToString).max(35, maxChars(35)).required('City is required'),
    bloodGroup: Yup.string().required('Please select a blood group'),
    zipCode: Yup.string()
      .transform(trimToDigitsOnly)
      .matches(/^\d+$/, 'Zip code must contain only digits')
      .max(10, maxChars(10))
      .required('Zip code is required'),
    gender: Yup.string().required('Please select a gender'),
    profileImage: isUpdate ? Yup.mixed().notRequired() : Yup.mixed().required('Profile image is required'),
  });
