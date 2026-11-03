import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import PatientPersonalInfoTab from './PatientPersonalInfoTab';
import PatientAppointmentsTab from './PatientAppointmentsTab';
import CoverageTab from './CoverageTab';
import MedicationHistoryTab from './MedicationHistoryTab';
import MedicationHistoryConsentModal from './MedicationHistoryConsentModal';
import SelfReportedMedicationsTab from './SelfReportedMedicationsTab';
import AllergiesTab from './AllergiesTab';
import RxChangeTab from './RxChangeTab';
import RefillsTab from './RefillsTab';
import PrescriptionsTab from './PrescriptionsTab';
import PatientDetailTabBar from './PatientDetailTabBar';
import { consentToMedicationHistory } from '../../services/doseSpotClinicalService';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Port of AllyDocReactApp's ViewPatientPage.jsx. The web version uses a
 * ?tab= query param with its own route; mobile models it as a full-screen
 * Modal (same pattern as the other detail views in this app) with local tab
 * state instead of nested routes.
 *
 * Every DoseSpot-keyed tab (Allergies/Coverage/Self Reported/RxChange/
 * Refills/Medication History) needs the patient's DoseSpot id, which only
 * arrives after PatientPersonalInfoTab's own /UserDetails fetch resolves -
 * `doseSpotPatientId` is lifted here via `onDoseSpotIdResolved` so every tab
 * shares the one fetch instead of each one re-deriving it.
 */
export default function PatientDetailModal({ visible, patientId, patientName, initialTab = 'personal', onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [doseSpotPatientId, setDoseSpotPatientId] = useState(null);
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [isConsenting, setIsConsenting] = useState(false);

  const handleTabPress = (tabKey) => {
    // Medication History always re-confirms consent before loading - no
    // persisted "already consented" state, matching web exactly.
    if (tabKey === 'history') {
      setConsentModalVisible(true);
      return;
    }
    setActiveTab(tabKey);
  };

  const handleConsentConfirm = async () => {
    setIsConsenting(true);
    const response = await consentToMedicationHistory(doseSpotPatientId);
    setIsConsenting(false);
    if (response.success) {
      setConsentModalVisible(false);
      setActiveTab('history');
    } else {
      toast.error(response.message || 'Unable to record consent.');
    }
  };

  const needsDoseSpotId = ['allergies', 'coverage', 'selfreported', 'rxchange', 'refills', 'history', 'prescriptions'].includes(activeTab);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Toast />
        <LinearGradient
          colors={colors.authGradient}
          locations={[0, 0.4, 1]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <Pressable onPress={onClose} hitSlop={8} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Patient Details
          </Text>
          <View style={styles.backButton} />
        </LinearGradient>

        <PatientDetailTabBar activeTab={activeTab} onSelectTab={handleTabPress} />

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + bottomSafe }]}>
          {/* Always mounted (invisible when inactive) so its own
              GetUserDetails fetch resolves doseSpotPatientId regardless of
              which tab the modal opened on. */}
          <View style={activeTab === 'personal' ? undefined : styles.hidden}>
            <PatientPersonalInfoTab patientId={patientId} onDoseSpotIdResolved={setDoseSpotPatientId} />
          </View>

          {activeTab === 'appointments' ? <PatientAppointmentsTab patientId={patientId} /> : null}
          {activeTab === 'prescriptions' ? (
            doseSpotPatientId ? <PrescriptionsTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'history' ? (
            doseSpotPatientId ? <MedicationHistoryTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'allergies' ? (
            doseSpotPatientId ? <AllergiesTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'coverage' ? (
            doseSpotPatientId ? <CoverageTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'selfreported' ? (
            doseSpotPatientId ? <SelfReportedMedicationsTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'rxchange' ? (
            doseSpotPatientId ? <RxChangeTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {activeTab === 'refills' ? (
            doseSpotPatientId ? <RefillsTab doseSpotPatientId={doseSpotPatientId} /> : null
          ) : null}
          {needsDoseSpotId && !doseSpotPatientId && activeTab !== 'personal' ? (
            <Text style={styles.waitingText}>Loading patient details…</Text>
          ) : null}
        </ScrollView>

        <MedicationHistoryConsentModal
          visible={consentModalVisible}
          isSubmitting={isConsenting}
          onConfirm={handleConsentConfirm}
          onCancel={() => setConsentModalVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: { width: 28, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.white, textAlign: 'center' },

  content: { padding: 16, paddingBottom: 32 },
  hidden: { position: 'absolute', opacity: 0, height: 0, overflow: 'hidden' },
  waitingText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 30 },
});
