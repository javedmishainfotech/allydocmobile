import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import TreatmentPlanList from '../../components/treatmentPlan/TreatmentPlanList';
import { doctorPerson } from '../../components/appointments/AppointmentFilterSheet';

const EMPTY_FILTER = { status: [], fromDate: '', toDate: '', doctorId: '', doctorName: '' };

/** Patient "Treatment Plan" - web module/Patient/Pages/TreatmentPlan: the shared treatment-plan
 * list, filtered by the patient's own doctors (`GET /PatientDoctorDropdown/{id}`). */
export default function PatientTreatmentPlanPage() {
  const { profile } = useAuth();
  const { getPatientDoctorDropdown } = usePatientAppointments();
  const patientId = profile?.userId;
  const person = useMemo(
    () =>
      doctorPerson(() =>
        getPatientDoctorDropdown(patientId)
          .then((data) => ({ success: true, data }))
          .catch((message) => ({ success: false, message })),
      ),
    [patientId, getPatientDoctorDropdown],
  );

  return <TreatmentPlanList person={person} emptyFilter={EMPTY_FILTER} />;
}
