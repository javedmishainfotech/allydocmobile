import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfileTab from '../settings/ProfileTab';
import DoctorAppointmentsTab from './DoctorAppointmentsTab';
import DoctorTreatmentPlansTab from './DoctorTreatmentPlansTab';
import DoctorFeedbackTab from './DoctorFeedbackTab';
import { adTokens } from '../../theme/colors';

/**
 * Port of AllyDocReactApp's DoctorProfile.jsx + its sibling standalone sub-pages
 * (DoctorAppointmentList.jsx / DoctorTreatmentPlansList.jsx / ClinicDoctorPatientFeedback.jsx) -
 * on web these are separate routes, but they're the same data/behavior as this doctor's detail
 * tabs, so one tabbed screen covers all of them here (same pattern as PatientDetailModal.jsx).
 */
export default function DoctorDetailModal({ visible, doctorId, doctorName, showFeedback, onClose }) {
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { key: 'personal', label: 'Profile' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'treatmentPlans', label: 'Treatment Plans' },
    ...(showFeedback ? [{ key: 'feedback', label: 'Feedback' }] : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={adTokens.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.title}>Doctor Profile</Text>
            {doctorName ? <Text style={styles.subtitle}>Dr. {doctorName}</Text> : null}
          </View>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {activeTab === 'personal' ? <ProfileTab userId={doctorId} /> : null}
          {activeTab === 'appointments' ? <DoctorAppointmentsTab doctorId={doctorId} /> : null}
          {activeTab === 'treatmentPlans' ? <DoctorTreatmentPlansTab doctorId={doctorId} /> : null}
          {activeTab === 'feedback' && showFeedback ? <DoctorFeedbackTab doctorId={doctorId} /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  subtitle: { fontSize: 12, color: adTokens.textSecondary, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: adTokens.border },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: adTokens.primary },
  tabLabel: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  tabLabelActive: { color: adTokens.primaryDark },
  body: { padding: 16 },
});
