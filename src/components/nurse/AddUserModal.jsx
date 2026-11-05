import React from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { useUserManagement } from '../../hooks/useUserManagement';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

const VALIDATION_SCHEMA = Yup.object({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phoneNumber: Yup.string().matches(/^[0-9]{10}$/, 'Invalid mobile number').required('Phone number is required'),
  whatsAppNumber: Yup.string().matches(/^[0-9]{10}$/, 'Invalid mobile number').required('WhatsApp number is required'),
});

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
 * Port of AllyDocReactApp/src/components/AddUserModal/index.jsx: the "Add Doctor"/"Add
 * Patient" form (roleId 8 for Doctor, 9 for Patient; roleId 12 when `isDoctorAdmin` is also
 * true - used by the clinic admin's "Doctors" list "+ Add Sub Doctor" action, not by Nurse).
 */
export default function AddUserModal({ visible, isDoctor, isDoctorAdmin = false, onClose, onSuccess }) {
  const bottomSafe = useBottomSafeSpacing();
  const { profile } = useAuth();
  const { createUser } = useUserManagement();

  const formik = useFormik({
    initialValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      isWhatsApp: false,
      whatsAppNumber: '',
    },
    enableReinitialize: true,
    validationSchema: VALIDATION_SCHEMA,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const result = await createUser({
          ...values,
          roleId: isDoctor ? (isDoctorAdmin ? 12 : 8) : 9,
          userId: profile?.userId,
        });
        toast.success(result.message || `${isDoctor ? 'Doctor' : 'Patient'} added successfully.`);
        resetForm();
        onSuccess();
      } catch (message) {
        toast.error(message || `Unable to add ${isDoctor ? 'doctor' : 'patient'}.`);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  const handleWhatsAppToggle = () => {
    const next = !formik.values.isWhatsApp;
    formik.setFieldValue('isWhatsApp', next);
    formik.setFieldValue('whatsAppNumber', next ? formik.values.phoneNumber : '');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={formik.isSubmitting ? undefined : handleClose}
    >
      <Toast />
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: 16 + bottomSafe }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add {isDoctor ? 'Doctor' : 'Patient'}</Text>
              <Text style={styles.subtitle}>
                Enter the {isDoctor ? "doctor's" : "patient's"} details to add them to the system.
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} accessibilityLabel="Close">
              <Feather name="x" size={22} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Field label="First name" required error={formik.touched.firstName && formik.errors.firstName}>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={formik.values.firstName}
                onChangeText={formik.handleChange('firstName')}
                onBlur={formik.handleBlur('firstName')}
              />
            </Field>
            <Field label="Middle name" error={formik.touched.middleName && formik.errors.middleName}>
              <TextInput
                style={styles.input}
                placeholder="Enter middle name"
                value={formik.values.middleName}
                onChangeText={formik.handleChange('middleName')}
                onBlur={formik.handleBlur('middleName')}
              />
            </Field>
            <Field label="Last name" required error={formik.touched.lastName && formik.errors.lastName}>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={formik.values.lastName}
                onChangeText={formik.handleChange('lastName')}
                onBlur={formik.handleBlur('lastName')}
              />
            </Field>
            <Field label="Email" required error={formik.touched.email && formik.errors.email}>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formik.values.email}
                onChangeText={formik.handleChange('email')}
                onBlur={formik.handleBlur('email')}
              />
            </Field>
            <Field label="Phone number" required error={formik.touched.phoneNumber && formik.errors.phoneNumber}>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                maxLength={15}
                value={formik.values.phoneNumber}
                onChangeText={(text) => {
                  formik.setFieldValue('phoneNumber', text);
                  if (formik.values.isWhatsApp) formik.setFieldValue('whatsAppNumber', text);
                }}
                onBlur={formik.handleBlur('phoneNumber')}
              />
            </Field>
            <Field label="WhatsApp number" required error={formik.touched.whatsAppNumber && formik.errors.whatsAppNumber}>
              <TextInput
                style={styles.input}
                placeholder="Enter WhatsApp number"
                keyboardType="phone-pad"
                maxLength={15}
                value={formik.values.whatsAppNumber}
                onChangeText={formik.handleChange('whatsAppNumber')}
                onBlur={formik.handleBlur('whatsAppNumber')}
              />
            </Field>

            <Pressable style={styles.checkboxRow} onPress={handleWhatsAppToggle}>
              <View style={[styles.checkbox, formik.values.isWhatsApp && styles.checkboxChecked]}>
                {formik.values.isWhatsApp ? <Feather name="check" size={12} color={adTokens.white} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>Mark as WhatsApp Number</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.footerButton, styles.cancelButton]} onPress={handleClose} disabled={formik.isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.submitButton, formik.isSubmitting && styles.disabledButton]}
              onPress={formik.handleSubmit}
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.submitButtonText}>Add</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 4, maxWidth: 280 },
  body: { padding: 16, gap: 4 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary, marginBottom: 6 },
  required: { color: adTokens.danger },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: adTokens.textPrimary,
  },
  error: { fontSize: 11.5, color: adTokens.danger, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 20 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: adTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  checkboxLabel: { fontSize: 13, color: adTokens.textPrimary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
  },
  footerButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, minWidth: 90, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  submitButton: { backgroundColor: adTokens.primary },
  disabledButton: { opacity: 0.6 },
  submitButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
