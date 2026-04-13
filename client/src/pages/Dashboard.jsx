import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const { user, organization, logout, isSuperAdmin, isOrgAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // FIX #3 & #4: Redirect superAdmin and orgAdmin to their correct dashboards.
  // They should never land on the member dashboard.
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }
  if (isOrgAdmin) {
    return <Navigate to="/org-admin" replace />;
  }

  // From here down, only members (role === 'member') are rendered.

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadHistory() {
      setLoading(true);
      try {
        const hid = user?.id || user?._id;
        const { data: h } = await api.get(`/attendance/user/${hid}`);
        if (!cancelled) setHistory(h.attendance || []);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">
            {user?.name} · Member · ID: {user?.memberId}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Log out
        </button>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium text-white">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-300">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Organization</dt>
              <dd>{organization?.orgName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Geofence</dt>
              <dd className="text-xs text-slate-400">
                Center: {organization?.location?.lat?.toFixed(5)},{' '}
                {organization?.location?.lng?.toFixed(5)} · Radius: {organization?.radiusAllowed} m
              </dd>
            </div>
          </dl>
          <Link
            to="/attendance"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Mark attendance
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium text-white">My attendance history</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : history.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No records yet.</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
              {history.map((row) => (
                <li
                  key={row._id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-300"
                >
                  <span className="text-slate-100">{row.date}</span> ·{' '}
                  {formatDate(row.checkInTime)} · {row.status} · conf.{' '}
                  {(row.confidence * 100).toFixed(1)}%
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
