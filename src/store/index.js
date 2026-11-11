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
import bookingReducer from './slices/bookingSlice';
import callReducer from './slices/callSlice';
import chatReducer from './slices/chatSlice';
import diseaseAssessmentReducer from './slices/diseaseAssessmentSlice';
import doctorsListReducer from './slices/doctorsListSlice';
import doseSpotClinicalReducer from './slices/doseSpotClinicalSlice';
import forgotPasswordReducer from './slices/forgotPasswordSlice';
import identityProofingReducer from './slices/identityProofingSlice';
import patientPaymentsReducer from './slices/patientPaymentsSlice';
import patientPharmacyReducer from './slices/patientPharmacySlice';
import pendingRequestDetailsReducer from './slices/pendingRequestDetailsSlice';
import prescriptionReducer from './slices/prescriptionSlice';
import profileReducer from './slices/profileSlice';
import registerReducer from './slices/registerSlice';
import settingsReducer from './slices/settingsSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import supportReducer from './slices/supportSlice';
import treatmentPlanReducer from './slices/treatmentPlanSlice';

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // uploadChatImages' onProgress callback is intentionally non-serializable (a progress
      // reporter, not state) - everything else still gets the default serializability check.
      serializableCheck: {
        ignoredActionPaths: ['meta.arg.onProgress'],
      },
    }),
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
    booking: bookingReducer,
    call: callReducer,
    chat: chatReducer,
    diseaseAssessment: diseaseAssessmentReducer,
    doctorsList: doctorsListReducer,
    doseSpotClinical: doseSpotClinicalReducer,
    forgotPassword: forgotPasswordReducer,
    identityProofing: identityProofingReducer,
    patientPayments: patientPaymentsReducer,
    patientPharmacy: patientPharmacyReducer,
    pendingRequestDetails: pendingRequestDetailsReducer,
    prescription: prescriptionReducer,
    profile: profileReducer,
    register: registerReducer,
    settings: settingsReducer,
    subscription: subscriptionReducer,
    support: supportReducer,
    treatmentPlan: treatmentPlanReducer,
  },
});
