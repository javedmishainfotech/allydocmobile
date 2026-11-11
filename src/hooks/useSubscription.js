import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchSubscriptionPlansByClinic,
  purchaseSubscriptionPlan,
  renewSubscriptionPlan,
  fetchPatientSubscriptionHistory,
  fetchSubscriptionInvoice,
  confirmSuccessfulPayment,
  confirmFailedPayment,
} from '../store/slices/subscriptionSlice';

/** Thin unwrap-based wrapper around the subscription slice's thunks, with the exact same call
 * signature as before - see subscriptionSlice.js for why these resolve with the full result
 * envelope. */
export function useSubscription() {
  const dispatch = useDispatch();

  const getSubscriptionPlansByClinic = useCallback(
    (clinicCode) => dispatch(fetchSubscriptionPlansByClinic(clinicCode)).unwrap(),
    [dispatch],
  );

  const purchasePlan = useCallback(
    (params) => dispatch(purchaseSubscriptionPlan(params)).unwrap(),
    [dispatch],
  );

  const renewPlan = useCallback(
    (planId) => dispatch(renewSubscriptionPlan(planId)).unwrap(),
    [dispatch],
  );

  const getPatientSubscriptionHistory = useCallback(
    (params) => dispatch(fetchPatientSubscriptionHistory(params)).unwrap(),
    [dispatch],
  );

  const getSubscriptionInvoice = useCallback(
    (patientSubscriptionId) => dispatch(fetchSubscriptionInvoice(patientSubscriptionId)).unwrap(),
    [dispatch],
  );

  const confirmSuccess = useCallback(
    (token) => dispatch(confirmSuccessfulPayment(token)).unwrap(),
    [dispatch],
  );

  const confirmFailed = useCallback(
    (token) => dispatch(confirmFailedPayment(token)).unwrap(),
    [dispatch],
  );

  return {
    getSubscriptionPlansByClinic,
    purchaseSubscriptionPlan: purchasePlan,
    renewSubscriptionPlan: renewPlan,
    getPatientSubscriptionHistory,
    getSubscriptionInvoice,
    confirmSuccessfulPayment: confirmSuccess,
    confirmFailedPayment: confirmFailed,
  };
}
