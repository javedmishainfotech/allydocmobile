import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useFormik } from 'formik';
import { updatePasswordValidationSchema } from '../../utils/validationSchema';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';
import { toast } from '../../utils/toast';
import AuthLayout from '../../components/AuthLayout';
import FormField from '../../components/FormField';
import AuthButton from '../../components/AuthButton';

export default function UpdateTempPasswordPage() {
  const { setNewPassword } = useAuth();
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: { newPassword: '', confirmPassword: '' },
    validationSchema: updatePasswordValidationSchema,
    onSubmit: async (values) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        const result = await setNewPassword(values);
        if (result?.meta?.requestStatus === 'rejected') {
          const message = result.payload || 'Unable to update password.';
          setSubmitError(message);
          toast.error(message);
        } else {
          toast.success(result.payload?.message || 'Password updated successfully.');
        }
        // On success, RootNavigator reacts to isTempPassword flipping to
        // false and routes to the role dashboard automatically.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <AuthLayout>
        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.desc}>
          Your account was created with a temporary password. Please set a new one to continue.
        </Text>

        <FormField
          label="New password"
          required
          icon="lock"
          secureToggle
          maxLength={25}
          placeholder="Enter new password"
          value={formik.values.newPassword}
          onChangeText={formik.handleChange('newPassword')}
          onBlur={formik.handleBlur('newPassword')}
          error={formik.touched.newPassword ? formik.errors.newPassword : undefined}
        />

        <FormField
          label="Confirm password"
          required
          icon="lock"
          secureToggle
          maxLength={25}
          placeholder="Confirm new password"
          value={formik.values.confirmPassword}
          onChangeText={formik.handleChange('confirmPassword')}
          onBlur={formik.handleBlur('confirmPassword')}
          error={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
        />

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <AuthButton
          label="Update password"
          onPress={formik.handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !formik.isValid}
        />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', color: colors.heading, marginBottom: 6 },
  desc: { fontSize: 14.5, color: colors.bodyText, marginBottom: 22, lineHeight: 20 },
  submitError: { fontSize: 13, color: colors.dangerText, marginTop: 4, marginBottom: 12 },
});
