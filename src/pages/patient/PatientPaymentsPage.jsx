import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllPayments, getPaymentInvoice } from '../../services/patientPaymentsService';
import {
  formatMoney,
  formatPaymentDate,
  getDefaultPaymentFilter,
  getPaymentStatusTone,
  getPaymentTypeBadge,
} from '../../utils/paymentFields';
import PaymentsFilterSheet from '../../components/payments/PaymentsFilterSheet';
import InvoiceSheet from '../../components/payments/InvoiceSheet';
import { toast } from '../../utils/toast';
import { useDockInset } from '../../navigation/DockInsetContext';
import { adTokens } from '../../theme/colors';

const TONES = {
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  danger: { bg: adTokens.dangerLight, color: adTokens.dangerDark },
  warning: { bg: adTokens.warningLight, color: adTokens.warningDark },
  primary: { bg: adTokens.primaryLight, color: adTokens.primaryDark },
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
};

function Badge({ tone, children }) {
  const { bg, color } = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

function PaymentRow({ item, downloading, onInvoice }) {
  const typeBadge = getPaymentTypeBadge(item.paymentType);
  const isSuccess = getPaymentStatusTone(item.status) === 'success';

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowBody}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={adTokens.textMuted} />
            <Text style={styles.date}>{formatPaymentDate(item.paymentDate)}</Text>
          </View>
          <Text style={styles.transaction} numberOfLines={1}>
            #{item.transactionNumber}
          </Text>
        </View>
        <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
      </View>

      <View style={styles.badges}>
        <Badge tone={typeBadge.tone}>{typeBadge.label}</Badge>
        <Badge tone={getPaymentStatusTone(item.status)}>{item.status || 'Unknown'}</Badge>
      </View>

      <Pressable
        style={[styles.invoiceButton, !isSuccess && styles.invoiceButtonDisabled]}
        disabled={!isSuccess || downloading}
        onPress={() => onInvoice(item.paymentId)}
        accessibilityLabel="Download invoice"
      >
        {downloading ? (
          <ActivityIndicator size="small" color={adTokens.primary} />
        ) : (
          <MaterialCommunityIcons
            name="download-outline"
            size={18}
            color={isSuccess ? adTokens.primaryDark : adTokens.textMuted}
          />
        )}
        <Text style={[styles.invoiceText, !isSuccess && styles.invoiceTextDisabled]}>
          {isSuccess ? 'Download Invoice' : 'Invoice available for successful payments only'}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Patient "Payments" - port of AllyDocReactApp's module/Patient/Pages/Payments: the payment
 * history from `POST /GetAllPayments` (default: successful payments from 1 Jan to the end of this
 * month), filterable by status, payment type and date range, with the invoice of each successful
 * payment (`POST /GetPaymentInvoice`) shown in a sheet that can be shared.
 */
export default function PatientPaymentsPage() {
  const dockInset = useDockInset();
  const [filter, setFilter] = useState(getDefaultPaymentFilter);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const requestCounter = useRef(0);

  const load = useCallback(async () => {
    // Only the newest request may write state - a slow earlier one must not overwrite it.
    const requestId = (requestCounter.current += 1);
    setIsLoading(true);
    setLoadError(null);
    const result = await getAllPayments(filter);
    if (requestId !== requestCounter.current) return;

    if (!result.success) {
      // The web treats "no data" as an empty list; anything else is a real error.
      const noData = result.data === null && result.statusCode != null;
      setPayments([]);
      setLoadError(noData ? null : result.message || 'Unable to load payments.');
    } else {
      setPayments(Array.isArray(result.data) ? result.data : []);
    }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openInvoice = async (paymentId) => {
    if (downloadingId) return;
    setDownloadingId(paymentId);
    const result = await getPaymentInvoice(paymentId);
    setDownloadingId(null);
    if (!result.success || !result.data) {
      toast.error(result.message || 'Failed to generate invoice.');
      return;
    }
    setInvoice(result.data);
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.subtitle}>Check history of payments you have made.</Text>
      <Pressable style={styles.filterButton} onPress={() => setFilterOpen(true)} accessibilityLabel="Filter payments">
        <MaterialCommunityIcons name="filter-variant" size={16} color={adTokens.primaryDark} />
        <Text style={styles.filterText}>Filter</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.flex1}>
      <FlatList
        data={isLoading || loadError ? [] : payments}
        keyExtractor={(item, index) => String(item.paymentId ?? index)}
        renderItem={({ item }) => (
          <PaymentRow item={item} downloading={downloadingId === item.paymentId} onInvoice={openInvoice} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + dockInset }]}
        refreshControl={<RefreshControl refreshing={isLoading && payments.length > 0} onRefresh={load} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={adTokens.primary} />
              <Text style={styles.stateText}>Loading payments...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
              <Text style={styles.stateText}>{loadError}</Text>
              <Pressable style={styles.retryButton} onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.state}>
              <MaterialCommunityIcons name="wallet-outline" size={30} color={adTokens.textMuted} />
              <Text style={styles.stateTitle}>No Record Found!</Text>
              <Text style={styles.stateText}>There are no payments for the selected filters.</Text>
            </View>
          )
        }
      />

      <PaymentsFilterSheet visible={filterOpen} filter={filter} onApply={setFilter} onClose={() => setFilterOpen(false)} />
      <InvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16 },
  separator: { height: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  subtitle: { flex: 1, fontSize: 13, color: adTokens.textSecondary },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: adTokens.primaryLight,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },

  row: {
    padding: 12,
    gap: 10,
    borderRadius: adTokens.cardBorderRadius,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    ...adTokens.cardShadow,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBody: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 13, color: adTokens.textSecondary },
  transaction: { fontSize: 14.5, fontWeight: '700', color: adTokens.textPrimary },
  amount: { fontSize: 18, fontWeight: '800', color: adTokens.textPrimary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: adTokens.primaryLight,
  },
  invoiceButtonDisabled: { backgroundColor: adTokens.gray100 },
  invoiceText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  invoiceTextDisabled: { fontSize: 12, fontWeight: '500', color: adTokens.textMuted },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  stateText: { fontSize: 13, color: adTokens.textSecondary, textAlign: 'center' },
  retryButton: { marginTop: 6, paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: adTokens.primary },
  retryText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
});
