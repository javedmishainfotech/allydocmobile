// Port of AllyDocReactApp/src/utils/paymentFlow.js - the parts the payment checkout needs.

/** Reads the hosted-payment token out of the several shapes the purchase / renew / booking
 * endpoints return it in (the API body, or a response that wraps it). */
export const extractPaymentToken = (body) => {
  if (!body) return null;
  const apiBody = body?.data?.status !== undefined ? body.data : body;
  const data = apiBody?.data;

  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') return data.token ?? data.paymentToken ?? data.auth_token ?? null;
  return apiBody?.token ?? apiBody?.paymentToken ?? apiBody?.auth_token ?? null;
};

/**
 * After paying, Authorize.Net redirects the browser to the web app's `/success/<token>` or
 * `/failure/<token>` page (or `?token=`). The app watches the checkout WebView for that URL and
 * runs the page's confirmation call itself. Returns { kind: 'success' | 'failure', token, type }
 * for such a URL, else null.
 */
export function parsePaymentReturnUrl(url) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+\/(success|failure)(?=[/?#]|$)(?:\/([^/?#]+))?(\?[^#]*)?/i.exec(String(url || ''));
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const query = new URLSearchParams(match[3] ? match[3].slice(1) : '');
  let token = match[2] ? decodeURIComponent(match[2]) : query.get('token');
  let type = query.get('type') || query.get('flow');

  if (token?.includes('?')) {
    const [cleanToken, nested] = token.split('?');
    const nestedParams = new URLSearchParams(nested);
    token = cleanToken;
    type = type || nestedParams.get('type') || nestedParams.get('flow');
  }
  return { kind, token: token || null, type: type || null };
}

export const PAYMENT_RESULT_TYPES = {
  PURCHASE_SUBSCRIPTION: 'BS',
  RENEW_SUBSCRIPTION: 'BR',
  ONE_TIME_APPOINTMENT: 'OT',
};

const PAYMENT_RESULT_CONFIG = {
  success: {
    BS: {
      title: 'Subscription Purchase Success',
      message: 'Your subscription payment is successful!',
      description: 'Your subscription plan has been activated successfully.',
    },
    BR: {
      title: 'Subscription Renewal Success',
      message: 'Your subscription renewal payment is successful!',
      description: 'Your subscription plan has been renewed successfully.',
    },
    OT: {
      title: 'Appointment Booking Success',
      message: 'Your payment is successful!',
      description: 'You will be notified once the Doctor has accepted your appointment request.',
    },
    default: {
      title: 'Subscription Activate + Appointment Booking Success',
      message: 'Your subscription payment is successful!',
      description:
        'Your subscription plan has been activated and your appointment is booked successfully. You will be notified once the Doctor has accepted your appointment request.',
    },
  },
  failure: {
    BS: { title: 'Subscription Purchase Failure', message: 'Your subscription payment has failed!' },
    BR: { title: 'Subscription Renewal Failure', message: 'Your subscription renewal payment has failed!' },
    OT: { title: 'Appointment Booking Failure', message: 'Your payment has failed!' },
    default: {
      title: 'Subscription Purchase + Appointment Booking Failure',
      message: 'Your subscription payment has failed and your appointment booking could not be completed.',
    },
  },
};

export const getPaymentResultConfig = (status, type) => {
  const statusConfig = PAYMENT_RESULT_CONFIG[status] || PAYMENT_RESULT_CONFIG.success;
  return statusConfig[type] || statusConfig.default;
};
