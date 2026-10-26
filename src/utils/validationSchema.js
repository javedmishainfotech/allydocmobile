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
