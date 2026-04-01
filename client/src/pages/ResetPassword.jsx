import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    otp: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword,
      });
      setMessage(data?.message || 'Password reset successful');
      setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(typeof msg === 'string' ? msg : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter your email, OTP received on email, and new password.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {message}
          </div>
        )}
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <label className="block text-sm text-slate-300">
          OTP
          <input
            required
            value={form.otp}
            onChange={(e) => updateField('otp', e.target.value)}
            maxLength={6}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <label className="block text-sm text-slate-300">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={form.newPassword}
            onChange={(e) => updateField('newPassword', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
        <p className="text-center text-sm text-slate-400">
          Need OTP?{' '}
          <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300">
            Send OTP
          </Link>
        </p>
      </form>
    </div>
  );
}

