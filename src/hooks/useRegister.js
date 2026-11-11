import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { registerUser, verifyRegistrationOtp } from '../store/slices/registerSlice';

/** Thin unwrap-based wrapper around the register slice's thunks, with the exact same call
 * signature as before - see registerSlice.js for why these resolve with the full result
 * envelope. */
export function useRegister() {
  const dispatch = useDispatch();

  const register = useCallback((values) => dispatch(registerUser(values)).unwrap(), [dispatch]);

  const verifyOtp = useCallback(
    (params) => dispatch(verifyRegistrationOtp(params)).unwrap(),
    [dispatch],
  );

  return { registerUser: register, verifyRegistrationOtp: verifyOtp };
}
