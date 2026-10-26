import { useAuth } from './useAuth';

/** Normalizes "doctor admin"/"doctor sub" -> "doctor", same as the web app's
 * tempPasswordAuth.js / ProtectedRoutes.jsx role normalization. */
export function useDashboardRole() {
  const { profile } = useAuth();
  const normalized = (profile?.roleName || '').toLowerCase().trim();
  if (normalized === 'doctor admin' || normalized === 'doctor sub') {
    return 'doctor';
  }
  return normalized;
}
