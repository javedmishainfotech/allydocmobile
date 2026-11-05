import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

// Ports of module/Patient/Pages/Setting/action.js (subscriptions) and the payment-confirmation
// calls in components/BookAppointmentModal/Actions.js.

/** Plans a clinic offers. A freelancer has no clinic code - the backend then resolves their plans
 * from the signed-in token, so the code is sent empty. */
export async function getSubscriptionPlansByClinic(clinicCode) {
  try {
    const response = await apiClient.get(`/GetSubscriptionPlansByClinic?clinicCode=${encodeURIComponent(clinicCode || '')}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Starts buying a plan; resolves with the hosted-payment token. */
export async function purchaseSubscriptionPlan({ subscriptionId, amount }) {
  try {
    const response = await apiClient.post('/PurchaseSubscriptionPlan', { subscriptionId, amount });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Starts renewing onto a plan; resolves with the hosted-payment token. */
export async function renewSubscriptionPlan(planId) {
  try {
    const response = await apiClient.post(`/RenewSubscriptionPlan?newSubscriptionPlanId=${encodeURIComponent(planId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

export async function getPatientSubscriptionHistory({ page = 1, pageSize = 10 } = {}) {
  try {
    const response = await apiClient.get('/GetPatientSubscriptionHistory', { params: { page, pageSize } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Invoice data of one subscription purchase (shown in the same InvoiceSheet as a payment's). */
export async function getSubscriptionInvoice(patientSubscriptionId) {
  try {
    const response = await apiClient.get('/GetSubscriptionInvoice', { params: { patientSubscriptionId } });
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Confirms a payment with the backend after the gateway redirected back (web: SuccessPaymentAction). */
export async function confirmSuccessfulPayment(token) {
  try {
    const response = await apiClient.post(`/SuccessPayment/${encodeURIComponent(token)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Tells the backend the payment failed / was cancelled (web: FailurePaymentAction). */
export async function confirmFailedPayment(token) {
  try {
    const response = await apiClient.post(`/FailurePayment/${encodeURIComponent(token)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
