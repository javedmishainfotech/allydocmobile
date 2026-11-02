import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orgReducer from './slices/orgSlice';
import doctorDashboardReducer from './slices/doctorDashboardSlice';
import menuReducer from './slices/menuSlice';
import notificationReducer from './slices/notificationSlice';
import nurseDashboardReducer from './slices/nurseDashboardSlice';
import nursePendingAppointmentsReducer from './slices/nursePendingAppointmentsSlice';
import userManagementReducer from './slices/userManagementSlice';
import patientDashboardReducer from './slices/patientDashboardSlice';
import patientsReducer from './slices/patientsSlice';
import patientAppointmentsReducer from './slices/patientAppointmentsSlice';
import manageAppointmentsReducer from './slices/manageAppointmentsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    org: orgReducer,
    doctorDashboard: doctorDashboardReducer,
    menu: menuReducer,
    notifications: notificationReducer,
    nurseDashboard: nurseDashboardReducer,
    nursePendingAppointments: nursePendingAppointmentsReducer,
    userManagement: userManagementReducer,
    patientDashboard: patientDashboardReducer,
    patients: patientsReducer,
    patientAppointments: patientAppointmentsReducer,
    manageAppointments: manageAppointmentsReducer,
  },
});
