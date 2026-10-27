import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getUserActiveSubscription } from '../../services/patientDashboardService';
import {
  getPatientSubscriptionHistory,
  getSubscriptionInvoice,
  getSubscriptionPlansByClinic,
  purchaseSubscriptionPlan,
  renewSubscriptionPlan,
} from '../../services/subscriptionService';
import { extractPaymentToken, PAYMENT_RESULT_TYPES } from '../../utils/paymentFlow';
import { getItem } from '../../utils/storage';
import { toast } from '../../utils/toast';
import PlansSheet, { getPlanId } from '../payments/PlansSheet';
import PaymentCheckoutSheet from '../payments/PaymentCheckoutSheet';
import InvoiceSheet from '../payments/InvoiceSheet';
import { adTokens } from '../../theme/colors';

// Same as the web tab.
const FALLBACK_CLINIC_CODE = 'DOHBY-25866';
const HISTORY_PAGE_SIZE = 10;

const getArrayData = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return value ? [value] : [];
};

const getRenewPlanInfo = (body) => {
  const data = body?.data;
  const source = Array.isArray(data) ? data.find(Boolean) : data;
  return {
    isRenewPlan: body?.isRenewPlan === true || source?.isRenewPlan === true,
    renewPlanMessage: body?.renewPlanMessage || source?.renewPlanMessage || '',
  };
};

const normalizeHistoryList = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'Items', 'records']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getHistoryStatus = (row) => {
  const raw = row?.status ?? row?.subscriptionStatus ?? row?.planStatus ?? '';
  if (String(raw).trim()) return String(raw).trim();
  if (row?.isValid === true || row?.isCurrentlyActive === true) return 'Active';
  if (row?.isValid === false) return 'Expired';
  return '—';
};

const getHistoryStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (['active', 'success', 'valid'].includes(normalized)) return 'success';
  if (['expired', 'inactive', 'cancelled', 'canceled'].includes(normalized)) return 'danger';
  if (['pending', 'processing'].includes(normalized)) return 'warning';
  return 'neutral';
};

const TONES = {
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const formatCurrency = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

/** A label/value tile - white-on-blue inside the plan card, dark-on-light in the history rows. */
function Stat({ label, value, onLight = false }) {
  return (
    <View style={[styles.stat, onLight && styles.statOnLight]}>
      <Text style={[styles.statLabel, onLight && styles.statLabelOnLight]}>{label}</Text>
      <Text style={[styles.statValue, onLight && styles.statValueOnLight]}>{value}</Text>
    </View>
  );
}

function SubscriptionCard({ plan }) {
  const allowed = Number(plan?.allowedAppointments ?? 0);
  const used = Number(plan?.usedAppointments ?? 0);
  const remaining = plan?.remainingAppointments ?? allowed - used;
  const usagePct = allowed > 0 ? Math.min(Math.round((used / allowed) * 100), 100) : 0;
  const isActive = plan?.isValid;
  const price = plan?.chargesPaid ?? plan?.subscriptionCharges;

  return (
    <View style={styles.subCard}>
      <View style={styles.subTop}>
        <View style={styles.flex1}>
          <Text style={styles.subEyebrow}>CURRENT PLAN</Text>
          <Text style={styles.subName}>{plan?.subscriptionName || plan?.planName || 'Plan'}</Text>
        </View>
        <View style={[styles.activePill, { backgroundColor: isActive ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={[styles.activePillText, { color: isActive ? '#047857' : '#B45309' }]}>{isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.subPrice}>{formatCurrency(price)}</Text>
      <View style={styles.usageHeader}>
        <Text style={styles.subMuted}>Appointment usage</Text>
        <Text style={styles.subStrong}>
          {used}/{allowed}
        </Text>
      </View>
      <View style={styles.usageTrack}>
        <View style={[styles.usageFill, { width: `${usagePct || 2}%` }]} />
      </View>

      <View style={styles.statGrid}>
        <Stat label="Allowed Appointments" value={String(allowed)} />
        <Stat label="Used Appointments" value={String(used)} />
        <Stat label="Remaining Appointments" value={String(remaining)} />
        <Stat label="Charges Paid" value={formatCurrency(plan?.chargesPaid)} />
        <Stat label="Valid From" value={formatDate(plan?.validFrom)} />
        <Stat label="Valid Till" value={formatDate(plan?.validTill)} />
      </View>
    </View>
  );
}

function HistoryRow({ row, number, downloading, onInvoice }) {
  const allowed = Number(row?.allowedAppointments ?? 0);
  const used = Number(row?.usedAppointments ?? 0);
  const remaining = row?.remainingAppointments ?? Math.max(0, allowed - used);
  const status = getHistoryStatus(row);
  const tone = TONES[getHistoryStatusTone(status)];
  const amount = row?.chargesPaid ?? row?.amount ?? row?.subscriptionCharges ?? row?.paidAmount;

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyTop}>
        <Text style={styles.historyNumber}>{number}</Text>
        <Text style={styles.historyName} numberOfLines={1}>
          {row?.subscriptionName || row?.planName || row?.name || '—'}
        </Text>
        {row?.isCurrent === true ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>Current</Text>
          </View>
        ) : null}
        <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.color }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.historyGrid}>
        <Stat onLight label="Amount" value={formatCurrency(amount)} />
        <Stat onLight label="Allowed / Used / Left" value={`${Number.isFinite(allowed) ? allowed : '—'} / ${Number.isFinite(used) ? used : '—'} / ${remaining ?? '—'}`} />
        <Stat onLight label="Purchased On" value={formatDate(row?.purchasedOn)} />
        <Stat onLight label="Valid" value={`${formatDate(row?.validFrom ?? row?.startDate)} → ${formatDate(row?.validTill ?? row?.endDate ?? row?.expiryDate)}`} />
      </View>
      <Pressable style={styles.invoiceButton} disabled={downloading} onPress={() => onInvoice(row?.id)}>
        {downloading ? (
          <ActivityIndicator size="small" color={adTokens.primary} />
        ) : (
          <MaterialCommunityIcons name="download-outline" size={16} color={adTokens.primaryDark} />
        )}
        <Text style={styles.invoiceText}>Download Invoice</Text>
      </Pressable>
    </View>
  );
}

