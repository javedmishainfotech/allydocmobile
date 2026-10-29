import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useNursePendingAppointments } from '../../hooks/useNursePendingAppointments';
import { getAppointmentDisplay } from '../../utils/formatAppointmentDate';
import StatusBadge from '../StatusBadge';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

function getDoctorDisplayName(doctor) {
  if (!doctor) return '';
  return (
    [doctor.firstName, doctor.middleName, doctor.lastName].filter(Boolean).join(' ').trim() ||
    doctor.fullName ||
    doctor.name ||
    'Doctor'
  );
}

/**
 * Port of AllyDocReactApp/src/module/Nurse/PendingAppointments/AssignDoctorModal.jsx: loads
 * available doctors for the appointment, lets the nurse pick one, shows a live assignment
 * summary once picked, and submits via `/AppointmentAccept`.
 */
export default function AssignDoctorModal({ visible, appointment, onClose, onAssigned }) {
  const appointmentId = appointment?.appointmentId;
  const {
    availableDoctors: doctorList,
    doctorsStatus,
    assigning: submitting,
    loadAvailableDoctors,
    assignDoctor,
    resetAvailableDoctors,
  } = useNursePendingAppointments();
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const isLoading = doctorsStatus === 'loading';

  useEffect(() => {
    if (!visible || !appointmentId) return;
    setSelectedDoctorId(null);
    resetAvailableDoctors();
    loadAvailableDoctors(appointmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, appointmentId]);

  const selectedDoctor = useMemo(
    () => doctorList.find((doctor) => String(doctor.userId) === String(selectedDoctorId)) || null,
    [doctorList, selectedDoctorId],
  );

  const patientName = appointment?.name?.trim() || 'Patient';
  const consultReason = appointment?.consultReason || null;
  const appointmentStatus = appointment?.appointmentStatus || null;
  const display = getAppointmentDisplay(appointment);
  const apptDateTime = display.instantMs ? `${display.date} ${display.timeWithZone}` : '-';

  const handleSubmit = async () => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor.');
      return;
    }
    try {
      const result = await assignDoctor(appointmentId, selectedDoctorId);
      toast.success(result.message || 'Doctor assigned successfully.');
      onAssigned();
    } catch (message) {
      toast.error(message || 'Unable to assign doctor.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={submitting ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Doctor</Text>
            <Pressable onPress={onClose} disabled={submitting} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.patientRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patientName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.patientName}>{patientName}</Text>
                <Text style={styles.metaText}>Consult reason: {consultReason || '-'}</Text>
                {appointmentStatus ? <StatusBadge status={appointmentStatus} /> : null}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Please select a doctor for this appointment</Text>

            {isLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : doctorList.length === 0 ? (
              <Text style={styles.emptyText}>No doctors are currently available for this slot.</Text>
            ) : (
              <View style={styles.doctorList}>
                {doctorList.map((doctor) => {
                  const isSelected = String(doctor.userId) === String(selectedDoctorId);
                  const specialization = doctor.specializationName || doctor.specialization;
                  return (
                    <Pressable
                      key={doctor.userId}
                      style={[styles.doctorRow, isSelected && styles.doctorRowSelected]}
                      onPress={() => setSelectedDoctorId(doctor.userId)}
                    >
                      <View style={styles.radioOuter}>{isSelected ? <View style={styles.radioInner} /> : null}</View>
                      <View style={styles.flex1}>
                        <Text style={styles.doctorName}>{getDoctorDisplayName(doctor)}</Text>
                        {specialization ? <Text style={styles.metaText}>{specialization}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedDoctor ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Assignment summary</Text>
                <SummaryRow label="Selected doctor" value={getDoctorDisplayName(selectedDoctor)} />
                <SummaryRow label="Patient" value={patientName} />
                <SummaryRow label="Consult reason" value={consultReason || '-'} />
                <SummaryRow label="Appointment date & time" value={apptDateTime} />
                <Text style={styles.summaryNote}>
                  You are going to assign this appointment for <Text style={styles.bold}>{patientName}</Text>
                  {apptDateTime !== '-' ? (
                    <>
                      {' '}
                      on <Text style={styles.bold}>{apptDateTime}</Text>
                    </>
                  ) : null}{' '}
                  to <Text style={styles.bold}>{getDoctorDisplayName(selectedDoctor)}</Text>.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.footerButton, styles.cancelButton]} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.submitButton, (isLoading || !doctorList.length) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading || submitting || !doctorList.length}
            >
              {submitting ? (
                <ActivityIndicator size={14} color={adTokens.white} />
              ) : (
                <Text style={styles.submitButtonText}>Assign Doctor</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.metaText}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: adTokens.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { padding: 16, gap: 12 },
  flex1: { flex: 1 },
  patientRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: adTokens.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: adTokens.textSecondary },
  patientName: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  metaText: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginTop: 4 },
  loader: { marginVertical: 16 },
  emptyText: { fontSize: 13, color: adTokens.textSecondary },
  doctorList: { gap: 8 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  doctorRowSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: adTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: adTokens.primary },
  doctorName: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  summaryCard: { backgroundColor: adTokens.gray50, borderRadius: 10, padding: 12, gap: 6 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryValue: { fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, flexShrink: 1, textAlign: 'right' },
  summaryNote: { fontSize: 12, color: adTokens.textSecondary, marginTop: 4, lineHeight: 17 },
  bold: { fontWeight: '700', color: adTokens.textPrimary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
  },
  footerButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, minWidth: 90, alignItems: 'center' },
  cancelButton: { borderWidth: 1, borderColor: adTokens.border },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: adTokens.textSecondary },
  submitButton: { backgroundColor: adTokens.primary },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
