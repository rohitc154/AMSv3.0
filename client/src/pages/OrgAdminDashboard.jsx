import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// ── Download helper ──────────────────────────────────────────────────────────
// Uses the same axios instance (api) so the base URL and auth header are
// guaranteed to be correct — no manual URL building or token injection needed.
async function triggerDownload(apiPath, filename) {
    const response = await api.get(apiPath, {
        responseType: 'blob', // tell axios to return raw bytes
    });
    const objectUrl = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}

export default function OrgAdminDashboard() {
    const { user, organization, logout } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Attendance filter
    const [filterType, setFilterType] = useState('date'); // 'date' | 'month'
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [attendance, setAttendance] = useState([]);
    const [attLoading, setAttLoading] = useState(false);

    // Download state
    const [downloading, setDownloading] = useState(null); // 'csv' | 'pdf' | null
    const [downloadError, setDownloadError] = useState('');

    useEffect(() => { loadMembers(); }, []);

    useEffect(() => {
        const key = filterType === 'date' ? selectedDate : selectedMonth;
        if (key) loadAttendance();
        else setAttendance([]);
    }, [filterType, selectedDate, selectedMonth]);

    async function loadMembers() {
        setLoading(true);
        try {
            const { data } = await api.get('/users');
            setMembers(data.users || []);
        } catch {
            setError('Failed to load members');
        } finally {
            setLoading(false);
        }
    }

    async function loadAttendance() {
        setAttLoading(true);
        try {
            const params = filterType === 'date'
                ? { date: selectedDate }
                : { month: selectedMonth };
            const { data } = await api.get(`/attendance/org/${user?.organizationId}`, { params });
            setAttendance(data.attendance || []);
        } catch {
            setError('Failed to load attendance');
        } finally {
            setAttLoading(false);
        }
    }

    // ── Download ─────────────────────────────────────────────────────────────
    async function handleDownload(format) {
        setDownloadError('');
        setDownloading(format);
        try {
            const orgId = user?.organizationId;
            const safeName = (organization?.orgName || 'org').replace(/[^a-z0-9]/gi, '_');

            // Build query string based on active filter
            const activeFilter = filterType === 'date' ? selectedDate : selectedMonth;
            const paramKey = filterType === 'date' ? 'date' : 'month';
            const queryStr = activeFilter ? `?${paramKey}=${activeFilter}` : '';
            const label = activeFilter || 'all';

            // e.g. /reports/org/abc123/csv?date=2025-04-13
            const apiPath = `/reports/org/${orgId}/${format}${queryStr}`;
            const filename = `attendance_${safeName}_${label}.${format}`;

            await triggerDownload(apiPath, filename);
        } catch (err) {
            // axios wraps non-2xx as errors; also catch network failures
            setDownloadError(
                err.response?.data?.message || err.message || `Failed to download ${format.toUpperCase()}`
            );
        } finally {
            setDownloading(null);
        }
    }

    const activeFilter = filterType === 'date' ? selectedDate : selectedMonth;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">

            {/* ── Header ── */}
            <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Organization Admin Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-400">{organization?.orgName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="rounded bg-red-600/20 px-4 py-2 text-sm text-red-400 hover:bg-red-600/30"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8">
                {error && (
                    <div className="mb-4 flex items-center justify-between rounded bg-red-900/20 p-4 text-red-400">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="text-red-600 hover:text-red-400">✕</button>
                    </div>
                )}

                {/* ── Org Info ── */}
                <div className="mb-8 rounded border border-slate-700 bg-slate-800/50 p-6">
                    <h2 className="mb-4 text-xl font-semibold">Organization Information</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                            <p className="text-sm text-slate-400">Organization Name</p>
                            <p className="text-lg font-semibold text-white">{organization?.orgName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Attendance Radius</p>
                            <p className="text-lg font-semibold text-white">{organization?.radiusAllowed}m</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Location</p>
                            <p className="text-sm text-slate-300">
                                ({organization?.location?.lat}, {organization?.location?.lng})
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total Members</p>
                            <p className="text-lg font-semibold text-white">{members.length}</p>
                        </div>
                    </div>
                </div>

                {/* ── Attendance + Reports ── */}
                <div className="mb-8 rounded border border-slate-700 bg-slate-800/50 p-6">

                    {/* Section title + download buttons */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold">Attendance Records</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            {downloadError && (
                                <span className="text-xs text-red-400">{downloadError}</span>
                            )}
                            {/* CSV */}
                            <button
                                onClick={() => handleDownload('csv')}
                                disabled={!!downloading}
                                className="flex items-center gap-2 rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                            >
                                {downloading === 'csv'
                                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                                    : (
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M8 2v8m0 0-3-3m3 3 3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )
                                }
                                Download CSV
                            </button>
                            {/* PDF */}
                            <button
                                onClick={() => handleDownload('pdf')}
                                disabled={!!downloading}
                                className="flex items-center gap-2 rounded border border-blue-700 bg-blue-600/20 px-3 py-2 text-sm text-blue-300 hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
                            >
                                {downloading === 'pdf'
                                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-white" />
                                    : (
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M3 2h7l3 3v9H3V2z" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M10 2v3h3M5 9h6M5 12h4" strokeLinecap="round" />
                                        </svg>
                                    )
                                }
                                Download PDF
                            </button>
                        </div>
                    </div>

                    {/* Filter toggle */}
                    <div className="mb-4 flex gap-2">
                        <button
                            onClick={() => setFilterType('date')}
                            className={`rounded px-3 py-1.5 text-sm transition-colors ${filterType === 'date'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            By Date
                        </button>
                        <button
                            onClick={() => setFilterType('month')}
                            className={`rounded px-3 py-1.5 text-sm transition-colors ${filterType === 'month'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            By Month
                        </button>
                    </div>

                    {/* Filter inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                        {filterType === 'date' ? (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}
                        {activeFilter && (
                            <button
                                onClick={() => { setSelectedDate(''); setSelectedMonth(''); setAttendance([]); }}
                                className="rounded bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
                            >
                                Clear
                            </button>
                        )}
                        {activeFilter && (
                            <span className="text-xs text-slate-500">
                                Download exports the currently filtered period
                            </span>
                        )}
                    </div>

                    {/* Attendance table */}
                    {attLoading ? (
                        <p className="mt-4 text-sm text-slate-500">Loading attendance…</p>
                    ) : activeFilter && attendance.length > 0 ? (
                        <div className="mt-4">
                            <p className="mb-2 text-sm text-slate-400">
                                {attendance.length} record{attendance.length !== 1 ? 's' : ''} found
                            </p>
                            <div className="max-h-96 overflow-y-auto rounded bg-slate-900/50">
                                <table className="w-full">
                                    <thead className="sticky top-0 border-b border-slate-700 bg-slate-900">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Member ID</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Time</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map((att) => (
                                            <tr key={att._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="px-4 py-2 text-sm">{att.userId?.name || 'N/A'}</td>
                                                <td className="px-4 py-2 text-sm text-slate-400">{att.userId?.memberId || 'N/A'}</td>
                                                <td className="px-4 py-2 text-sm text-slate-400">{att.date}</td>
                                                <td className="px-4 py-2 text-sm text-slate-400">
                                                    {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : '—'}
                                                </td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                                                        {att.status || 'Present'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeFilter ? (
                        <p className="mt-4 text-slate-400">No attendance records for this period.</p>
                    ) : (
                        <p className="mt-4 text-slate-500">Select a date or month to view records.</p>
                    )}
                </div>

                {/* ── Members List ── */}
                <div>
                    <h2 className="mb-4 text-xl font-semibold">Members ({members.length})</h2>
                    {members.length === 0 ? (
                        <p className="text-slate-400">No members in this organization yet.</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto rounded border border-slate-700 bg-slate-800/50">
                            <table className="w-full">
                                <thead className="sticky top-0 border-b border-slate-700 bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Member ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => (
                                        <tr key={member._id} className="border-b border-slate-700 transition-colors hover:bg-slate-800/50">
                                            <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{member.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded bg-blue-900/30 px-2 py-1 text-sm text-blue-400">
                                                    {member.memberId}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400">
                                                {new Date(member.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
