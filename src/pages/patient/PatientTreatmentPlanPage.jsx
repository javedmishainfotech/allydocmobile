import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import TreatmentPlanList from '../../components/treatmentPlan/TreatmentPlanList';
import { doctorPerson } from '../../components/appointments/AppointmentFilterSheet';
import { getPatientDoctorDropdown } from '../../services/patientAppointmentsService';

const EMPTY_FILTER = { status: [], fromDate: '', toDate: '', doctorId: '', doctorName: '' };

/** Patient "Treatment Plan" - web module/Patient/Pages/TreatmentPlan: the shared treatment-plan
 * list, filtered by the patient's own doctors (`GET /PatientDoctorDropdown/{id}`). */
export default function PatientTreatmentPlanPage() {
  const { profile } = useAuth();
  const patientId = profile?.userId;
  const person = useMemo(() => doctorPerson(() => getPatientDoctorDropdown(patientId)), [patientId]);

  return <TreatmentPlanList person={person} emptyFilter={EMPTY_FILTER} />;
}
