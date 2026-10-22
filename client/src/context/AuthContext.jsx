import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession, setAccessToken } from '../api/client';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const payload = await refreshSession();
        if (!cancelled) {
          setUser(payload.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    bootstrap();

    const handleRefreshed = (event) => {
      if (!cancelled && event.detail && event.detail.user) {
        setUser(event.detail.user);
      }
    };

    const handleExpired = () => {
      if (!cancelled) {
        setUser(null);
      }
    };

    window.addEventListener('auth:refreshed', handleRefreshed);
    window.addEventListener('auth:expired', handleExpired);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:refreshed', handleRefreshed);
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    const payload = response.data.data;
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await authApi.register(payload);
    return response.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await authApi.me();
    const nextUser = response.data.data.user;
    setUser(nextUser);
    return nextUser;
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    if (nextUser) {
      setUser((current) => (current ? { ...current, ...nextUser } : nextUser));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      updateUser,
      clearSession,
    }),
    [user, initializing, login, register, logout, refreshUser, updateUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
