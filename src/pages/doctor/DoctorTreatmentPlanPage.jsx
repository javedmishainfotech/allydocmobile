import React, { useMemo } from 'react';
import TreatmentPlanList from '../../components/treatmentPlan/TreatmentPlanList';
import { patientPerson, EMPTY_APPOINTMENT_FILTER } from '../../components/appointments/AppointmentFilterSheet';
import { usePatients } from '../../hooks/usePatients';

/** Doctor / Nurse "Treatment Plan" - web module/Doctor/Pages/DoctorTreatmentPlan: the shared
 * treatment-plan list (same `GET /AllTreatmentPlanListV2` the patient's own Treatment Plan page
 * uses - the backend resolves the signed-in user's role server-side), filtered by patient
 * (`GET /DoctorPatientDropdown`, the same dropdown the appointment list's filter sheet uses). */
export default function DoctorTreatmentPlanPage() {
  const { getDoctorPatientDropdown } = usePatients();
  const person = useMemo(
    () =>
      patientPerson(() =>
        getDoctorPatientDropdown()
          .then((data) => ({ success: true, data }))
          .catch((message) => ({ success: false, message })),
      ),
    [getDoctorPatientDropdown],
  );
  return <TreatmentPlanList person={person} emptyFilter={EMPTY_APPOINTMENT_FILTER} />;
}
