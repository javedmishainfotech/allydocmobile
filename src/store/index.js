import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orgReducer from './slices/orgSlice';
import doctorDashboardReducer from './slices/doctorDashboardSlice';
import menuReducer from './slices/menuSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    org: orgReducer,
    doctorDashboard: doctorDashboardReducer,
    menu: menuReducer,
    notifications: notificationReducer,
  },
});
