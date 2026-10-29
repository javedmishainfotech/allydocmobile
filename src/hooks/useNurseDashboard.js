import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNurseDashboard } from '../store/slices/nurseDashboardSlice';

export function useNurseDashboard() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.nurseDashboard);

  const refresh = useCallback((nurseId) => dispatch(fetchNurseDashboard(nurseId)), [dispatch]);

  return { ...state, refresh };
}
