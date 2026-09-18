/**
 * The cached user, for first paint only.
 *
 * The actual credential is an HttpOnly cookie the browser sends itself — it is
 * never readable from JavaScript, which is the point. What is cached here is
 * the *profile* the shell needs to render a signed-in header, so the app can
 * paint immediately and revalidate underneath.
 *
 * Without this the app has to wait for `/auth/me` before it knows whether to
 * draw a "Sign in" link or an avatar, and on Render's free plan that first
 * request can take twenty seconds. Holding the whole app behind it turns a cold
 * start into a blank screen.
 *
 * A stale cache is harmless: every endpoint that matters re-checks server-side,
 * and a 401 clears it.
 */
const KEY = 'tafutakeja:user';

export const getCachedUser = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Private windows and "block site data" both throw on access rather than
    // returning null, so this has to be caught, not guarded against.
    return null;
  }
};

export const setCachedUser = (user) => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    // Nothing to do — the app works without the cache, just slower to paint.
  }
};

export const clearCachedUser = () => setCachedUser(null);
