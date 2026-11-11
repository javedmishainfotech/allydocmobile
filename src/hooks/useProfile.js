import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  createPatientProfile,
  updatePatientProfile,
} from '../store/slices/profileSlice';

/** Thin unwrap-based wrapper around the profile slice's thunks, with the exact same call
 * signature as before - see profileSlice.js for why these resolve with the full result envelope.
 * `createDoctorProfile`/`updateDoctorProfile` are exposed as aliases of the same two thunks,
 * matching profileService.js's own aliasing. */
export function useProfile() {
  const dispatch = useDispatch();

  const createProfile = useCallback(
    (formData) => dispatch(createPatientProfile(formData)).unwrap(),
    [dispatch],
  );

  const updateProfile = useCallback(
    (formData) => dispatch(updatePatientProfile(formData)).unwrap(),
    [dispatch],
  );

  return {
    createPatientProfile: createProfile,
    updatePatientProfile: updateProfile,
    createDoctorProfile: createProfile,
    updateDoctorProfile: updateProfile,
  };
}
