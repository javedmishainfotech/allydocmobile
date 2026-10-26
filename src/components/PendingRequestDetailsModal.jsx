import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getAppointmentDetails, getPatientAllergies } from '../services/pendingRequestDetailsService';
import { getAppointmentDisplay } from '../utils/formatAppointmentDate';
import ConsultQuestionnaireItem from './ConsultQuestionnaireItem';
import { colors, adTokens } from '../theme/colors';

const STATUS_COLORS = {
  active: '#15803D',
  deleted: '#B91C1C',
};

/**
 * Port of AllyDocReactApp/src/module/Doctor/Pages/DoctorDashboard/PendingRequestDetailsModal.jsx:
 * read-only quick-view for a pending appointment request (patient basics, allergies,
 * appointment details, consult questionnaire) shown before Accept - so the doctor can
 * review who/what they're accepting without leaving the dashboard. Reuses the same
 * /AppointmentDetails and /api/Allergies/{doseSpotPatientId}/allergies endpoints as web.
 */
export default function PendingRequestDetailsModal({
  visible,
  appointmentId,
  onClose,
  onAccept,
  isAccepting,
  acceptDisabled,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [questionnaire, setQuestionnaire] = useState([]);
  const [openQuestionIds, setOpenQuestionIds] = useState(new Set());
  const [allergies, setAllergies] = useState([]);
  const [allergiesLoading, setAllergiesLoading] = useState(false);
  const [allergiesError, setAllergiesError] = useState(false);

  useEffect(() => {
    if (!visible || !appointmentId) return;
    let cancelled = false;
    setIsLoading(true);
    setDetails(null);
    setQuestionnaire([]);
    setAllergies([]);
    setAllergiesError(false);

    getAppointmentDetails(appointmentId).then((response) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!response.success) return;
      const data = response.data;
      setDetails(data);
      const list = data?.questionAnwerLists || [];
      setQuestionnaire(list);
      setOpenQuestionIds(new Set(list.map((_, index) => index)));

      const doseSpotPatientId = data?.doseSpotId;
      if (doseSpotPatientId) {
        setAllergiesLoading(true);
        getPatientAllergies(doseSpotPatientId).then((allergyResponse) => {
          if (cancelled) return;
          setAllergiesLoading(false);
          if (!allergyResponse.success) {
            setAllergiesError(true);
            return;
          }
          const items = allergyResponse.data?.Items || [];
          setAllergies(
            items.map((item) => ({
              ...item,
              OnsetDate:
                item.OnsetDate && !Number.isNaN(new Date(item.OnsetDate).getTime())
                  ? new Date(item.OnsetDate).toLocaleDateString()
                  : item.OnsetDate,
            })),
          );
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [visible, appointmentId]);

  const toggleQuestionnaireItem = (index) => {
    setOpenQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAccept = () => {
    if (!onAccept) return;
    onAccept(appointmentId);
    onClose?.();
  };

  const condition = String(details?.appointmentReason ?? '').trim();
  const appointmentDisplay = details ? getAppointmentDisplay(details) : null;
  const appointmentDateLabel = appointmentDisplay?.instantMs != null ? appointmentDisplay.date : null;
  const appointmentTimeLabel = appointmentDisplay?.instantMs != null ? appointmentDisplay.timeWithZone : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <MaterialCommunityIcons name="account-circle-outline" size={22} color={adTokens.primaryDark} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.headerTitle}>Patient Request Details</Text>
              <Text style={styles.headerSubtitle}>Review before accepting this appointment</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={adTokens.primary} />
            </View>
          ) : !details ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.mutedText}>Unable to load details for this request.</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <View style={styles.patientCard}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>
                    {(details.patientName || 'P').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.patientName}>{details.patientName || 'Patient'}</Text>
                  {details.patientAge ? (
                    <View style={styles.ageBadge}>
                      <MaterialCommunityIcons name="calendar-outline" size={11} color={adTokens.primaryDark} />
                      <Text style={styles.ageBadgeText}>Age {details.patientAge}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Appointment Details</Text>
                <View style={styles.badgeWrapRow}>
                  {appointmentDateLabel ? (
                    <View style={styles.neutralBadge}>
                      <MaterialCommunityIcons name="calendar-outline" size={12} color={adTokens.textSecondary} />
                      <Text style={styles.neutralBadgeText}>{appointmentDateLabel}</Text>
                    </View>
                  ) : null}
                  {appointmentTimeLabel ? (
                    <View style={styles.neutralBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={adTokens.textSecondary} />
                      <Text style={styles.neutralBadgeText}>{appointmentTimeLabel}</Text>
                    </View>
                  ) : null}
                  {condition ? (
                    <View style={styles.infoBadge}>
                      <MaterialCommunityIcons name="medical-bag" size={12} color={adTokens.infoDark} />
                      <Text style={styles.infoBadgeText}>Condition: {condition}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Allergies</Text>
                {allergiesLoading ? (
                  <View style={styles.inlineRow}>
                    <ActivityIndicator size={14} color={adTokens.primary} />
                    <Text style={styles.mutedText}>Loading allergies...</Text>
                  </View>
                ) : allergiesError ? (
                  <Text style={styles.mutedText}>Unable to load allergy information right now.</Text>
                ) : allergies.length > 0 ? (
                  allergies.map((allergy, index) => {
                    const fields = [
                      ['Type', allergy.AllergenType],
                      ['Reaction', allergy.Reaction],
                      ['Reaction Type', allergy.ReactionType],
                      ['Severity', allergy.Severity],
                      ['Onset Date', allergy.OnsetDate],
                    ].filter(([, value]) => value);
                    const statusColor =
                      STATUS_COLORS[String(allergy.StatusType ?? '').toLowerCase().trim()] || '#475569';
                    return (
                      <View key={allergy.PatientAllergyId ?? index} style={styles.allergyCard}>
                        <View style={styles.allergyHeaderRow}>
                          <View style={styles.allergyNameRow}>
                            <MaterialCommunityIcons name="alert-circle" size={13} color="#DC2626" />
                            <Text style={styles.allergyName}>{allergy.DisplayName || 'Unknown'}</Text>
                          </View>
                          {allergy.StatusType ? (
                            <View style={[styles.allergyStatusBadge, { backgroundColor: statusColor }]}>
                              <Text style={styles.allergyStatusText}>{allergy.StatusType}</Text>
                            </View>
                          ) : null}
                        </View>
                        {fields.length > 0 ? (
                          <View style={styles.allergyFieldsGrid}>
                            {fields.map(([label, value]) => (
                              <View key={label} style={styles.allergyField}>
                                <Text style={styles.allergyFieldLabel}>{label}</Text>
                                <Text style={styles.allergyFieldValue}>{value}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.mutedText}>No known allergies on record.</Text>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Consult Questionnaire</Text>
                {questionnaire.length > 0 ? (
                  questionnaire.map((record, index) => (
                    <ConsultQuestionnaireItem
                      key={index}
                      record={record}
                      index={index}
                      isOpen={openQuestionIds.has(index)}
                      onToggle={() => toggleQuestionnaireItem(index)}
                    />
                  ))
                ) : (
                  <Text style={styles.mutedTextCenter}>No questionnaire submitted for this appointment.</Text>
                )}
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
            {onAccept ? (
              <Pressable
                style={[styles.acceptButton, acceptDisabled && styles.acceptButtonDisabled]}
                disabled={acceptDisabled}
                onPress={handleAccept}
              >
                {isAccepting ? (
                  <ActivityIndicator size={14} color={colors.white} />
                ) : (
                  <>
                    <Feather name="check" size={15} color={colors.white} />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    paddingTop: 16,
  },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: adTokens.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  headerSubtitle: { fontSize: 11.5, color: adTokens.textSecondary, marginTop: 1 },

  loadingWrap: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 13, color: adTokens.textSecondary },
  mutedTextCenter: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center', paddingVertical: 10 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  body: { paddingHorizontal: 18 },
  bodyContent: { paddingTop: 14, paddingBottom: 20, gap: 14 },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: adTokens.primaryTint,
    borderRadius: 14,
    padding: 14,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: adTokens.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: { fontSize: 20, fontWeight: '700', color: adTokens.primaryDark },
  patientName: { fontSize: 17, fontWeight: '700', color: adTokens.textPrimary },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: adTokens.white,
  },
  ageBadgeText: { fontSize: 11, fontWeight: '600', color: adTokens.primaryDark },

  sectionCard: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 8 },
  badgeWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  neutralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: adTokens.gray100,
  },
  neutralBadgeText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: adTokens.infoLight,
  },
  infoBadgeText: { fontSize: 11.5, fontWeight: '600', color: adTokens.infoDark },

  allergyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  allergyHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  allergyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  allergyName: { fontSize: 13.5, fontWeight: '700', color: '#1E293B', flexShrink: 1 },
  allergyStatusBadge: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  allergyStatusText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase' },
  allergyFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  allergyField: { minWidth: 100 },
  allergyFieldLabel: { fontSize: 9.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  allergyFieldValue: { fontSize: 12, fontWeight: '600', color: '#1E293B', marginTop: 1 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  closeButtonText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: adTokens.success,
  },
  acceptButtonDisabled: { opacity: 0.65 },
  acceptButtonText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },
});
