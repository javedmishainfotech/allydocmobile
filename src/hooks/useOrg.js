import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setOrgName, resetOrg } from '../store/slices/orgSlice';

/** Custom hook sitting between the org slice and pages - same pattern as useAuth. */
export function useOrg() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.org);

  const chooseOrg = useCallback((orgName) => dispatch(setOrgName(orgName)), [dispatch]);
  const clearOrg = useCallback(() => dispatch(resetOrg()), [dispatch]);

  return { ...state, chooseOrg, clearOrg };
}
