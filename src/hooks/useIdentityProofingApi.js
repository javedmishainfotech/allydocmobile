import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  createIdp,
  submitIdpAnswers,
  fetchRegistrationStatus,
  fetchLegalAgreement,
  acceptLegalAgreement,
  fetchIdpDisclaimer,
  acceptIdpDisclaimer,
  fetchStates,
  fetchCitiesByStateId,
  sendMobileTfa,
  tfaActivate,
  updatePin,
  requestTfaActivation,
} from '../store/slices/identityProofingSlice';

/** Thin unwrap-based wrapper around the identity-proofing slice's thunks, with the exact same
 * call signature as before - see identityProofingSlice.js for why these resolve with the full
 * result envelope. Named `useIdentityProofingApi` (not `useIdentityProofing`) to avoid colliding
 * with `IdentityProofingContext.jsx`'s own `useIdentityProofing()` context hook - that's the
 * established public API for the IDP flow's screen state, unrelated to this slice. */
export function useIdentityProofingApi() {
  const dispatch = useDispatch();

  const createIdpFn = useCallback((payload) => dispatch(createIdp(payload)).unwrap(), [dispatch]);

  const submitIdpAnswersFn = useCallback(
    (payload) => dispatch(submitIdpAnswers(payload)).unwrap(),
    [dispatch],
  );

  const getRegistrationStatus = useCallback(
    (clinicianId) => dispatch(fetchRegistrationStatus(clinicianId)).unwrap(),
    [dispatch],
  );

  const getLegalAgreement = useCallback(
    (clinicianId) => dispatch(fetchLegalAgreement(clinicianId)).unwrap(),
    [dispatch],
  );

  const acceptLegalAgreementFn = useCallback(
    (params) => dispatch(acceptLegalAgreement(params)).unwrap(),
    [dispatch],
  );

  const getIdpDisclaimer = useCallback(() => dispatch(fetchIdpDisclaimer()).unwrap(), [dispatch]);

  const acceptIdpDisclaimerFn = useCallback(
    (payload) => dispatch(acceptIdpDisclaimer(payload)).unwrap(),
    [dispatch],
  );

  const getStates = useCallback(() => dispatch(fetchStates()).unwrap(), [dispatch]);

  const getCitiesByStateId = useCallback(
    (stateId) => dispatch(fetchCitiesByStateId(stateId)).unwrap(),
    [dispatch],
  );

  const sendMobileTfaFn = useCallback(
    (params) => dispatch(sendMobileTfa(params)).unwrap(),
    [dispatch],
  );

  const tfaActivateFn = useCallback((params) => dispatch(tfaActivate(params)).unwrap(), [dispatch]);

  const updatePinFn = useCallback((params) => dispatch(updatePin(params)).unwrap(), [dispatch]);

  const requestTfaActivationFn = useCallback(
    () => dispatch(requestTfaActivation()).unwrap(),
    [dispatch],
  );

  return {
    createIdp: createIdpFn,
    submitIdpAnswers: submitIdpAnswersFn,
    getRegistrationStatus,
    getLegalAgreement,
    acceptLegalAgreement: acceptLegalAgreementFn,
    getIdpDisclaimer,
    acceptIdpDisclaimer: acceptIdpDisclaimerFn,
    getStates,
    getCitiesByStateId,
    sendMobileTfa: sendMobileTfaFn,
    tfaActivate: tfaActivateFn,
    updatePin: updatePinFn,
    requestTfaActivation: requestTfaActivationFn,
  };
}
