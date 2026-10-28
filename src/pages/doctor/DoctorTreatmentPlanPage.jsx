import React from 'react';
import TreatmentPlanList from '../../components/treatmentPlan/TreatmentPlanList';
import { PATIENT_PERSON, EMPTY_APPOINTMENT_FILTER } from '../../components/appointments/AppointmentFilterSheet';

/** Doctor / Nurse "Treatment Plan" - web module/Doctor/Pages/DoctorTreatmentPlan: the shared
 * treatment-plan list (same `GET /AllTreatmentPlanListV2` the patient's own Treatment Plan page
 * uses - the backend resolves the signed-in user's role server-side), filtered by patient
 * (`GET /DoctorPatientDropdown`, the same dropdown the appointment list's filter sheet uses). */
export default function DoctorTreatmentPlanPage() {
  return <TreatmentPlanList person={PATIENT_PERSON} emptyFilter={EMPTY_APPOINTMENT_FILTER} />;
}
