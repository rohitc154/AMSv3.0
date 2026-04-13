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

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthToken(data.token);
    setUser(data.user);
    setOrganization(data.organization ?? null);
    // Also refresh from /me to get the full user+org shape
    await loadSession();
    return data;
  }, [loadSession]);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    return data;
  }, []);

  const verifyRegistrationOtp = useCallback(async (pendingId, otp) => {
    const { data } = await api.post('/auth/verify-registration-otp', { pendingId, otp });
    setAuthToken(data.token);
    setUser(data.user);
    await loadSession();
    return data;
  }, [loadSession]);

  const resendRegistrationOtp = useCallback(async (pendingId) => {
    const { data } = await api.post('/auth/resend-registration-otp', { pendingId });
    return data;
  }, []);

  const registerAdmin = useCallback(async (body) => {
    const { data } = await api.post('/auth/register-admin', body);
    setAuthToken(data.token);
    setUser(data.user);
    await loadSession();
    return data;
  }, [loadSession]);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  }, []);

  // FIX #2: Correct role checks
  const isSuperAdmin = user?.role === 'superAdmin';
  const isOrgAdmin = user?.role === 'admin' && Boolean(user?.organizationId);
  const isMember = user?.role === 'member';
  // Legacy: platform admin (old admin without organizationId — kept for Dashboard.jsx backward compat)
  const isPlatformAdmin = user?.role === 'admin' && !user?.organizationId;
  // FIX #2: isAdmin should be true for BOTH superAdmin and orgAdmin
  const isAdmin = isSuperAdmin || isOrgAdmin;

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
      // Role checks
      isSuperAdmin,
      isOrgAdmin,
      isMember,
      isAdmin,
      isPlatformAdmin,
    }),
    // FIX #2: all stable callbacks and derived booleans included in deps
    [
      user,
      organization,
      loading,
      login,
      register,
      verifyRegistrationOtp,
      resendRegistrationOtp,
      registerAdmin,
      logout,
      loadSession,
      isSuperAdmin,
      isOrgAdmin,
      isMember,
      isAdmin,
      isPlatformAdmin,
    ]
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
