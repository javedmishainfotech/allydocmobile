import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { fetchAllPayments, fetchPaymentInvoice } from '../store/slices/patientPaymentsSlice';

/** Thin unwrap-based wrapper around the patient-payments slice's thunks, with the exact same call
 * signature as before - see patientPaymentsSlice.js for why these resolve with the full result
 * envelope. */
export function usePatientPayments() {
  const dispatch = useDispatch();

  const getAllPayments = useCallback(
    (filter) => dispatch(fetchAllPayments(filter)).unwrap(),
    [dispatch],
  );

  const getPaymentInvoice = useCallback(
    (paymentId) => dispatch(fetchPaymentInvoice(paymentId)).unwrap(),
    [dispatch],
  );

  return { getAllPayments, getPaymentInvoice };
}
