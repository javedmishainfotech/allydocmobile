import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as patientPaymentsService from '../../services/patientPaymentsService';

/** Same thin, unwrap-only shape as the other recent slices - both consumers already branch on
 * `result.success`/`result.message` directly, so these thunks always fulfill with the full raw
 * result object. */
const initialState = {};

export const fetchAllPayments = createAsyncThunk('patientPayments/fetchAllPayments', (filter) =>
  patientPaymentsService.getAllPayments(filter),
);

export const fetchPaymentInvoice = createAsyncThunk(
  'patientPayments/fetchPaymentInvoice',
  (paymentId) => patientPaymentsService.getPaymentInvoice(paymentId),
);

const patientPaymentsSlice = createSlice({
  name: 'patientPayments',
  initialState,
  reducers: {},
});

export default patientPaymentsSlice.reducer;
