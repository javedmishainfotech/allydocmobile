import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addUser, resetUserManagementStatus } from '../store/slices/userManagementSlice';

export function useUserManagement() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.userManagement);

  const createUser = useCallback((values) => dispatch(addUser(values)).unwrap(), [dispatch]);
  const reset = useCallback(() => dispatch(resetUserManagementStatus()), [dispatch]);

  return { ...state, createUser, reset };
}
