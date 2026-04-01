import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FaceCapture, MAX_FRAMES, MIN_FRAMES } from '../components/FaceCapture';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationId: '',
    memberId: '',
  });
  const [faceBlobs, setFaceBlobs] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadOrgs() {
      setOrgsLoading(true);
      try {
        const { data } = await api.get('/organizations');
        if (!cancelled) setOrganizations(data.organizations || []);
      } catch {
        if (!cancelled) setOrganizations([]);
      } finally {
        if (!cancelled) setOrgsLoading(false);
      }
    }
    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading…</div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.organizationId) {
      setError('Select an organization.');
      return;
    }
    if (faceBlobs.length < MIN_FRAMES || faceBlobs.length > MAX_FRAMES) {
      setError(`Capture between ${MIN_FRAMES} and ${MAX_FRAMES} frames from the camera.`);
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('email', form.email.trim());
      fd.append('password', form.password);
      fd.append('organizationId', form.organizationId);
      fd.append('memberId', form.memberId.trim());
      faceBlobs.forEach((blob, i) => {
        fd.append('images', blob, `frame_${i}.jpg`);
      });
      const data = await register(fd);
      if (data?.pendingId) {
        sessionStorage.setItem('pendingId', data.pendingId);
        sessionStorage.setItem('pendingEmail', data.email || form.email.trim());
        navigate('/verify-registration-otp', { replace: true });
        return;
      }
      // Fallback (if server response shape changes)
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      setError(typeof msg === 'string' ? msg : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Member registration</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose your organization (created by an administrator), then register with camera captures
          only.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300 sm:col-span-2">
            Organization
            <select
              required
              value={form.organizationId}
              onChange={(e) => updateField('organizationId', e.target.value)}
              disabled={orgsLoading || organizations.length === 0}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value="">
                {orgsLoading
                  ? 'Loading organizations…'
                  : organizations.length === 0
                    ? 'No organizations yet — ask an admin to create one'
                    : 'Select organization'}
              </option>
              {organizations.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.orgName} · radius {o.radiusAllowed}m @ {o.location?.lat?.toFixed(4)},{' '}
                  {o.location?.lng?.toFixed(4)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-300 sm:col-span-2">
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </label>
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
            Password (min 8 chars)
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Member ID
            <input
              required
              value={form.memberId}
              onChange={(e) => updateField('memberId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-slate-200">Face capture</h2>
          <FaceCapture onFramesChange={setFaceBlobs} disabled={submitting} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={
              submitting || faceBlobs.length < MIN_FRAMES || organizations.length === 0
            }
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-300">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}
