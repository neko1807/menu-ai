import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, AUTH_TOKEN_KEY } from './authConfig';
import { parseJsonResponse } from '../lib/response';

const AuthContext = createContext(null);

async function parseJsonSafe(response) {
  return parseJsonResponse(response);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);

    if (nextToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await parseJsonSafe(response);
    if (!data.accessToken || !data.user) {
      return null;
    }

    setSession(data.accessToken, data.user);
    return data;
  }, [setSession]);

  useEffect(() => {
    async function bootstrap() {
      try {
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await parseJsonSafe(response);
            setUser(data.user || null);
            return;
          }
        }

        const refreshed = await refreshSession();
        if (refreshed) {
          return;
        }

        setSession('', null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
    // Bootstrap only once on mount; login/logout manage updates explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'เข้าสู่ระบบไม่สำเร็จ',
      };
    }

    setSession(data.accessToken, data.user);

    return {
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: data.user,
    };
  }, [setSession]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
    } finally {
      setSession('', null);
    }
  }, [setSession, token]);

  const logoutAll = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      setSession('', null);
    }
  }, [setSession, token]);

  const authFetch = useCallback(async (input, init = {}) => {
    const withAuth = (requestToken) => {
      const headers = new Headers(init.headers || {});
      if (requestToken) {
        headers.set('Authorization', `Bearer ${requestToken}`);
      }

      return fetch(input, {
        ...init,
        headers,
        credentials: init.credentials || 'include',
      });
    };

    let response = await withAuth(token);

    if (response.status !== 401) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      setSession('', null);
      return response;
    }

    response = await withAuth(refreshed.accessToken);
    return response;
  }, [refreshSession, token]);

  const updateProfile = useCallback(
    async (name) => {
      const response = await authFetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Unable to update profile.',
        };
      }

      if (data.user) {
        setUser(data.user);
      }

      return {
        success: true,
        message: data.message || 'Profile updated successfully.',
        user: data.user || null,
      };
    },
    [authFetch],
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const response = await authFetch(`${API_BASE_URL}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Unable to change password.',
        };
      }

      if (data.requiresRelogin) {
        setSession('', null);
      }

      return {
        success: true,
        message: data.message || 'Password changed successfully.',
        requiresRelogin: Boolean(data.requiresRelogin),
      };
    },
    [authFetch, setSession],
  );

  const updateAvatar = useCallback(
    async (avatarUrl) => {
      const response = await authFetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Unable to update avatar.',
        };
      }

      if (data.user) {
        setUser(data.user);
      }

      return {
        success: true,
        message: data.message || 'Avatar updated successfully.',
        user: data.user || null,
      };
    },
    [authFetch],
  );

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      user,
      token,
      loading,
      login,
      logout,
      logoutAll,
      updateAvatar,
      updateProfile,
      changePassword,
      refreshSession,
      authFetch,
    }),
    [
      authFetch,
      changePassword,
      loading,
      logout,
      logoutAll,
      refreshSession,
      token,
      updateAvatar,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
