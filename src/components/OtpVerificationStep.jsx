import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { colors } from '../theme/colors';
import { toast } from '../utils/toast';
import OtpInput from './OtpInput';
import AuthButton from './AuthButton';

// Backend OTP validity window (web OTPVerification.jsx): 15 minutes.
const OTP_VALIDITY_SECONDS = 15 * 60;
const OTP_LENGTH = 4;

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Shared "enter the 4-digit code" step (port of the web's OTPVerification.jsx) used by both
 * registration and forgot-password.
 * @param {{
 *   email: string,
 *   onVerify: (otp: string) => Promise<{success:boolean,message?:string}>,
 *   onResend: () => Promise<{success:boolean,message?:string}>,
 *   onVerified: (result: object) => void,
 * }} props
 */
export default function OtpVerificationStep({ email, onVerify, onResend, onVerified }) {
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(OTP_VALIDITY_SECONDS);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleVerify = async () => {
    setBusy(true);
    const result = await onVerify(otp);
    setBusy(false);
    if (!result.success) {
      toast.error(result.message || 'Invalid verification code.');
      return;
    }
    if (result.message) toast.success(result.message);
    onVerified(result);
  };

  const handleResend = async () => {
    setBusy(true);
    const result = await onResend();
    setBusy(false);
    if (result.success) {
      toast.success(result.message || 'OTP sent successfully');
      setResendTimer(OTP_VALIDITY_SECONDS);
    } else {
      toast.error(result.message || 'Failed to resend OTP');
    }
  };

  return (
    <>
      <Text style={styles.heading}>Verify Your Account</Text>
      <Text style={styles.desc}>
        Enter the {OTP_LENGTH}-digit code we sent to {email}
      </Text>
      <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} />
      <AuthButton label="Verify" onPress={handleVerify} loading={busy} disabled={otp.length < OTP_LENGTH} />
      <View style={styles.resendRow}>
        {resendTimer > 0 ? (
          <Text style={styles.resendHint}>Resend code in {formatTime(resendTimer)}</Text>
        ) : (
          <Pressable onPress={handleResend} disabled={busy}>
            <Text style={styles.resendLink}>Resend code</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 22, lineHeight: 20 },
  resendRow: { alignItems: 'center', marginTop: 16 },
  resendHint: { fontSize: 14, color: colors.bodyText },
  resendLink: { fontSize: 14.5, color: colors.accentDark, fontWeight: '600' },
});
