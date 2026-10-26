/** Exact port of AllyDocReactApp/src/utils/passwordValidation.js. */
export const PASSWORD_MAX_LENGTH = 25;
export const PASSWORD_MAX_LENGTH_MSG = 'Password must be at most 25 characters';

export function getPasswordRulesStatus(password) {
  const value = String(password || '');
  return {
    minLength: value.length >= 8,
    hasNumber: /\d/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasUppercase: /[A-Z]/.test(value),
    hasSpecialChar: /[^A-Za-z0-9]/.test(value),
  };
}

export function getPasswordStrength(password) {
  const rules = getPasswordRulesStatus(password);
  const score = Object.values(rules).filter(Boolean).length;
  if (!password) return { label: '', color: '#E5E7EB', score: 0 };

  if (score <= 2) return { label: 'Easy', color: '#EF4444', score };
  if (score <= 4) return { label: 'Medium', color: '#F59E0B', score };
  return { label: 'Strong', color: '#10B981', score };
}

export function isPasswordValid(value) {
  const rules = getPasswordRulesStatus(value);
  return Object.values(rules).every(Boolean);
}

export function getPasswordValidationMessage(value) {
  if (!value) return 'Password is required';
  if (value.length > PASSWORD_MAX_LENGTH) return PASSWORD_MAX_LENGTH_MSG;
  if (value.length < 8) return 'Password must be at least 8 characters';
  const rules = getPasswordRulesStatus(value);
  if (!rules.hasNumber) return 'Password must contain at least 1 number';
  if (!rules.hasLowercase) return 'Password must contain at least 1 lowercase letter';
  if (!rules.hasUppercase) return 'Password must contain at least 1 uppercase letter';
  if (!rules.hasSpecialChar) return 'Password must contain at least 1 special character';
  return '';
}
