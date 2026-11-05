import apiClient from '../api/client';
import { normalizeApiBody, normalizeApiError } from '../utils/apiEnvelope';

/** Mirrors GetAllPaymentsAction (module/Patient/Pages/Payments/action.js): `POST /GetAllPayments`
 * with the filter as the body. */
export async function getAllPayments(filter) {
  try {
    const response = await apiClient.post('/GetAllPayments', filter);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}

/** Mirrors GetPaymentInvoiceAction: the invoice data of one successful payment. */
export async function getPaymentInvoice(paymentId) {
  try {
    const response = await apiClient.post(`/GetPaymentInvoice?paymentId=${encodeURIComponent(paymentId)}`);
    return normalizeApiBody(response.data, true);
  } catch (err) {
    if (err.response) return normalizeApiBody(err.response.data, false);
    return normalizeApiError(err);
  }
}
