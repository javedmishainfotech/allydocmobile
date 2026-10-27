import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

// Ports of module/Patient/Pages/Setting/action.js (subscriptions) and the payment-confirmation
// calls in components/BookAppointmentModal/Actions.js.

/** Plans a clinic offers. A freelancer has no clinic code - the backend then resolves their plans
 * from the signed-in token, so the code is sent empty. */
export function getSubscriptionPlansByClinic(clinicCode) {
  return callApi(() => apiClient.get(`/GetSubscriptionPlansByClinic?clinicCode=${encodeURIComponent(clinicCode || '')}`));
}

/** Starts buying a plan; resolves with the hosted-payment token. */
export function purchaseSubscriptionPlan({ subscriptionId, amount }) {
  return callApi(() => apiClient.post('/PurchaseSubscriptionPlan', { subscriptionId, amount }));
}

/** Starts renewing onto a plan; resolves with the hosted-payment token. */
export function renewSubscriptionPlan(planId) {
  return callApi(() => apiClient.post(`/RenewSubscriptionPlan?newSubscriptionPlanId=${encodeURIComponent(planId)}`));
}

export function getPatientSubscriptionHistory({ page = 1, pageSize = 10 } = {}) {
  return callApi(() => apiClient.get('/GetPatientSubscriptionHistory', { params: { page, pageSize } }));
}

/** Invoice data of one subscription purchase (shown in the same InvoiceSheet as a payment's). */
export function getSubscriptionInvoice(patientSubscriptionId) {
  return callApi(() => apiClient.get('/GetSubscriptionInvoice', { params: { patientSubscriptionId } }));
}

/** Confirms a payment with the backend after the gateway redirected back (web: SuccessPaymentAction). */
export function confirmSuccessfulPayment(token) {
  return callApi(() => apiClient.post(`/SuccessPayment/${encodeURIComponent(token)}`));
}

/** Tells the backend the payment failed / was cancelled (web: FailurePaymentAction). */
export function confirmFailedPayment(token) {
  return callApi(() => apiClient.post(`/FailurePayment/${encodeURIComponent(token)}`));
}
