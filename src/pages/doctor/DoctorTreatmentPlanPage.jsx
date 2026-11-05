import React, { useMemo } from 'react';
import { useRoute } from '@react-navigation/native';
import TreatmentPlanList from '../../components/treatmentPlan/TreatmentPlanList';
import { patientPerson, noPerson, EMPTY_APPOINTMENT_FILTER } from '../../components/appointments/AppointmentFilterSheet';
import { usePatients } from '../../hooks/usePatients';
import { useAuth } from '../../hooks/useAuth';

/** Doctor / Nurse "Treatment Plan" - web module/Doctor/Pages/DoctorTreatmentPlan: the shared
 * treatment-plan list (same `GET /AllTreatmentPlanListV2` the patient's own Treatment Plan page
 * uses - the backend resolves the signed-in user's role server-side), filtered by patient
 * (`GET /DoctorPatientDropdown`, the same dropdown the appointment list's filter sheet uses).
 * A Nurse has no "my own patients" concept the way a doctor does, so web's personFilterType is
 * 'none' for her - the Patient filter is dropped entirely (status + dates only).
 *
 * `route.params.initialPatientId`/`initialPatientName`: set when this screen is opened from the
 * Patients list row's Treatment Plans icon (web: patients/:id/treatment-plans - a per-patient
 * treatment-plan list). This app has no standalone per-patient list screen/endpoint ported, so it
 * reuses this shared list pre-filtered to that patient instead, which shows the same data. */
export default function DoctorTreatmentPlanPage() {
  const { getDoctorPatientDropdown } = usePatients();
  const { profile } = useAuth();
  const route = useRoute();
  const initialPatientId = route.params?.initialPatientId;
  const initialPatientName = route.params?.initialPatientName;
  const isNurse = String(profile?.roleName || '').toLowerCase().trim() === 'nurse';
  const person = useMemo(
    () =>
      isNurse
        ? noPerson()
        : patientPerson(() =>
            getDoctorPatientDropdown()
              .then((data) => ({ success: true, data }))
              .catch((message) => ({ success: false, message })),
          ),
    [isNurse, getDoctorPatientDropdown],
  );
  const emptyFilter = useMemo(
    () =>
      initialPatientId
        ? { ...EMPTY_APPOINTMENT_FILTER, patientId: String(initialPatientId), patientName: initialPatientName || '' }
        : EMPTY_APPOINTMENT_FILTER,
    [initialPatientId, initialPatientName],
  );
  // Keyed on the patient so re-navigating here (push a new route.params) for a different patient
  // re-mounts the list with the new pre-filter instead of keeping the previous patient's filter.
  return <TreatmentPlanList key={initialPatientId || 'all'} person={person} emptyFilter={emptyFilter} />;
}
