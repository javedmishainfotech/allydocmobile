/**
 * GLOBAL response envelope for every API call in this app.
 *
 * Every service function (src/services/*.js) must return this shape by
 * wrapping its request in `callApi()` below - never a raw axios response,
 * never a thrown exception. This way every slice/thunk across every module
 * (auth today, Patient/Doctor/Nurse later) checks success/failure and reads
 * the message the exact same way, instead of each one reinventing its own
 * try/catch and its own idea of what "the error message" is.
 *
 * Shape: { success, message, data, statusCode, raw }
 *  - success:    true only when the backend's own `status` field is truthy
 *                AND the request actually reached the server.
 *  - message:    the backend's own message when present, else a clear
 *                fallback for connectivity failures. Pages/thunks should
 *                prefer this over any hardcoded string.
 *  - data:       the backend's `data` payload (or null).
 *  - statusCode: the backend's own `statuscode` field (e.g. 403 for a
 *                disabled account), not the HTTP status - kept distinct so
 *                UI can branch on backend-defined cases like the web app does.
 *  - raw:        the full original response body, for the rare case a
 *                caller needs a field this envelope doesn't surface.
 */

function normalizeBody(body, fallbackSuccess) {
  return {
    success: body?.status != null ? Boolean(body.status) : fallbackSuccess,
    message: body?.message ?? null,
    data: body?.data ?? null,
    statusCode: body?.statuscode ?? null,
    raw: body ?? null,
  };
}

/** Network/timeout/no-connection failures never reach the server, so there's
 * no backend body to read a message from - these are the only messages in
 * the app that are allowed to be hardcoded, because nothing else exists. */
function normalizeTransportError(err) {
  if (err.code === 'ECONNABORTED') {
    return {
      success: false,
      message: 'The request timed out. Please check your internet connection and try again.',
      data: null,
      statusCode: null,
      raw: null,
    };
  }
  return {
    success: false,
    message: 'Unable to reach the server. Please check your internet connection and try again.',
    data: null,
    statusCode: null,
    raw: null,
  };
}

/**
 * Wraps any apiClient call and ALWAYS resolves (never throws) with the
 * envelope above.
 *
 * Usage in a service function:
 *   export function login(args) {
 *     return callApi(() => apiClient.post('/loginV3.1', { loginData: encrypt(args) }));
 *   }
 */
export async function callApi(requestFn) {
  try {
    const response = await requestFn();
    return normalizeBody(response.data, true);
  } catch (err) {
    if (!err.response) {
      // No HTTP response at all - log the real transport-level reason (DNS
      // failure, TLS error, timeout, connection refused, etc.) so it's
      // visible in the Metro/device logs instead of only the generic
      // message shown to the user below.
      console.warn('[apiResponse] request never reached the server:', {
        code: err.code,
        message: err.message,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
      });
    }
    if (err.response) {
      // Server responded with a non-2xx HTTP status but still returned a
      // body (e.g. a 401/400 carrying { status:false, message:... }).
      return normalizeBody(err.response.data, false);
    }
    return normalizeTransportError(err);
  }
}
