import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, fetchUnreadCount, markNotificationRead } from '../store/slices/notificationSlice';

export function useNotifications() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState.notifications);

  const loadTab = useCallback((tab) => dispatch(fetchNotifications(tab)), [dispatch]);
  const refreshUnreadCount = useCallback(() => dispatch(fetchUnreadCount()), [dispatch]);
  const markAsRead = useCallback(
    (id, source) => dispatch(markNotificationRead({ id, source })),
    [dispatch],
  );

  return { ...state, loadTab, refreshUnreadCount, markAsRead };
}
