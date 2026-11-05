/**
 * Small, pure shape-building helpers for the global API response envelope used by
 * every service function (src/services/*.js): { success, message, data, statusCode, raw }.
 *
 * These are NOT a "pass me a request function" wrapper (that indirection - a shared
 * `callApi(requestFn)` - was removed on purpose). Each service function makes its own
 * direct `apiClient` call inline, in its own try/catch, and just uses these two pure
 * functions to build the envelope from whatever body/error it already has in hand.
 *
 * Usage in a service function:
 *   export async function login(args) {
 *     try {
 *       const response = await apiClient.post('/loginV3.1', { loginData: encrypt(args) });
 *       return normalizeApiBody(response.data, true);
 *     } catch (err) {
 *       if (err.response) return normalizeApiBody(err.response.data, false);
 *       return normalizeApiError(err);
 *     }
 *   }
 */

/** Builds the envelope from a parsed backend response body. */
export function normalizeApiBody(body, fallbackSuccess) {
  return {
    success: body?.status != null ? Boolean(body.status) : fallbackSuccess,
    message: body?.message ?? null,
    data: body?.data ?? null,
    statusCode: body?.statuscode ?? null,
    raw: body ?? null,
  };
}

/** Builds the envelope for a transport-level failure (timeout / no connection at all) -
 * the request never reached the server, so there's no backend body to read from. */
export function normalizeApiError(err) {
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
