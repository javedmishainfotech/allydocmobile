import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatMoney, formatPaymentDate } from '../../utils/paymentFields';
import { adTokens } from '../../theme/colors';

const safeText = (value) => (value === null || value === undefined || String(value).trim() === '' ? '—' : String(value));

function statusStyle(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success') return { bg: adTokens.successLight, color: adTokens.successDark, label: 'PAID' };
  if (normalized === 'failure') return { bg: adTokens.dangerLight, color: adTokens.dangerDark, label: 'FAILED' };
  return { bg: adTokens.warningLight, color: adTokens.warningDark, label: 'PENDING' };
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** The invoice as a plain-text summary, for the Share action. */
function buildShareText(invoice) {
  const lines = [
    `Invoice ${safeText(invoice.invoiceNumber)}`,
    `Payment date: ${formatPaymentDate(invoice.paymentDate)}`,
    `Payment type: ${safeText(invoice.paymentType)}`,
    `Transaction no.: ${safeText(invoice.transactionNumber)}`,
    `Amount: ${formatMoney(invoice.amount)}`,
    `Billed to: ${safeText(invoice.patientName)}`,
  ];
  if (invoice.subscriptionPlanName) lines.push(`Plan: ${invoice.subscriptionPlanName}`);
  return lines.join('\n');
}

/**
 * The invoice of a successful payment (`POST /GetPaymentInvoice`). The web renders this into a
 * PDF; on the phone the same data - invoice header, billed-to, payment and subscription details,
 * summary - is shown in a sheet, with Share to send it on. (A PDF export would need `expo-print`.)
 */
export default function InvoiceSheet({ invoice, onClose }) {
  const insets = useSafeAreaInsets();
  if (!invoice) return null;

  const status = statusStyle(invoice.status);
  const isSubscription =
    !!invoice.subscriptionPlanName || String(invoice.paymentType || '').toLowerCase().includes('subscription');
  const allowed = invoice.subscriptionAllowedAppointments;
  const used = invoice.subscriptionUsedAppointments;
  const remaining = allowed != null && used != null ? Math.max(Number(allowed) - Number(used), 0) : null;
  const hasCard = !!(invoice.cardType || invoice.cardLast4 || invoice.gatewayTransId);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Invoice</Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amount}>{formatMoney(invoice.amount)}</Text>
            </View>

            <Section title="Invoice">
              <Row label="Invoice No." value={safeText(invoice.invoiceNumber)} />
              <Row label="Payment Date" value={formatPaymentDate(invoice.paymentDate)} />
              <Row label="Payment Type" value={safeText(invoice.paymentType)} />
              <Row label="Transaction No." value={safeText(invoice.transactionNumber)} />
            </Section>

            <Section title="Billed To">
              <Row label="Name" value={safeText(invoice.patientName)} />
              <Row label="Email" value={safeText(invoice.patientEmail)} />
              <Row label="Phone" value={safeText(invoice.patientPhone)} />
            </Section>

            {hasCard ? (
              <Section title="Payment Details">
                <Row label="Card type" value={safeText(invoice.cardType)} />
                <Row label="Card number" value={invoice.cardLast4 ? `•••• •••• •••• ${invoice.cardLast4}` : '—'} />
                <Row label="Cardholder" value={safeText(invoice.cardholderName)} />
                <Row label="Gateway ID" value={safeText(invoice.gatewayTransId)} />
              </Section>
            ) : null}

            {isSubscription ? (
              <Section title="Subscription Details">
                <Row label="Plan" value={safeText(invoice.subscriptionPlanName)} />
                <Row label="Valid From" value={formatPaymentDate(invoice.subscriptionValidFrom)} />
                <Row label="Valid Till" value={formatPaymentDate(invoice.subscriptionValidTill)} />
                <Row label="Allowed Appointments" value={safeText(allowed)} />
                <Row label="Used Appointments" value={safeText(used)} />
                <Row label="Remaining Appointments" value={remaining == null ? '—' : String(remaining)} />
              </Section>
            ) : null}

            <Section title="Invoice Summary">
              <Row
                label="Description"
                value={
                  isSubscription
                    ? `${safeText(invoice.subscriptionPlanName)} - ${safeText(invoice.paymentType)}`
                    : safeText(invoice.paymentType)
                }
              />
              <Row label="Total" value={formatMoney(invoice.amount)} />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <Pressable
              style={styles.shareButton}
              onPress={() => Share.share({ message: buildShareText(invoice) })}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={adTokens.white} />
              <Text style={styles.shareText}>Share</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
  statusPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999 },
  statusText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5 },

  amountBox: { alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: adTokens.primaryLight, marginBottom: 12 },
  amountLabel: { fontSize: 12, color: adTokens.textSecondary },
  amount: { fontSize: 30, fontWeight: '800', color: adTokens.primaryDark, marginTop: 2 },

  section: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 13.5, fontWeight: '800', color: adTokens.primaryDark },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 12.5, color: adTokens.textSecondary },
  rowValue: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: adTokens.textPrimary, textAlign: 'right' },

  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  closeButton: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  closeText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: adTokens.primary,
  },
  shareText: { fontSize: 14, fontWeight: '700', color: adTokens.white },
});
