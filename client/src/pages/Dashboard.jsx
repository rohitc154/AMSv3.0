import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { user, organization, logout, isPlatformAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgAttendance, setOrgAttendance] = useState([]);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [createForm, setCreateForm] = useState({
    orgName: '',
    latitude: '',
    longitude: '',
    radiusAllowed: '200',
  });
  const [editForm, setEditForm] = useState({
    orgName: '',
    latitude: '',
    longitude: '',
    radiusAllowed: '',
  });
  const [createMsg, setCreateMsg] = useState('');
  const [editMsg, setEditMsg] = useState('');

  const selectedOrg = orgs.find((o) => o._id === selectedOrgId);

  useEffect(() => {
    if (!selectedOrgId || !orgs.length) return;
    const o = orgs.find((x) => x._id === selectedOrgId);
    if (o) {
      setEditForm({
        orgName: o.orgName || '',
        latitude: String(o.location?.lat ?? ''),
        longitude: String(o.location?.lng ?? ''),
        radiusAllowed: String(o.radiusAllowed ?? ''),
      });
    }
  }, [selectedOrgId, orgs]);

  useEffect(() => {
    if (!isPlatformAdmin || !user) return;
    let cancelled = false;
    async function loadOrgs() {
      setLoading(true);
      try {
        const { data } = await api.get('/organizations');
        const list = data.organizations || [];
        if (!cancelled) {
          setOrgs(list);
          if (list.length && !selectedOrgId) {
            setSelectedOrgId(list[0]._id);
          }
        }
      } catch {
        if (!cancelled) setOrgs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, user]);

  useEffect(() => {
    if (isPlatformAdmin || !user) return;
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
  }, [user, isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin || !selectedOrgId) return;
    let cancelled = false;
    async function loadAdminData() {
      setAdminLoading(true);
      try {
        const { data: oa } = await api.get(`/attendance/org/${selectedOrgId}`, {
          params: filterDate ? { date: filterDate } : {},
        });
        if (!cancelled) setOrgAttendance(oa.attendance || []);
        const { data: r } = await api.get('/reports', {
          params: { month, orgId: selectedOrgId },
        });
        if (!cancelled) setReports(r);
        const { data: u } = await api.get('/users', { params: { orgId: selectedOrgId } });
        if (!cancelled) setUsers(u.users || []);
      } catch {
        if (!cancelled) {
          setOrgAttendance([]);
          setReports(null);
          setUsers([]);
        }
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    }
    loadAdminData();
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, selectedOrgId, filterDate, month]);

  async function createOrg(e) {
    e.preventDefault();
    setCreateMsg('');
    try {
      await api.post('/organizations', {
        orgName: createForm.orgName.trim(),
        latitude: parseFloat(createForm.latitude),
        longitude: parseFloat(createForm.longitude),
        radiusAllowed: parseFloat(createForm.radiusAllowed),
      });
      setCreateMsg('Organization created.');
      setCreateForm((f) => ({ ...f, orgName: '' }));
      const { data } = await api.get('/organizations');
      const list = data.organizations || [];
      setOrgs(list);
      if (list.length) setSelectedOrgId(list[list.length - 1]._id);
    } catch (err) {
      setCreateMsg(err.response?.data?.message || 'Failed to create organization');
    }
  }

  async function saveOrg(e) {
    e.preventDefault();
    setEditMsg('');
    if (!selectedOrgId) return;
    try {
      await api.put(`/organizations/${selectedOrgId}`, {
        orgName: editForm.orgName.trim(),
        latitude: parseFloat(editForm.latitude),
        longitude: parseFloat(editForm.longitude),
        radiusAllowed: parseFloat(editForm.radiusAllowed),
      });
      setEditMsg('Saved.');
      const { data } = await api.get('/organizations');
      setOrgs(data.organizations || []);
    } catch (err) {
      setEditMsg(err.response?.data?.message || 'Update failed');
    }
  }

  if (isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Administrator</h1>
            <p className="text-sm text-slate-400">
              {user?.name} · Create organizations and set geofences for members
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

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium text-white">Create organization</h2>
          <p className="mt-1 text-sm text-slate-400">
            Members must select one of these organizations when registering. Attendance is validated
            against this center and radius.
          </p>
          <form onSubmit={createOrg} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-300 sm:col-span-2">
              Name
              <input
                required
                value={createForm.orgName}
                onChange={(e) => setCreateForm((f) => ({ ...f, orgName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Latitude
              <input
                required
                type="number"
                step="any"
                value={createForm.latitude}
                onChange={(e) => setCreateForm((f) => ({ ...f, latitude: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Longitude
              <input
                required
                type="number"
                step="any"
                value={createForm.longitude}
                onChange={(e) => setCreateForm((f) => ({ ...f, longitude: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">
              Radius (meters)
              <input
                required
                type="number"
                min={1}
                value={createForm.radiusAllowed}
                onChange={(e) => setCreateForm((f) => ({ ...f, radiusAllowed: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Create organization
              </button>
              {createMsg && <p className="mt-2 text-sm text-slate-400">{createMsg}</p>}
            </div>
          </form>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium text-white">Manage organization</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading organizations…</p>
          ) : orgs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No organizations yet. Create one above.</p>
          ) : (
            <>
              <label className="mt-4 block text-sm text-slate-300">
                Select organization
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {orgs.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orgName}
                    </option>
                  ))}
                </select>
              </label>
              {selectedOrg && (
                <form onSubmit={saveOrg} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm text-slate-300 sm:col-span-2">
                    Display name
                    <input
                      required
                      value={editForm.orgName}
                      onChange={(e) => setEditForm((f) => ({ ...f, orgName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    Latitude
                    <input
                      required
                      type="number"
                      step="any"
                      value={editForm.latitude}
                      onChange={(e) => setEditForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    Longitude
                    <input
                      required
                      type="number"
                      step="any"
                      value={editForm.longitude}
                      onChange={(e) => setEditForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-slate-300 sm:col-span-2">
                    Radius (m)
                    <input
                      required
                      type="number"
                      min={1}
                      value={editForm.radiusAllowed}
                      onChange={(e) => setEditForm((f) => ({ ...f, radiusAllowed: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
                    >
                      Save changes
                    </button>
                    {editMsg && <p className="mt-2 text-sm text-slate-400">{editMsg}</p>}
                  </div>
                </form>
              )}
            </>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-lg font-medium text-white">Attendance (selected org)</h2>
            <label className="text-sm text-slate-400">
              Filter by date (YYYY-MM-DD)
              <input
                type="text"
                placeholder="e.g. 2026-03-28"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="ml-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
              />
            </label>
          </div>
          {adminLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm text-slate-300">
              {orgAttendance.length === 0 ? (
                <li className="text-slate-500">No records.</li>
              ) : (
                orgAttendance.map((row) => (
                  <li key={row._id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                    User {row.userId} · {row.date} · {formatDate(row.checkInTime)} ·{' '}
                    {(row.confidence * 100).toFixed(1)}%
                  </li>
                ))
              )}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <h2 className="text-lg font-medium text-white">Analytics</h2>
            <label className="text-sm text-slate-400">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="ml-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
              />
            </label>
          </div>
          {reports?.analytics && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-2 pr-4">Member</th>
                    <th className="py-2 pr-4">Present days</th>
                    <th className="py-2">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.analytics.map((a) => (
                    <tr key={String(a.userId)} className="border-b border-slate-800">
                      <td className="py-2 pr-4">
                        {a.name} ({a.memberId})
                      </td>
                      <td className="py-2 pr-4">{a.presentDays}</td>
                      <td className="py-2">{a.attendancePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium text-white">Members (selected org)</h2>
          <p className="mt-1 text-sm text-slate-400">
            Members self-register at{' '}
            <Link className="text-indigo-400" to="/register">
              Member registration
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {users.map((u) => (
              <li key={u._id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                {u.name} · {u.email} · {u.memberId}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

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
