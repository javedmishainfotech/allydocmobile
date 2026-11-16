import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchTreatmentPlansList,
  fetchTreatmentPlanDetails,
  saveTranscriptData,
  fetchMedicineStock,
  addMedicine,
  deleteMedicine,
} from '../store/slices/treatmentPlanSlice';

/** Thin unwrap-based wrapper around the treatment-plan slice's thunks, with the exact same call
 * signature as before - see treatmentPlanSlice.js for why these resolve with the full result
 * envelope. */
export function useTreatmentPlan() {
  const dispatch = useDispatch();

  const getTreatmentPlansList = useCallback(
    (filter) => dispatch(fetchTreatmentPlansList(filter)).unwrap(),
    [dispatch],
  );

  const getTreatmentPlanDetails = useCallback(
    (appointmentId) => dispatch(fetchTreatmentPlanDetails(appointmentId)).unwrap(),
    [dispatch],
  );

  const saveTranscript = useCallback(
    (params) => dispatch(saveTranscriptData(params)).unwrap(),
    [dispatch],
  );

  const getAllActiveMedicineStock = useCallback(
    () => dispatch(fetchMedicineStock()).unwrap(),
    [dispatch],
  );

  const addMedicineItem = useCallback(
    (params) => dispatch(addMedicine(params)).unwrap(),
    [dispatch],
  );

  const deleteMedicineItem = useCallback(
    (id) => dispatch(deleteMedicine(id)).unwrap(),
    [dispatch],
  );

  return {
    getTreatmentPlansList,
    getTreatmentPlanDetails,
    saveTranscriptData: saveTranscript,
    getAllActiveMedicineStock,
    addMedicine: addMedicineItem,
    deleteMedicine: deleteMedicineItem,
  };
}
