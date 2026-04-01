/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setOrganization(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setOrganization(data.organization);
    } catch {
      setAuthToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthToken(data.token);
    setUser(data.user);
    await loadSession();
    return data;
  };

  // Registration is a 2-step OTP flow.
  // Step-1 returns a pendingId; Step-2 verifies OTP and then sets auth.
  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    return data;
  };

  const verifyRegistrationOtp = async (pendingId, otp) => {
    const { data } = await api.post('/auth/verify-registration-otp', { pendingId, otp });
    setAuthToken(data.token);
    setUser(data.user);
    await loadSession();
    return data;
  };

  const resendRegistrationOtp = async (pendingId) => {
    const { data } = await api.post('/auth/resend-registration-otp', { pendingId });
    return data;
  };

  const registerAdmin = async (body) => {
    const { data } = await api.post('/auth/register-admin', body);
    setAuthToken(data.token);
    setUser(data.user);
    await loadSession();
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setOrganization(null);
  };

  const isPlatformAdmin = Boolean(user?.role === 'admin' && !user?.organizationId);

  const value = useMemo(
    () => ({
      user,
      organization,
      loading,
      login,
      register,
      verifyRegistrationOtp,
      resendRegistrationOtp,
      registerAdmin,
      logout,
      refresh: loadSession,
      isAdmin: user?.role === 'admin',
      isPlatformAdmin,
    }),
    [user, organization, loading, loadSession, isPlatformAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

