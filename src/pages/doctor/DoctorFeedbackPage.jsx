import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import DoctorFeedbackTab from '../../components/doctors/DoctorFeedbackTab';
import { adTokens } from '../../theme/colors';

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/Feedback/ClinicDoctorPatientFeedback.jsx -
 * the route web actually serves under both its "Requests"-adjacent label and sidebar entry
 * "Feedback" (the other route at this path, DoctorFeedback/index.jsx, is dead code on web:
 * routes.jsx declares "feedback" twice under the doctor path and React Router resolves the
 * first match, ClinicDoctorPatientFeedback, every time).
 *
 * A clinic/hospital Doctor Admin has no feedback of their own (same `showClinicAdminFeedback`
 * rule as DoctorsListPage's badge) - they see a hub prompting them to pick a doctor from the
 * Doctors list, where a Feedback tab per-doctor already exists (DoctorDetailModal). Every
 * other doctor role sees their own feedback straight away.
 */
export default function DoctorFeedbackPage({ navigation }) {
  const { profile } = useAuth();
  const roleName = String(profile?.roleName || '').toLowerCase().trim();
  const userType = String(profile?.userType || '').toLowerCase().trim();
  const isClinicAdminHub = roleName === 'doctor admin' && ['clinic', 'hospital'].includes(userType);

  if (isClinicAdminHub) {
    return (
      <View style={styles.hub}>
        <MaterialCommunityIcons name="comment-search-outline" size={40} color={adTokens.textMuted} />
        <Text style={styles.hubTitle}>Select a doctor</Text>
        <Text style={styles.hubText}>
          Feedback is viewed per-doctor. Pick a doctor from the Doctors list to see their ratings and comments.
        </Text>
        <Pressable style={styles.hubButton} onPress={() => navigation.navigate('DoctorsList')}>
          <Text style={styles.hubButtonText}>Go to Doctors</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DoctorFeedbackTab doctorId={profile?.userId} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adTokens.bgBody },
  content: { padding: 14 },
  hub: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, backgroundColor: adTokens.bgBody },
  hubTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginTop: 6 },
  hubText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', lineHeight: 19 },
  hubButton: { marginTop: 10, backgroundColor: adTokens.primary, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 22 },
  hubButtonText: { color: adTokens.white, fontWeight: '700', fontSize: 13.5 },
});
