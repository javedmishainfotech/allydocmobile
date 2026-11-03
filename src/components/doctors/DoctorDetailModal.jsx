import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import ProfileTab from '../settings/ProfileTab';
import DoctorAppointmentsTab from './DoctorAppointmentsTab';
import DoctorTreatmentPlansTab from './DoctorTreatmentPlansTab';
import DoctorFeedbackTab from './DoctorFeedbackTab';
import SegmentedTabs from '../ui/SegmentedTabs';
import { adTokens, colors } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Port of AllyDocReactApp's DoctorProfile.jsx + its sibling standalone sub-pages
 * (DoctorAppointmentList.jsx / DoctorTreatmentPlansList.jsx / ClinicDoctorPatientFeedback.jsx) -
 * on web these are separate routes, but they're the same data/behavior as this doctor's detail
 * tabs, so one tabbed screen covers all of them here (same pattern as PatientDetailModal.jsx).
 */
export default function DoctorDetailModal({ visible, doctorId, doctorName, showFeedback, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { key: 'personal', label: 'Profile' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'treatmentPlans', label: 'Treatment Plans' },
    ...(showFeedback ? [{ key: 'feedback', label: 'Feedback' }] : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Toast />
      <View style={styles.container}>
        <LinearGradient
          colors={colors.authGradient}
          locations={[0, 0.4, 1]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.title}>Doctor Profile</Text>
            {doctorName ? <Text style={styles.subtitle}>Dr. {doctorName}</Text> : null}
          </View>
        </LinearGradient>

        <SegmentedTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} style={styles.tabBar} />

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 16 + bottomSafe }]}>
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
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { margin: 16, marginBottom: 0 },
  body: { padding: 16 },
});
