import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu } from '../store/slices/menuSlice';

export function useMenu() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.menu);
  const loadMenu = useCallback((userId) => dispatch(fetchMenu(userId)), [dispatch]);
  return { ...state, loadMenu };
}
