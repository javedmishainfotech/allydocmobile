/**
 * Mirrors the web app's src/services/authSessionState.js plus the
 * `performGlobalLogout` hook in src/apis/index.js. The axios client can't
 * dispatch Redux actions without a circular import (client -> store -> slice ->
 * service -> client), so it reports "the session is dead" through this tiny
 * registry instead, and RootNavigator registers the handler that actually logs out.
 */
let logoutInProgress = false;
let sessionExpiredHandler = null;

export const isAuthLogoutInProgress = () => logoutInProgress;

export const setAuthLogoutInProgress = (value) => {
  logoutInProgress = Boolean(value);
};

/** Registers the single app-level handler; returns an unregister function. */
export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
};

export const notifySessionExpired = (message) => {
  if (logoutInProgress) return;
  sessionExpiredHandler?.(message);
};
