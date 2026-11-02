import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchAppointmentsBasedOnDate,
  fetchDoctorAppointments,
  completeAppointment,
  cancelAppointmentThunk,
  fetchAppointmentNotes,
  saveAppointmentNotesThunk,
  fetchDoctorAppointmentsList,
  updateAppointmentThunk,
  fetchAppointmentRecordingLink,
} from '../store/slices/manageAppointmentsSlice';

export function useManageAppointments() {
  const dispatch = useDispatch();

  const getAppointmentsBasedOnDate = useCallback(
    (date) => dispatch(fetchAppointmentsBasedOnDate(date)).unwrap(),
    [dispatch],
  );

  const getDoctorAppointments = useCallback(
    (doctorId, status) => dispatch(fetchDoctorAppointments({ doctorId, status })).unwrap(),
    [dispatch],
  );

  const markAppointmentComplete = useCallback(
    (appointmentId, remarks) => dispatch(completeAppointment({ appointmentId, remarks })).unwrap(),
    [dispatch],
  );

  const cancelAppointment = useCallback(
    (appointmentId, cancelReason) => dispatch(cancelAppointmentThunk({ appointmentId, cancelReason })).unwrap(),
    [dispatch],
  );

  const getAppointmentNotes = useCallback(
    (appointmentId) => dispatch(fetchAppointmentNotes(appointmentId)).unwrap(),
    [dispatch],
  );

  const saveAppointmentNotes = useCallback(
    (appointmentId, userId, notes) =>
      dispatch(saveAppointmentNotesThunk({ appointmentId, userId, notes })).unwrap(),
    [dispatch],
  );

  const getDoctorAppointmentsList = useCallback(
    (doctorId, filter) => dispatch(fetchDoctorAppointmentsList({ doctorId, filter })).unwrap(),
    [dispatch],
  );

  const updateAppointment = useCallback(
    (appointmentId, appointmentDate, appointMentTime, rescheduleReason) =>
      dispatch(updateAppointmentThunk({ appointmentId, appointmentDate, appointMentTime, rescheduleReason })).unwrap(),
    [dispatch],
  );

  const getAppointmentRecordingLink = useCallback(
    (appointmentId, forceSync = false) =>
      dispatch(fetchAppointmentRecordingLink({ appointmentId, forceSync })).unwrap(),
    [dispatch],
  );

  return {
    getAppointmentsBasedOnDate,
    getDoctorAppointments,
    markAppointmentComplete,
    cancelAppointment,
    getAppointmentNotes,
    saveAppointmentNotes,
    getDoctorAppointmentsList,
    updateAppointment,
    getAppointmentRecordingLink,
  };
}
