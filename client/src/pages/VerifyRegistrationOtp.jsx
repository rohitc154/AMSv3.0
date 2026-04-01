import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyRegistrationOtp() {
  const { user, loading, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const navigate = useNavigate();

  const [pendingId, setPendingId] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pid = sessionStorage.getItem('pendingId') || '';
    const email = sessionStorage.getItem('pendingEmail') || '';
    setPendingId(pid);
    setPendingEmail(email);
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading…</div>
    );
  }

  if (!pendingId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold text-white">Verify OTP</h1>
        <p className="mt-3 text-sm text-slate-400">
          Registration session not found. Please register again.
        </p>
        <Link to="/register" className="mt-6 inline-block text-indigo-400 hover:text-indigo-300">
          Go to registration
        </Link>
      </div>
    );
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!otp.trim()) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyRegistrationOtp(pendingId, otp.trim());
      sessionStorage.removeItem('pendingId');
      sessionStorage.removeItem('pendingEmail');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      setError(typeof msg === 'string' ? msg : 'OTP verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await resendRegistrationOtp(pendingId);
      setMessage(data.message || 'OTP resent.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      setError(typeof msg === 'string' ? msg : 'Failed to resend OTP');
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Verify email OTP</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the 6-digit OTP sent to <span className="font-medium text-white">{pendingEmail}</span>.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
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
          Email OTP
          <input
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
            placeholder="123456"
            disabled={submitting}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Verifying…' : 'Verify OTP'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={submitting}
          className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Resend OTP
        </button>

        <div className="flex justify-between pt-2">
          <Link
            to="/register"
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Back to registration
          </Link>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('pendingId');
              sessionStorage.removeItem('pendingEmail');
              navigate('/register', { replace: true });
            }}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

