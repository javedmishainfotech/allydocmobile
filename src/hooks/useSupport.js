import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  fetchMyTickets,
  fetchMyTicket,
  createTicket,
  replyToTicket,
  closeTicket,
} from '../store/slices/supportSlice';

/** Thin unwrap-based wrapper around the support slice's thunks, with the exact same call
 * signature as before - see supportSlice.js for why these resolve with the full result envelope,
 * and for which supportService exports are NOT part of this hook (pure helpers/constants, still
 * imported directly from the service). */
export function useSupport() {
  const dispatch = useDispatch();

  const getMyTickets = useCallback(
    (params) => dispatch(fetchMyTickets(params)).unwrap(),
    [dispatch],
  );

  const getMyTicket = useCallback((id) => dispatch(fetchMyTicket(id)).unwrap(), [dispatch]);

  const create = useCallback((params) => dispatch(createTicket(params)).unwrap(), [dispatch]);

  const reply = useCallback(
    (id, message, files = []) => dispatch(replyToTicket({ id, message, files })).unwrap(),
    [dispatch],
  );

  const close = useCallback(
    (id, remarks) => dispatch(closeTicket({ id, remarks })).unwrap(),
    [dispatch],
  );

  return {
    fetchMyTickets: getMyTickets,
    fetchMyTicket: getMyTicket,
    createTicket: create,
    replyToTicket: reply,
    closeTicket: close,
  };
}
