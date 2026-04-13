import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterAdmin() {
  const { registerAdmin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    adminSecret: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading…</div>
    );
  }

  if (user) {
    // FIX #7: If already logged in as superAdmin, redirect to the right place
    if (user.role === 'superAdmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        adminSecret: form.adminSecret,
      });
      // FIX #7: Navigate to /super-admin after successful super-admin registration
      navigate('/super-admin', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Super Administrator</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create organizations and manage organization admins. Requires the server{' '}
          <code className="rounded bg-slate-800 px-1">ADMIN_REGISTRATION_SECRET</code>.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <label className="block text-sm text-slate-300">
          Full name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password (min 8 chars)
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Admin secret
          <input
            type="password"
            required
            value={form.adminSecret}
            onChange={(e) => setForm((f) => ({ ...f, adminSecret: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Register as administrator'}
        </button>
      </form>
    </div>
  );
}
