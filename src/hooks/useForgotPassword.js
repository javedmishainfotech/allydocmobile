import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  sendResetCode,
  resendResetCode,
  verifyResetCode,
  resetPassword,
} from '../store/slices/forgotPasswordSlice';

/** Thin unwrap-based wrapper around the forgot-password slice's thunks, with the exact same call
 * signature as before - see forgotPasswordSlice.js for why these resolve with the full result
 * envelope. */
export function useForgotPassword() {
  const dispatch = useDispatch();

  const sendCode = useCallback((email) => dispatch(sendResetCode(email)).unwrap(), [dispatch]);

  const resendCode = useCallback((email) => dispatch(resendResetCode(email)).unwrap(), [dispatch]);

  const verifyCode = useCallback(
    (params) => dispatch(verifyResetCode(params)).unwrap(),
    [dispatch],
  );

  const reset = useCallback((params) => dispatch(resetPassword(params)).unwrap(), [dispatch]);

  return {
    sendResetCode: sendCode,
    resendResetCode: resendCode,
    verifyResetCode: verifyCode,
    resetPassword: reset,
  };
}
