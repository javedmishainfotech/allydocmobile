import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import PharmacyPicker, { getPharmacyId } from '../../components/prescriptions/PharmacyPicker';
import { addPatientPharmacy } from '../../services/prescriptionService';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

/**
 * Port of web's Manage Pharmacies page (`patients/:patientId/:doseSpotPatientId/pharmacies`): the same
 * pharmacy picker as the prescribe flow's first step, in manage mode - search the directory, add / remove
 * Preferred pharmacies, and pick one to save as the patient's Default
 * (`POST /api/Pharmacies/AddPatientPharmacy` with `setAsPrimary: true`).
 */
export default function ManagePharmaciesPage() {
  const bottomSafe = useBottomSafeSpacing();
  const navigation = useNavigation();
  const route = useRoute();
  const { doseSpotPatientId } = route.params || {};
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [hasDefault, setHasDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const saveDefault = async () => {
    const pharmacyId = getPharmacyId(selectedPharmacy);
    if (!pharmacyId) return;
    setSaving(true);
    const result = await addPatientPharmacy(doseSpotPatientId, pharmacyId, true);
    setSaving(false);
    if (result.success) {
      toast.success(result.message || 'Default pharmacy updated');
      setSelectedPharmacy(null);
      setReloadKey((key) => key + 1);
    } else {
      toast.error(result.message || 'Unable to set the default pharmacy.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + bottomSafe }]} keyboardShouldPersistTaps="handled">
        <PharmacyPicker
          doseSpotPatientId={doseSpotPatientId}
          mode="manage"
          selectedPharmacy={selectedPharmacy}
          onSelect={setSelectedPharmacy}
          reloadKey={reloadKey}
          onLoaded={(items) => setHasDefault(items.some((p) => p.IsDefault === true || p.isDefault === true))}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + bottomSafe }]}>
        <View style={styles.footerRow}>
          <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.primary, (!selectedPharmacy || saving) && styles.disabled]} disabled={!selectedPharmacy || saving} onPress={saveDefault}>
            <Text style={styles.primaryText}>{hasDefault ? 'Update Default Pharmacy' : 'Save Default Pharmacy'}</Text>
            {saving ? <ActivityIndicator size="small" color={colors.white} style={styles.buttonSpinner} /> : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingTop: 16, paddingBottom: 32 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: adTokens.border, backgroundColor: adTokens.white },
  footerRow: { flexDirection: 'row', gap: 10 },
  primary: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary },
  buttonSpinner: { marginLeft: 8 },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  secondaryText: { color: adTokens.textSecondary, fontWeight: '700', fontSize: 13.5 },
  disabled: { opacity: 0.5 },
});
