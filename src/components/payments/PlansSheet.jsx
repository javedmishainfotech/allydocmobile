import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adTokens } from '../../theme/colors';

export const getPlanId = (plan) =>
  plan?.id ?? plan?.planId ?? plan?.subscriptionPlanId ?? plan?.patientSubscriptionId ?? plan?.subscriptionId;

const getPlanFeatures = (plan) => [
  ...(Array.isArray(plan?.features?.featureList) ? plan.features.featureList : []),
  ...(Array.isArray(plan?.subscriptionFeatures) ? plan.subscriptionFeatures : []),
];
const getFeatureName = (feature) =>
  typeof feature === 'string' ? feature : feature?.featureName || feature?.name || feature?.title;

const formatPrice = (charges) => {
  const value = Number(charges ?? 0);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : '$0.00';
};

function PlanCard({ plan, selected, disabled, onPress }) {
  const features = getPlanFeatures(plan);
  return (
    <Pressable
      style={[styles.plan, selected && styles.planSelected]}
      disabled={disabled}
      onPress={onPress}
      accessibilityState={{ selected }}
    >
      {plan?.isPopular ? (
        <View style={styles.popular}>
          <Text style={styles.popularText}>Popular</Text>
        </View>
      ) : null}
      <View style={styles.planTop}>
        <Text style={styles.planName}>{plan?.subscriptionName}</Text>
        <MaterialCommunityIcons
          name={selected ? 'radiobox-marked' : 'radiobox-blank'}
          size={22}
          color={selected ? adTokens.primary : adTokens.border}
        />
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(plan?.subscriptionCharges)}</Text>
        <Text style={styles.period}> {plan?.validityUnit || 'per month'}</Text>
      </View>
      <View style={styles.appointmentsPill}>
        <MaterialCommunityIcons name="check" size={14} color={adTokens.primaryDark} />
        <Text style={styles.appointmentsText}>{plan?.allowedAppointments} appointments</Text>
      </View>

      {features.length > 0 || plan?.unavailableFeatures?.length > 0 ? (
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What&apos;s included</Text>
          {features.map((feature, index) => {
            const name = getFeatureName(feature);
            if (!name) return null;
            return (
              <View key={`f-${index}`} style={styles.featureRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={15} color={adTokens.successDark} />
                <Text style={styles.featureText}>{name}</Text>
              </View>
            );
          })}
          {(plan?.unavailableFeatures || []).map((feature, index) => (
            <View key={`u-${index}`} style={styles.featureRow}>
              <MaterialCommunityIcons name="close-circle-outline" size={15} color={adTokens.textMuted} />
              <Text style={[styles.featureText, styles.featureOff]}>{feature}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Subscription plan picker - port of the web's RenewSubscriptionPlanModal + SubscriptionCard:
 * a selectable list of plans (name, price, appointments, what's included) and a confirm button.
 */
export default function PlansSheet({
  visible,
  title,
  confirmLabel,
  loadingMessage = 'Loading plans...',
  plans,
  selectedPlanId,
  isLoading,
  isSubmitting,
  onSelect,
  onConfirm,
  onClose,
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={isSubmitting ? undefined : onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={isSubmitting ? undefined : onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {isLoading ? (
              <View style={styles.state}>
                <ActivityIndicator color={adTokens.primary} />
                <Text style={styles.stateText}>{loadingMessage}</Text>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.stateText}>No Subscription Plans Found</Text>
              </View>
            ) : (
              plans.map((plan) => {
                const id = getPlanId(plan);
                return (
                  <PlanCard
                    key={id}
                    plan={plan}
                    selected={selectedPlanId === id}
                    disabled={isSubmitting}
                    onPress={() => onSelect(id)}
                  />
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.cancelButton, isSubmitting && styles.disabled]} disabled={isSubmitting} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, (isSubmitting || isLoading || !selectedPlanId) && styles.disabled]}
              disabled={isSubmitting || isLoading || !selectedPlanId}
              onPress={onConfirm}
            >
              {isSubmitting ? <ActivityIndicator size="small" color={adTokens.white} /> : null}
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: adTokens.border, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 12 },
  list: { gap: 12, paddingBottom: 8 },
  state: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  stateText: { fontSize: 13.5, color: adTokens.textSecondary },
  empty: { alignItems: 'center', padding: 22, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: adTokens.border },

  plan: { padding: 14, gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: adTokens.border, backgroundColor: adTokens.white },
  planSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  popular: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: adTokens.primary },
  popularText: { fontSize: 11, fontWeight: '800', color: adTokens.white },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { flex: 1, fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 26, fontWeight: '800', color: adTokens.textPrimary },
  period: { fontSize: 13, color: adTokens.textSecondary },
  appointmentsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: adTokens.primaryLight },
  appointmentsText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  features: { gap: 6, marginTop: 4 },
  featuresTitle: { fontSize: 12, fontWeight: '700', color: adTokens.textSecondary },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  featureText: { flex: 1, fontSize: 12.5, color: adTokens.textPrimary, lineHeight: 17 },
  featureOff: { color: adTokens.textMuted },

  footer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  confirmButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: adTokens.primary },
  confirmText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
  disabled: { opacity: 0.55 },
});
