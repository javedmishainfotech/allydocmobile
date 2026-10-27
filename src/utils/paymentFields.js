// Display helpers for the patient Payments screen - ports of the status / type badge mappers in
// AllyDocReactApp's module/Patient/Pages/Payments/index.jsx.

/** Tone of a payment status badge. */
export function getPaymentStatusTone(status) {
  const normalized = String(status || '').toLowerCase().trim();
  if (normalized === 'success' || normalized === 'paid' || normalized === 's') return 'success';
  if (normalized === 'failure' || normalized === 'failed' || normalized === 'f') return 'danger';
  if (normalized === 'pending' || normalized === 'processing') return 'warning';
  return 'neutral';
}

/** Label + tone of a payment-type badge. */
export function getPaymentTypeBadge(paymentType) {
  const normalized = String(paymentType || '').toLowerCase().trim();
  if (normalized.includes('subscription') || normalized === 'bs') {
    return { label: paymentType || 'Subscription', tone: 'primary' };
  }
  if (normalized.includes('one-time') || normalized.includes('one time') || normalized === 'ot') {
    return { label: paymentType || 'One-Time Payment', tone: 'info' };
  }
  return { label: paymentType || 'N/A', tone: 'neutral' };
}

/** The web's default filter: successful payments from 1 Jan to the end of the current month. */
export function getDefaultPaymentFilter() {
  const now = new Date();
  return {
    paymentStatus: 'S',
    type: '',
    code: '',
    transactionNumber: '',
    paymentType: '',
    dateFrom: new Date(now.getFullYear(), 0, 1).toISOString(),
    dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
  };
}

export const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export function formatPaymentDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