/**
 * Patient "Subscription Plans" - port of AllyDocReactApp's module/Patient/Pages/Setting/Tab/SubscriptionPlans:
 * the active plan (`GET /GetUserActiveSubscription`), Renew Plan when the backend says it is due,
 * "View Available Plans" when there is none (`GET /GetSubscriptionPlansByClinic`), buying / renewing
 * (`POST /PurchaseSubscriptionPlan` / `RenewSubscriptionPlan` -> hosted payment token -> secure
 * checkout WebView), and the paged purchase history with invoices (`GET /GetPatientSubscriptionHistory`,
 * `GET /GetSubscriptionInvoice`). A freelancer has no clinic code, so the plans request goes out
 * with an empty one and the backend resolves their plans from the token.
 */
export default function SubscriptionPlansTab() {
  const { profile } = useAuth();
  const userType = String(profile?.userType || '').toLowerCase();
  const isFreelancer = userType === 'freelancer';

  const [clinicCode, setClinicCode] = useState(null); // null until the stored code is read

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isRenewPlan, setIsRenewPlan] = useState(false);
  const [renewPlanMessage, setRenewPlanMessage] = useState('');
  const [hasNoActiveSubscription, setHasNoActiveSubscription] = useState(false);

  const [historyRows, setHistoryRows] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalRecords, setHistoryTotalRecords] = useState(0);

  const [plansOpen, setPlansOpen] = useState(false);
  const [planMode, setPlanMode] = useState('renew'); // renew | purchase
  const [plans, setPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentToken, setPaymentToken] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [invoice, setInvoice] = useState(null);

  // A nullable field saved at login can end up as the literal string "null" - treat that as
  // "no code", not a real one (same guard as the web).
  useEffect(() => {
    getItem('code').then((stored) => {
      const real = stored && stored !== 'null' && stored !== 'undefined' ? stored : null;
      // A freelancer has no facility; the hardcoded fallback would show them someone else's
      // clinic plans, so they send an empty code and the backend resolves plans from the token.
      setClinicCode(isFreelancer ? real || '' : real || profile?.clinicCode || FALLBACK_CLINIC_CODE);
    });
  }, [isFreelancer, profile?.clinicCode]);

  const loadSubscription = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getUserActiveSubscription();
    const body = result.raw;
    if (result.success) {
      const list = getArrayData(body?.data);
      const info = getRenewPlanInfo(body);
      setSubscriptions(list);
      setIsRenewPlan(info.isRenewPlan);
      setRenewPlanMessage(info.renewPlanMessage);
      setHasNoActiveSubscription(list.length === 0);
    } else if (body && body.data === null) {
      // "No active subscription" - the backend answers with a null payload.
      setSubscriptions([]);
      setIsRenewPlan(false);
      setRenewPlanMessage('');
      setHasNoActiveSubscription(true);
    } else {
      setLoadError(result.message || 'Unable to load your subscription.');
    }
    setIsLoading(false);
  }, []);

  const loadHistory = useCallback(async (page = 1) => {
    setIsHistoryLoading(true);
    const result = await getPatientSubscriptionHistory({ page, pageSize: HISTORY_PAGE_SIZE });
    if (result.success) {
      const body = result.raw;
      const rows = normalizeHistoryList(body?.data);
      const totalPages = Number(body?.totalPages ?? body?.TotalPages ?? body?.data?.totalPages ?? 1);
      const totalRecords = Number(body?.totalRecords ?? body?.TotalRecords ?? body?.data?.totalRecords ?? rows.length);
      setHistoryRows(rows);
      setHistoryPage(Number(body?.page ?? body?.Page ?? page) || page);
      setHistoryTotalPages(Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1);
      setHistoryTotalRecords(Number.isFinite(totalRecords) ? totalRecords : rows.length);
    } else {
      setHistoryRows([]);
      setHistoryTotalPages(1);
      setHistoryTotalRecords(0);
    }
    setIsHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadSubscription();
    loadHistory(1);
  }, [loadSubscription, loadHistory]);

  const planList = useMemo(() => subscriptions, [subscriptions]);

  const openPlans = async (mode) => {
    if (clinicCode === null) return;
    setPlanMode(mode);
    setPlansOpen(true);
    setIsPlansLoading(true);
    setPlans([]);
    setSelectedPlanId(null);
    const result = await getSubscriptionPlansByClinic(clinicCode);
    if (result.success) {
      const list = Array.isArray(result.data) ? result.data : [];
      setPlans(list);
      // Renewing starts on the first plan; buying makes the patient choose.
      setSelectedPlanId(mode === 'renew' ? getPlanId(list[0]) ?? null : null);
    } else {
      toast.error(result.message || 'Unable to load subscription plans.');
    }
    setIsPlansLoading(false);
  };

  const closePlans = () => {
    if (isSubmitting) return;
    setPlansOpen(false);
    setPlans([]);
    setSelectedPlanId(null);
  };

  const confirmPlan = async () => {
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan.');
      return;
    }
    const selectedPlan = plans.find((plan) => getPlanId(plan) === selectedPlanId);
    setIsSubmitting(true);
    const result =
      planMode === 'purchase'
        ? await purchaseSubscriptionPlan({ subscriptionId: selectedPlan?.id, amount: selectedPlan?.subscriptionCharges })
        : await renewSubscriptionPlan(selectedPlanId);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message || (planMode === 'purchase' ? 'Failed to purchase subscription' : 'Failed to renew subscription'));
      return;
    }
    const token = extractPaymentToken(result.raw);
    if (!token) {
      toast.error(planMode === 'purchase' ? 'Failed to start subscription payment.' : 'Failed to start renewal payment.');
      return;
    }
    setPlansOpen(false);
    setPaymentToken(token);
  };

  const onPaymentDone = () => {
    setPaymentToken(null);
    setPlans([]);
    setSelectedPlanId(null);
    loadSubscription();
    loadHistory(1);
  };

  const openInvoice = async (patientSubscriptionId) => {
    if (downloadingId != null) return;
    setDownloadingId(patientSubscriptionId);
    const result = await getSubscriptionInvoice(patientSubscriptionId);
    setDownloadingId(null);
    if (!result.success || !result.data) {
      toast.error(result.message || 'Failed to generate invoice.');
      return;
    }
    setInvoice(result.data);
  };

  const changeHistoryPage = (next) => {
    if (next < 1 || next > historyTotalPages || next === historyPage || isHistoryLoading) return;
    loadHistory(next);
  };

  const firstShown = historyRows.length ? (historyPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const lastShown = (historyPage - 1) * HISTORY_PAGE_SIZE + historyRows.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.title}>Subscription Plan</Text>
          <Text style={styles.hint}>Review your current subscription details.</Text>
        </View>
        {isRenewPlan ? (
          <Pressable style={styles.primaryButton} onPress={() => openPlans('renew')}>
            <Text style={styles.primaryText}>Renew Plan</Text>
          </Pressable>
        ) : null}
      </View>

      {isRenewPlan && renewPlanMessage ? (
        <View style={styles.alert}>
          <MaterialCommunityIcons name="information-outline" size={20} color={adTokens.warningDark} />
          <Text style={styles.alertText}>{renewPlanMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={adTokens.primary} />
      ) : loadError ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
          <Text style={styles.emptyText}>{loadError}</Text>
          <Pressable style={styles.primaryButton} onPress={loadSubscription}>
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        </View>
      ) : planList.length > 0 ? (
        planList.map((plan, index) => <SubscriptionCard key={String(getPlanId(plan) ?? index)} plan={plan} />)
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="package-variant-closed" size={32} color={adTokens.textMuted} />
          <Text style={styles.emptyTitle}>{hasNoActiveSubscription ? 'No Active Subscription Found' : 'No Subscription Plan Found'}</Text>
          {hasNoActiveSubscription ? (
            <>
              <Text style={styles.emptyText}>You need a plan to book appointments.</Text>
              <Pressable style={styles.primaryButton} onPress={() => openPlans('purchase')}>
                <Text style={styles.primaryText}>View Available Plans</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.title}>Subscription History</Text>
        <Text style={styles.hint}>Your past and current subscription purchases.</Text>
      </View>

      {isHistoryLoading ? (
        <ActivityIndicator style={styles.loader} color={adTokens.primary} />
      ) : historyRows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No subscription history found.</Text>
        </View>
      ) : (
        <>
          {historyRows.map((row, index) => (
            <HistoryRow
              key={String(row?.id ?? `${historyPage}-${index}`)}
              row={row}
              number={(historyPage - 1) * HISTORY_PAGE_SIZE + index + 1}
              downloading={downloadingId === row?.id}
              onInvoice={openInvoice}
            />
          ))}
          <View style={styles.pager}>
            <Pressable
              style={[styles.pagerButton, historyPage <= 1 && styles.pagerDisabled]}
              disabled={historyPage <= 1}
              onPress={() => changeHistoryPage(historyPage - 1)}
            >
              <Feather name="chevron-left" size={16} color={historyPage <= 1 ? adTokens.textMuted : adTokens.primaryDark} />
            </Pressable>
            <Text style={styles.pagerInfo}>
              {firstShown}-{lastShown} of {historyTotalRecords}
            </Text>
            <Pressable
              style={[styles.pagerButton, historyPage >= historyTotalPages && styles.pagerDisabled]}
              disabled={historyPage >= historyTotalPages}
              onPress={() => changeHistoryPage(historyPage + 1)}
            >
              <Feather name="chevron-right" size={16} color={historyPage >= historyTotalPages ? adTokens.textMuted : adTokens.primaryDark} />
            </Pressable>
          </View>
        </>
      )}

      <PlansSheet
        visible={plansOpen}
        title={planMode === 'purchase' ? 'Select a Subscription Plan' : 'Renew Subscription Plan'}
        confirmLabel={planMode === 'purchase' ? 'Continue to Payment' : 'Pay & Renew'}
        loadingMessage={planMode === 'purchase' ? 'Loading available plans...' : 'Loading plans...'}
        plans={plans}
        selectedPlanId={selectedPlanId}
        isLoading={isPlansLoading}
        isSubmitting={isSubmitting}
        onSelect={setSelectedPlanId}
        onConfirm={confirmPlan}
        onClose={closePlans}
      />
      <PaymentCheckoutSheet
        visible={paymentToken != null}
        token={paymentToken}
        fallbackType={planMode === 'purchase' ? PAYMENT_RESULT_TYPES.PURCHASE_SUBSCRIPTION : PAYMENT_RESULT_TYPES.RENEW_SUBSCRIPTION}
        onDone={onPaymentDone}
        onCancel={() => setPaymentToken(null)}
      />
      <InvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  wrap: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '800', color: adTokens.textPrimary },
  hint: { fontSize: 12.5, color: adTokens.textSecondary, marginTop: 2 },
  loader: { paddingVertical: 28 },
  primaryButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: adTokens.primary },
  primaryText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },

  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, backgroundColor: adTokens.warningLight },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.warningDark, lineHeight: 18 },

  empty: { alignItems: 'center', gap: 8, padding: 22, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: adTokens.border },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  emptyText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },

  subCard: { padding: 16, gap: 10, borderRadius: 18, backgroundColor: adTokens.primary },
  subTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: 'rgba(255,255,255,0.68)' },
  subName: { fontSize: 22, fontWeight: '800', color: adTokens.white, marginTop: 2 },
  activePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  activePillText: { fontSize: 11.5, fontWeight: '700' },
  subPrice: { fontSize: 28, fontWeight: '800', color: adTokens.white },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  subMuted: { fontSize: 12.5, color: 'rgba(255,255,255,0.78)' },
  subStrong: { fontSize: 12.5, fontWeight: '800', color: adTokens.white },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 999, backgroundColor: adTokens.white },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  stat: { flexGrow: 1, flexBasis: '45%', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  statValue: { fontSize: 13, fontWeight: '800', color: adTokens.white },
  statOnLight: { backgroundColor: adTokens.gray50 },
  statLabelOnLight: { color: adTokens.textSecondary },
  statValueOnLight: { color: adTokens.textPrimary },

  historyHeader: { marginTop: 8 },
  historyRow: { padding: 12, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyNumber: { fontSize: 12, fontWeight: '700', color: adTokens.textMuted },
  historyName: { flex: 1, fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  currentBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.infoLight },
  currentText: { fontSize: 10.5, fontWeight: '800', color: adTokens.infoDark },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontSize: 11.5, fontWeight: '700' },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  invoiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: adTokens.primaryLight },
  invoiceText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pagerButton: { padding: 9, borderRadius: 10, backgroundColor: adTokens.primaryLight },
  pagerDisabled: { backgroundColor: adTokens.gray100 },
  pagerInfo: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
});
