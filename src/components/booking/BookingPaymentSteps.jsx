import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  bookWithSubscriptionPlan,
  checkoutAppointmentBooking,
  getPaymentOptions,
  getScheduleList,
  saveAppointmentTime,
} from '../../services/bookingService';
import { extractPaymentToken, PAYMENT_RESULT_TYPES } from '../../utils/paymentFlow';
import { getSlotRangeLabel, getSlotValue } from '../../utils/slotLabel';
import { localDateOnlyToApiString } from '../../utils/dateOnly';
import PaymentCheckoutSheet from '../payments/PaymentCheckoutSheet';
import { ButtonRow, Card, LoadingBlock, PrimaryButton, StepHeader } from './BookingUi';
import { toast } from '../../utils/toast';
import { adTokens } from '../../theme/colors';

const WEEKS = 4;

const buildWeeks = (startDate) => {
  const weeks = [];
  for (let week = 0; week < WEEKS; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + week * 7 + day);
      days.push({
        date,
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    weeks.push(days);
  }
  return weeks;
};

/**
 * Date and time (web Step3; clinic / hospital patients only - a freelancer's doctor sets the time):
 * four weeks of day chips, the slots of the chosen day (`GET /ScheduleList`, shown in the patient's
 * own timezone) and `POST /SelectAppointmentTime` to save the pick on the booking.
 */
export function DateTimeStep({ questionnaireId, onNext }) {
  const { profile } = useAuth();
  const userId = profile?.userId;
  const viewerTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return '';
    }
  }, []);

  const [startDate] = useState(() => new Date());
  const weeks = useMemo(() => buildWeeks(startDate), [startDate]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [slots, setSlots] = useState([]);
  const [slotLoader, setSlotLoader] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSlotClinicDate, setSelectedSlotClinicDate] = useState(null);
  const [submitLoader, setSubmitLoader] = useState(false);

  const fetchSlots = useCallback(
    async (date) => {
      setSlots([]);
      setSlotLoader(true);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const result = await getScheduleList({ userId, day, appointmentDate: localDateOnlyToApiString(date) });
      setSlots(result.success && Array.isArray(result.data) ? result.data : []);
      setSlotLoader(false);
    },
    [userId],
  );

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const pickDate = (date) => {
    setSelectedTime('');
    setSelectedSlotClinicDate(null);
    setSelectedDate(date);
  };

  const pickSlot = (slot) => {
    setSelectedTime(getSlotValue(slot));
    // The slot's OWN clinic-local date can differ from the browsed day once a viewer's day pulls in an
    // adjacent clinic day's slots - the booking must send the slot's date.
    setSelectedSlotClinicDate(typeof slot === 'object' && slot?.clinicLocalDate ? slot.clinicLocalDate : null);
  };

  const submit = async () => {
    setSubmitLoader(true);
    const dateForSubmit = selectedSlotClinicDate
      ? localDateOnlyToApiString(selectedSlotClinicDate)
      : localDateOnlyToApiString(selectedDate);
    const result = await saveAppointmentTime(questionnaireId, dateForSubmit, selectedTime);
    setSubmitLoader(false);
    if (result.success) onNext();
    else toast.error(result.message || 'Failed to save appointment time. Please try again.');
  };

  const weekDays = weeks[currentWeek] || [];

  return (
    <View>
      <StepHeader title="Select Date & Time" subtitle="Choose your preferred appointment slot" />

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.weekNav}>
          <Pressable
            style={[styles.weekButton, currentWeek === 0 && styles.disabled]}
            disabled={currentWeek === 0}
            onPress={() => setCurrentWeek((week) => Math.max(0, week - 1))}
          >
            <Feather name="chevron-left" size={18} color={adTokens.primaryDark} />
          </Pressable>
          <Pressable
            style={[styles.weekButton, currentWeek >= WEEKS - 1 && styles.disabled]}
            disabled={currentWeek >= WEEKS - 1}
            onPress={() => setCurrentWeek((week) => Math.min(WEEKS - 1, week + 1))}
          >
            <Feather name="chevron-right" size={18} color={adTokens.primaryDark} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {weekDays.map((entry) => {
          const active = selectedDate.toDateString() === entry.date.toDateString();
          return (
            <Pressable key={entry.date.toISOString()} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => pickDate(entry.date)}>
              <Text style={[styles.dayWeekday, active && styles.dayTextActive]}>{entry.weekday}</Text>
              <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{entry.day}</Text>
              <Text style={[styles.dayMonth, active && styles.dayTextActive]}>{entry.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionTitle, styles.hoursTitle]}>
        Available Hours <Text style={styles.zone}>(Times shown in your local time zone ({viewerTimeZone}))</Text>
      </Text>

      {slotLoader ? (
        <LoadingBlock text="Loading slots..." />
      ) : slots.length === 0 ? (
        <View style={styles.noSlots}>
          <MaterialCommunityIcons name="information-outline" size={20} color={adTokens.textMuted} />
          <Text style={styles.noSlotsText}>No available slots for the selected day</Text>
        </View>
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((slot, index) => {
            const value = getSlotValue(slot);
            const active = selectedTime === value;
            return (
              <Pressable key={`${value}-${index}`} style={[styles.slotChip, active && styles.slotChipActive]} onPress={() => pickSlot(slot)}>
                <Text style={[styles.slotText, active && styles.slotTextActive]}>{getSlotRangeLabel(slot)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ButtonRow>
        <PrimaryButton label="Save & Continue" onPress={submit} loading={submitLoader} disabled={!selectedTime} />
      </ButtonRow>
    </View>
  );
}

const formatPlanDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const money = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : '$0.00';
};

function PlanCard({ title, price, period, appointments, features = [], active, status, children, onPress }) {
  return (
    <Pressable style={[styles.plan, active && styles.planActive]} onPress={onPress}>
      {status ? (
        <View style={[styles.statusPill, { backgroundColor: status === 'Active' ? adTokens.successLight : adTokens.dangerLight }]}>
          <Text style={[styles.statusText, { color: status === 'Active' ? adTokens.successDark : adTokens.dangerDark }]}>{status}</Text>
        </View>
      ) : null}
      <Text style={styles.planName}>{title}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      {period ? <Text style={styles.planPeriod}>{period}</Text> : null}
      {appointments ? (
        <View style={styles.appointmentsPill}>
          <MaterialCommunityIcons name="check" size={14} color={adTokens.primaryDark} />
          <Text style={styles.appointmentsText}>{appointments}</Text>
        </View>
      ) : null}
      {features.map((feature, index) => {
        const name = typeof feature === 'string' ? feature : feature?.featureName || feature?.name || feature?.title;
        return name ? (
          <View key={`${name}-${index}`} style={styles.featureRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color={adTokens.successDark} />
            <Text style={styles.featureText}>{name}</Text>
          </View>
        ) : null;
      })}
      {children}
    </Pressable>
  );
}

function ActionButton({ label, loading, onPress, tone = 'primary' }) {
  return (
    <Pressable
      style={[styles.actionButton, tone === 'primary' ? styles.actionPrimary : styles.actionOutline, loading && styles.disabled]}
      disabled={loading}
      onPress={onPress}
    >
      <Text style={[styles.actionText, tone !== 'primary' && styles.actionTextOutline]}>{loading ? `${label}...` : label}</Text>
    </Pressable>
  );
}

/**
 * Payment (web Step4): what the patient can pay with for this booking
 * (`GET /GetPaymentOptionsForAppointmentBooking`) - their existing plan (use it, or renew it when it
 * can no longer be used), an available plan to buy, or a one-time payment. A paid choice starts a
 * checkout (`POST /CheckoutAppointmentBooking`, type BS or OT) and opens the secure payment page;
 * using an existing plan books straight away (`POST /BookAppointmentWithSubscriptionPlan`).
 */
export function PaymentStep({ questionnaireId, authToken, onNext }) {
  const [paymentOptions, setPaymentOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSection, setActiveSection] = useState('current');
  const [activeCard, setActiveCard] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState('onetime');
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [isExistingPlanLoading, setIsExistingPlanLoading] = useState(false);
  const [isOneTimeLoading, setIsOneTimeLoading] = useState(false);
  const [renewExpanded, setRenewExpanded] = useState(false);
  const [checkout, setCheckout] = useState(null); // { token, type }

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    const result = await getPaymentOptions(questionnaireId, authToken);
    if (result.success) setPaymentOptions(result.data);
    else setLoadError(result.message || 'Unable to load payment options.');
    setIsLoading(false);
  }, [questionnaireId, authToken]);

  useEffect(() => {
    load();
  }, [load]);

  const subscriptionPlans = paymentOptions?.subscriptionPlans || [];
  const existingPlan = paymentOptions?.existingPlanDetail;
  const oneTimeAmount = paymentOptions?.oneTimePaymentAmount;
  const hasCurrentPlan = paymentOptions?.isAlreadyPurchased === true && !!existingPlan;
  const hasAvailablePlans = subscriptionPlans.length > 0;
  const hasOneTime = !!oneTimeAmount;

  const startCheckout = async (values, type) => {
    const result = await checkoutAppointmentBooking(values);
    if (!result.success) {
      toast.error(result.message || 'Unable to start the payment.');
      return;
    }
    toast.success(result.message || 'Payment requested');
    const token = extractPaymentToken(result.raw);
    if (!token) {
      toast.error('Failed to start the payment.');
      return;
    }
    setCheckout({ token, type });
  };

  const selectPlan = async (plan) => {
    setLoadingPlanId(plan.subscriptionPlanId);
    setActiveCard(plan.subscriptionPlanId);
    setSelectedPaymentType('subscription');
    await startCheckout(
      {
        patientQuestionnaireId: questionnaireId,
        transactionType: 'BS',
        amount: plan.subscriptionCharges,
        subscriptionId: plan.subscriptionPlanId,
        token: authToken ?? null,
      },
      PAYMENT_RESULT_TYPES.PURCHASE_SUBSCRIPTION,
    );
    setLoadingPlanId(null);
  };

  const bookOneTime = async () => {
    setIsOneTimeLoading(true);
    setSelectedPaymentType('onetime');
    setActiveCard(null);
    await startCheckout(
      {
        patientQuestionnaireId: questionnaireId,
        transactionType: 'OT',
        amount: oneTimeAmount,
        subscriptionId: 0,
        token: authToken ?? null,
      },
      PAYMENT_RESULT_TYPES.ONE_TIME_APPOINTMENT,
    );
    setIsOneTimeLoading(false);
  };

  const useExistingPlan = async () => {
    setActiveCard(existingPlan.subscriptionPlanId);
    setSelectedPaymentType('subscription');
    if (paymentOptions?.canUseExistingPlan) {
      setIsExistingPlanLoading(true);
      const result = await bookWithSubscriptionPlan(questionnaireId, authToken);
      setIsExistingPlanLoading(false);
      if (result.success) onNext();
      else toast.error(result.message || 'Unable to book with your plan.');
      return;
    }
    // The plan cannot be used as-is any more: pick a replacement from the available plans.
    if (hasAvailablePlans) setActiveSection('available');
    else toast.info('No subscription plans are currently available. Please contact your clinic.');
  };

  const onCheckoutDone = ({ success }) => {
    setCheckout(null);
    if (success) onNext();
  };

  const tabs = [
    hasCurrentPlan && { key: 'current', label: 'Current Plan', icon: 'crown-outline' },
    hasAvailablePlans && { key: 'available', label: 'Available Plans', icon: 'calendar-month-outline' },
    hasOneTime && { key: 'onetime', label: 'One Time', icon: 'cart-outline' },
  ].filter(Boolean);
  const effectiveSection = tabs.some((tab) => tab.key === activeSection) ? activeSection : tabs[0]?.key;

  const renderCurrentPlan = () => {
    const isExpired = Boolean(paymentOptions?.isExistingPlanExpired);
    const canUse = paymentOptions?.canUseExistingPlan;
    const renewMessage = String(paymentOptions?.renewPlanMessage || '').trim();
    const allowed = Number(existingPlan.allowedAppointments ?? 0);
    const used = Number(existingPlan.usedAppointments ?? paymentOptions?.appointmentsBookedInExistingPlan ?? 0);
    const remaining = Number(existingPlan.remainingAppointments ?? Math.max(0, allowed - used));
    const usage = allowed > 0 ? Math.min(Math.round((used / allowed) * 100), 100) : 0;
    const active = selectedPaymentType === 'subscription' && activeCard == existingPlan.subscriptionPlanId;

    return (
      <PlanCard
        title={existingPlan.subscriptionName}
        status={isExpired ? 'Expired' : 'Active'}
        price={money(existingPlan.subscriptionCharges ?? existingPlan.chargesPaid)}
        period={`Valid till: ${formatPlanDate(existingPlan.validTill)}`}
        features={Array.isArray(existingPlan.subscriptionFeatures) ? existingPlan.subscriptionFeatures : []}
        active={active}
        onPress={() => {
          setActiveCard(existingPlan.subscriptionPlanId);
          setSelectedPaymentType('subscription');
        }}
      >
        <Text style={styles.usageMeta}>
          Allowed {allowed} · Used {used} · <Text style={remaining <= 0 ? styles.depleted : null}>Remaining {remaining}</Text>
        </Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${usage}%` }, remaining <= 0 && styles.trackDepleted]} />
        </View>
        {paymentOptions?.isRenewPlan === true && renewMessage ? (
          <Pressable style={styles.renewNote} onPress={() => setRenewExpanded((value) => !value)}>
            <View style={styles.renewHeader}>
              <MaterialCommunityIcons name="information-outline" size={16} color={adTokens.warningDark} />
              <Text style={styles.renewTitle}>Plan renewal needed</Text>
              <Feather name={renewExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={adTokens.warningDark} />
            </View>
            {renewExpanded ? <Text style={styles.renewBody}>{renewMessage}</Text> : null}
          </Pressable>
        ) : null}
        <ActionButton label={canUse ? 'Select' : 'Renew Plan'} loading={isExistingPlanLoading} onPress={useExistingPlan} />
      </PlanCard>
    );
  };

  const renderAvailablePlans = () =>
    subscriptionPlans.map((plan) => (
      <PlanCard
        key={plan.subscriptionPlanId}
        title={plan.subscriptionName}
        price={money(plan.subscriptionCharges)}
        period={plan.validityUnit || 'per month'}
        appointments={`${plan.allowedAppointments} appointments`}
        features={[
          ...(Array.isArray(plan?.features?.featureList) ? plan.features.featureList : []),
          ...(Array.isArray(plan?.subscriptionFeatures) ? plan.subscriptionFeatures : []),
        ]}
        active={plan.subscriptionPlanId == activeCard}
        onPress={() => {
          setActiveCard(plan.subscriptionPlanId);
          setSelectedPaymentType('subscription');
        }}
      >
        <ActionButton label="Select" loading={loadingPlanId === plan.subscriptionPlanId} onPress={() => selectPlan(plan)} />
      </PlanCard>
    ));

  const renderOneTime = () => (
    <PlanCard
      title="One Time Payment"
      price={money(oneTimeAmount)}
      period="per appointment"
      features={['Payment for current booking only']}
      active={selectedPaymentType === 'onetime'}
      onPress={() => {
        setSelectedPaymentType('onetime');
        setActiveCard(null);
      }}
    >
      <ActionButton label="Book Appointment" loading={isOneTimeLoading} onPress={bookOneTime} />
    </PlanCard>
  );

  return (
    <View>
      <StepHeader title="Choose a Payment Option" subtitle="Select how you'd like to pay for your appointment" />

      {isLoading ? <LoadingBlock text="Loading payment options..." /> : null}
      {loadError ? (
        <Card>
          <Text style={styles.noSlotsText}>{loadError}</Text>
          <ActionButton label="Retry" onPress={load} />
        </Card>
      ) : null}

      {paymentOptions && tabs.length > 0 ? (
        <>
          {tabs.length > 1 ? (
            <View style={styles.tabs}>
              {tabs.map((tab) => {
                const active = effectiveSection === tab.key;
                return (
                  <Pressable key={tab.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveSection(tab.key)}>
                    <MaterialCommunityIcons name={tab.icon} size={16} color={active ? adTokens.white : adTokens.textSecondary} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={styles.planList}>
            {effectiveSection === 'current' && existingPlan ? renderCurrentPlan() : null}
            {effectiveSection === 'available' ? renderAvailablePlans() : null}
            {effectiveSection === 'onetime' ? renderOneTime() : null}
          </View>
        </>
      ) : null}

      <PaymentCheckoutSheet
        visible={checkout != null}
        token={checkout?.token || null}
        fallbackType={checkout?.type || null}
        onDone={onCheckoutDone}
        onCancel={() => setCheckout(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  hoursTitle: { marginTop: 16, marginBottom: 10 },
  zone: { fontSize: 12, fontWeight: '400', color: adTokens.textSecondary },
  weekNav: { flexDirection: 'row', gap: 6 },
  weekButton: { padding: 8, borderRadius: 10, backgroundColor: adTokens.primaryLight },

  dayRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    width: 68,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  dayChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  dayWeekday: { fontSize: 10.5, color: adTokens.textSecondary },
  dayNumber: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  dayMonth: { fontSize: 10.5, color: adTokens.textSecondary },
  dayTextActive: { color: adTokens.white },

  noSlots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  noSlotsText: { fontSize: 14, color: adTokens.textSecondary, textAlign: 'center' },
  slotGrid: { gap: 8 },
  slotChip: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  slotChipActive: { backgroundColor: adTokens.primaryLight, borderColor: adTokens.primary },
  slotText: { fontSize: 14, color: adTokens.textPrimary, textAlign: 'center' },
  slotTextActive: { fontWeight: '700', color: adTokens.primaryDark },

  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 14, backgroundColor: adTokens.gray100, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 11 },
  tabActive: { backgroundColor: adTokens.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: adTokens.textSecondary },
  tabTextActive: { color: adTokens.white },
  planList: { gap: 12 },

  plan: { padding: 14, gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: adTokens.border, backgroundColor: adTokens.white },
  planActive: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  statusPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 12, borderRadius: 999 },
  statusText: { fontSize: 11.5, fontWeight: '800' },
  planName: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },
  planPrice: { fontSize: 26, fontWeight: '800', color: adTokens.textPrimary },
  planPeriod: { fontSize: 12.5, color: adTokens.textSecondary },
  appointmentsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: adTokens.primaryLight },
  appointmentsText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  featureText: { flex: 1, fontSize: 13, color: adTokens.textPrimary, lineHeight: 18 },
  usageMeta: { fontSize: 12.5, color: adTokens.textSecondary },
  depleted: { color: adTokens.danger, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: adTokens.gray100, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: adTokens.primary },
  trackDepleted: { backgroundColor: adTokens.danger },
  renewNote: { padding: 10, borderRadius: 10, backgroundColor: adTokens.warningLight, gap: 6 },
  renewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  renewTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: adTokens.warningDark },
  renewBody: { fontSize: 12.5, color: adTokens.warningDark, lineHeight: 17 },

  actionButton: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  actionPrimary: { backgroundColor: adTokens.primary },
  actionOutline: { borderWidth: 1, borderColor: adTokens.primary },
  actionText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
  actionTextOutline: { color: adTokens.primaryDark },
});
