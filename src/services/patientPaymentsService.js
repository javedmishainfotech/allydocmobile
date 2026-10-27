import apiClient from '../api/client';
import { callApi } from '../utils/apiResponse';

/** Mirrors GetAllPaymentsAction (module/Patient/Pages/Payments/action.js): `POST /GetAllPayments`
 * with the filter as the body. */
export function getAllPayments(filter) {
  return callApi(() => apiClient.post('/GetAllPayments', filter));
}

/** Mirrors GetPaymentInvoiceAction: the invoice data of one successful payment. */
export function getPaymentInvoice(paymentId) {
  return callApi(() => apiClient.post(`/GetPaymentInvoice?paymentId=${encodeURIComponent(paymentId)}`));
}
