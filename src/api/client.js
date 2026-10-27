import axios from 'axios';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { getItem, setItem } from '../utils/storage';
import { isAuthLogoutInProgress, notifySessionExpired } from '../services/authSessionState';

const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || '';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000, // fail predictably instead of letting a bad connection hang the loader forever
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

const TOKEN_REFRESH_LEEWAY_MS = 2 * 60 * 1000; // refresh 2 minutes before expiry (same as web)
const MIN_REFRESH_DELAY_MS = 5 * 1000;
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please login again.';

let refreshRequestPromise = null;
let proactiveRefreshTimeoutId = null;

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(global.atob(padded));
  } catch {
    return null;
  }
};

export const getTokenExpiryMs = (token) => {
  const expSeconds = Number(decodeJwtPayload(token)?.exp || 0);
  return expSeconds > 0 ? expSeconds * 1000 : null;
};

const saveTokens = async ({ authToken, refreshToken, refreshTokenExpiresAt }) => {
  if (authToken) await setItem('auth_token', authToken);
  if (refreshToken) await setItem('refreshToken', refreshToken);
  if (refreshTokenExpiresAt) await setItem('refreshTokenExpiresAt', String(refreshTokenExpiresAt));
};

const clearProactiveRefreshTimer = () => {
  if (proactiveRefreshTimeoutId) {
    clearTimeout(proactiveRefreshTimeoutId);
    proactiveRefreshTimeoutId = null;
  }
};

/** Refreshes the token shortly before it expires so the user never hits a 401 mid-screen. */
export const scheduleProactiveRefresh = async () => {
  clearProactiveRefreshTimer();
  const expiryMs = getTokenExpiryMs(await getItem('auth_token'));
  if (!expiryMs) return;

  const delay = Math.max(expiryMs - Date.now() - TOKEN_REFRESH_LEEWAY_MS, MIN_REFRESH_DELAY_MS);
  proactiveRefreshTimeoutId = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch {
      notifySessionExpired(SESSION_EXPIRED_MESSAGE);
    }
  }, delay);
};

/** Call on logout so a stale timer can't fire against the next user's session. */
export const stopProactiveRefresh = clearProactiveRefreshTimer;

/**
 * Mirrors getFreshAccessToken in the web's src/apis/index.js. Single-flight: concurrent
 * callers (several 401s at once, or the timer racing a request) share one /RefreshToken
 * call, which matters because the backend rotates the refresh token on every use.
 * Resolves with the new auth token, or null when there is no refresh token; throws when
 * the refresh itself is rejected.
 */
export const refreshAccessToken = async () => {
  if (refreshRequestPromise) return refreshRequestPromise;

  const currentRefreshToken = await getItem('refreshToken');
  if (!currentRefreshToken) return null;

  refreshRequestPromise = apiClient
    .post(
      '/RefreshToken',
      { refreshToken: currentRefreshToken },
      { skipAuthRefreshFlow: true, skipAuthTokenAttach: true },
    )
    .then(async (response) => {
      const nextAuthToken = response?.data?.auth_token || response?.data?.data?.auth_token;
      if (!nextAuthToken) throw new Error('RefreshToken API did not return an auth token.');
      await saveTokens({
        authToken: nextAuthToken,
        refreshToken: response?.data?.data?.refreshToken,
        refreshTokenExpiresAt: response?.data?.data?.refreshTokenExpiresAt,
      });
      scheduleProactiveRefresh();
      return nextAuthToken;
    })
    .finally(() => {
      refreshRequestPromise = null;
    });

  return refreshRequestPromise;
};

// JS timers pause while the app is backgrounded, so re-arm (and catch an already-expired
// token) whenever it comes back - the mobile equivalent of the web's focus/visibility hooks.
AppState.addEventListener('change', (state) => {
  if (state === 'active') scheduleProactiveRefresh();
});

// Mirrors the web app's src/apis/index.js request interceptor: attach the
// bearer token to every outgoing request unless explicitly opted out.
apiClient.interceptors.request.use(async (config) => {
  if (config.skipAuthTokenAttach) {
    return config;
  }
  const token = await getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 on an authenticated request = expired access token: refresh once and replay the
// request; if that fails (or there is no refresh token) the session is over.
// A 401 on a request that carried no token (e.g. a wrong-password login) is NOT a session
// expiry and is passed through untouched for the caller to report.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error?.config || {};
    const isUnauthorized = error?.response?.status === 401;
    const hadToken = Boolean(requestConfig.headers?.Authorization);

    if (!isUnauthorized || !hadToken || requestConfig.skipAuthRefreshFlow) {
      return Promise.reject(error);
    }
    if (isAuthLogoutInProgress()) {
      return Promise.reject(error);
    }

    if (!requestConfig._retry) {
      try {
        const nextAuthToken = await refreshAccessToken();
        if (nextAuthToken) {
          requestConfig._retry = true;
          requestConfig.headers.Authorization = `Bearer ${nextAuthToken}`;
          return apiClient(requestConfig);
        }
      } catch {
        // fall through to session-expired below
      }
    }

    notifySessionExpired(SESSION_EXPIRED_MESSAGE);
    return Promise.reject(error);
  },
);

export default apiClient;
