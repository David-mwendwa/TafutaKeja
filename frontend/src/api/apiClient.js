import { getCachedUser, clearCachedUser } from '../lib/authStorage.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5008/api/v1';

/** Fired when the server rejects the session; AuthProvider listens and clears state. */
export const AUTH_EXPIRED_EVENT = 'tafutakeja:auth-expired';

/*
 * Emitted when a request has been outstanding long enough that the reader
 * deserves an explanation, and again once one comes back. The API sleeps on
 * Render's free plan and takes upwards of twenty seconds to wake, which without
 * this is indistinguishable from a broken site.
 */
export const API_SLOW_EVENT = 'tafutakeja:api-slow';
export const API_AWAKE_EVENT = 'tafutakeja:api-awake';
const SLOW_AFTER_MS = 4000;

// Endpoints where a 401 means "those credentials were wrong", not "your session
// ended". Mistyping a password must not sign the rest of the tab out.
const CREDENTIAL_CHECK_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/update-password',
];

let inflight = 0;
let slowTimer = null;

const startedRequest = () => {
  inflight += 1;
  if (inflight === 1 && typeof window !== 'undefined') {
    slowTimer = setTimeout(
      () => window.dispatchEvent(new Event(API_SLOW_EVENT)),
      SLOW_AFTER_MS
    );
  }
};

const finishedRequest = () => {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) {
    clearTimeout(slowTimer);
    slowTimer = null;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(API_AWAKE_EVENT));
  }
};

// An empty string is still sent — it is how a filter clears itself. Only
// undefined and null are dropped.
const queryString = (params) => {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) search.append(key, value.join(','));
    } else {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

/*
 * Shaped like an axios rejection deliberately: call sites read
 * `error.response.data.message`, and a network failure has to arrive with
 * `error.request` set so it reads as "cannot reach the server" rather than as a
 * bare JavaScript error.
 */
const httpError = (message, { response, request } = {}) => {
  const error = new Error(message);
  if (response) error.response = response;
  if (request) error.request = request;
  return error;
};

const request = async (method, url, { params, data, headers: extraHeaders } = {}) => {
  const headers = { ...extraHeaders };
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  // FormData must set its own Content-Type, boundary and all. Naming it here
  // produces a body the server cannot parse — the photo upload depends on this.
  if (data !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  startedRequest();
  let res;
  try {
    res = await fetch(`${BASE_URL}${url}${queryString(params)}`, {
      method,
      headers,
      // Load-bearing: the session is an HttpOnly cookie, and without this the
      // browser never sends it. Every authenticated route 401s.
      credentials: 'include',
      body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
    });
  } catch (cause) {
    finishedRequest();
    throw httpError(cause.message || 'Network request failed', { request: true });
  }
  finishedRequest();

  let body = null;
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const isCredentialCheck = CREDENTIAL_CHECK_PATHS.some((p) => url.startsWith(p));
    // Clearing the cache is not enough on its own: `storage` events do not fire
    // in the tab that wrote them, so the app would keep rendering a signed-in
    // shell until a reload.
    if (res.status === 401 && getCachedUser() && !isCredentialCheck) {
      clearCachedUser();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw httpError(body?.message || `Request failed with status ${res.status}`, {
      response: { status: res.status, data: body },
    });
  }

  return body;
};

const apiClient = {
  get: (url, options) => request('GET', url, options),
  post: (url, data, options) => request('POST', url, { ...options, data }),
  patch: (url, data, options) => request('PATCH', url, { ...options, data }),
  put: (url, data, options) => request('PUT', url, { ...options, data }),
  delete: (url, options) => request('DELETE', url, options),
};

export const errorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export default apiClient;
