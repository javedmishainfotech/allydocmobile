import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser,
  logoutUser,
  bootstrapAuth,
  updateTempPassword,
  dismissAccountDisabledMessage,
} from '../store/slices/authSlice';

/**
 * Custom hook sitting between the Redux slice and pages/components - pages
 * never touch `dispatch`/`useSelector` directly, they just call this hook.
 */
export function useAuth() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.auth);

  const login = useCallback(
    (payload) => dispatch(loginUser(payload)),
    [dispatch],
  );
  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);
  const bootstrap = useCallback(() => dispatch(bootstrapAuth()), [dispatch]);
  const setNewPassword = useCallback(
    (payload) => dispatch(updateTempPassword(payload)),
    [dispatch],
  );
  const dismissAccountDisabled = useCallback(
    () => dispatch(dismissAccountDisabledMessage()),
    [dispatch],
  );

  return {
    ...state,
    login,
    logout,
    bootstrap,
    setNewPassword,
    dismissAccountDisabled,
  };
}
