import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { AUTH_EXPIRED_EVENT } from '../api/apiClient.js';
import { getCachedUser, setCachedUser, clearCachedUser } from '../lib/authStorage.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  /*
   * Starts from the cached profile and revalidates underneath.
   *
   * The alternative — render nothing until `/auth/me` answers — turns Render's
   * free-tier cold start into a blank page for twenty seconds, and makes every
   * public route prerender to zero bytes because the gate closes before the
   * router ever runs. Routes that genuinely need certainty check `loading`
   * themselves; the shell does not have to.
   */
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next) => {
    setUser(next);
    setCachedUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/auth/me')
      .then((data) => {
        if (!cancelled) applyUser(data.user);
      })
      .catch(() => {
        // A failed check must not end a session on its own: a cold start or a
        // dropped connection is not proof the user is signed out, and signing
        // them out here is what produced the cold-start sign-outs elsewhere.
        // The client clears the cache itself on a real 401.
        if (!cancelled && !getCachedUser()) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await apiClient.post('/auth/login', credentials);
      applyUser(data.user);
      return data.user;
    },
    [applyUser]
  );

  const register = useCallback(
    async (details) => {
      const data = await apiClient.post('/auth/register', details);
      applyUser(data.user);
      return data.user;
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Cleared even if the request fails — the intent was to sign out, and
      // leaving a signed-in shell because the network blipped is worse.
      clearCachedUser();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      setUser: applyUser,
      // `isAgent` is "lists properties", not "has authority over listings" —
      // an admin has the second without the first. The agent workspace reads
      // `agent: me`, so treating a moderator as an agent puts an empty page in
      // the rail beside the console they actually signed in for.
      isAgent: user?.role === 'agent',
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, login, register, logout, applyUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
