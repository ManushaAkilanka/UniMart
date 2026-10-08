import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check existing session via GET /api/auth/me on mount
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Session check failed:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Register new student
  const register = async ({ fullName, email, password, faculty, campus }) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ fullName, email, password, faculty, campus }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || 'Registration failed. Please check your details.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (data.data?.user) {
        setUser(data.data.user);
      }
      return data;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Verify email with 6-digit OTP
  const verifyEmail = async ({ email, code }) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || 'Verification failed. Please check the code.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (data.data?.user) {
        setUser(data.data.user);
      }
      return data;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Login student
  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || 'Login failed. Please check your credentials.';
        setAuthError(msg);
        throw new Error(msg);
      }

      if (data.data?.user) {
        setUser(data.data.user);
      }
      return data;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[AuthContext] Logout notice:', err.message);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: Boolean(user),
    isVerified: Boolean(user?.isVerified),
    isPendingApproval: user?.accountStatus === 'pending_approval',
    authError,
    setAuthError,
    register,
    verifyEmail,
    login,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
