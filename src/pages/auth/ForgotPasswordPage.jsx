import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { toast } from '../../utils/toast';
import {
  PASSWORD_MAX_LENGTH,
  getPasswordValidationMessage,
} from '../../utils/passwordValidation';
import {
  sendResetCode,
  resendResetCode,
  verifyResetCode,
  resetPassword,
} from '../../services/forgotPasswordService';
import AuthLayout from '../../components/AuthLayout';
import FormField from '../../components/FormField';
import AuthButton from '../../components/AuthButton';
import OtpVerificationStep from '../../components/OtpVerificationStep';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Port of the web's ForgotPassword/index.jsx wizard (SendEmailForm -> OTPVerification ->
 * UpdatePassword -> success), kept as one screen with a `step` state like the web.
 */
export default function ForgotPasswordPage({ navigation }) {
  const [step, setStep] = useState('email'); // email | otp | password | done
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const goBackToLogin = () => navigation.navigate('Login');

  const handleSendCode = async () => {
    setBusy(true);
    setSubmitError('');
    const result = await sendResetCode(email.trim());
    setBusy(false);
    if (!result.success) {
      toast.error(result.message || 'Unable to send verification code.');
      return;
    }
    setUserId(result.data?.id);
    setUserEmail(result.data?.userEmail || email.trim());
    setStep('otp');
    if (result.message) toast.success(result.message);
  };

  const passwordError = password ? getPasswordValidationMessage(password) : '';
  const confirmError = confirmPassword && password !== confirmPassword ? 'Passwords must match' : '';
  const canReset =
    password && confirmPassword && !getPasswordValidationMessage(password) && password === confirmPassword;

  const handleReset = async () => {
    setBusy(true);
    setSubmitError('');
    const result = await resetPassword({ email: userEmail, password, confirmPassword, resetToken });
    setBusy(false);
    if (!result.success) {
      const message = result.message || 'Unable to reset password. Please try again.';
      setSubmitError(message);
      toast.error(message);
      return;
    }
    toast.success(result.message || 'Password reset successfully.');
    setStep('done');
  };

  return (
    <AuthLayout hideFooter>
        {step !== 'done' ? (
          <Pressable style={styles.backRow} onPress={goBackToLogin}>
            <Feather name="arrow-left" size={16} color={colors.accentDark} />
            <Text style={styles.backText}>Back to Login</Text>
          </Pressable>
        ) : null}

        {step === 'email' ? (
          <>
            <Text style={styles.heading}>Forgot Password</Text>
            <Text style={styles.desc}>
              Enter your registered email address to receive a verification code for password reset.
            </Text>
            <FormField
              label="Email address"
              required
              icon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={80}
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
            />
            <AuthButton
              label="Send Verification Code"
              onPress={handleSendCode}
              loading={busy}
              disabled={!EMAIL_REGEX.test(email.trim())}
            />
          </>
        ) : null}

        {step === 'otp' ? (
          <OtpVerificationStep
            email={userEmail}
            onVerify={async (otp) => {
              const result = await verifyResetCode({ id: userId, otpNumber: otp });
              return result.success && !result.raw?.auth_token
                ? { ...result, success: false, message: 'Invalid verification code.' }
                : result;
            }}
            onResend={() => resendResetCode(userEmail)}
            onVerified={(result) => {
              setResetToken(result.raw.auth_token);
              setStep('password');
            }}
          />
        ) : null}

        {step === 'password' ? (
          <>
            <Text style={styles.heading}>Create New Password</Text>
            <Text style={styles.desc}>Please enter your new password and confirm it</Text>
            <FormField
              label="New Password"
              required
              icon="lock"
              secureToggle
              maxLength={PASSWORD_MAX_LENGTH}
              autoCapitalize="none"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              error={passwordError || undefined}
            />
            <FormField
              label="Confirm Password"
              required
              icon="lock"
              secureToggle
              maxLength={PASSWORD_MAX_LENGTH}
              autoCapitalize="none"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmError || undefined}
            />
            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
            <AuthButton
              label="Reset Password"
              onPress={handleReset}
              loading={busy}
              disabled={!canReset}
            />
          </>
        ) : null}

        {step === 'done' ? (
          <View style={styles.doneWrap}>
            <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.accentDark} />
            <Text style={styles.heading}>Password Reset Successfully</Text>
            <Text style={styles.desc}>Your password has been reset successfully!</Text>
            <AuthButton label="Back To Login" onPress={goBackToLogin} />
          </View>
        ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: colors.accentDark, fontSize: 14.5, fontWeight: '500' },
  heading: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 22, lineHeight: 20 },
  submitError: { fontSize: 13, color: colors.dangerText, marginTop: 4, marginBottom: 12 },
  doneWrap: { alignItems: 'center', paddingTop: 12 },
});
