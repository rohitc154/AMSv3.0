import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function SuperAdminDashboard() {
    const { user, logout } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Which org card is currently open for editing (stores org._id or null)
    const [editingOrgId, setEditingOrgId] = useState(null);
    const [editForm, setEditForm] = useState({
        orgName: '',
        latitude: '',
        longitude: '',
        radiusAllowed: '',
    });
    const [editSaving, setEditSaving] = useState(false);
    const [editMsg, setEditMsg] = useState('');

    const [createOrgForm, setCreateOrgForm] = useState({
        orgName: '',
        latitude: '',
        longitude: '',
        radiusAllowed: '200',
    });

    const [createAdminForm, setCreateAdminForm] = useState({
        name: '',
        email: '',
    });

    useEffect(() => {
        loadOrganizations();
    }, []);

    async function loadOrganizations() {
        setLoading(true);
        try {
            const { data } = await api.get('/organizations/admin/list');
            setOrganizations(data.organizations || []);
        } catch (err) {
            setError('Failed to load organizations');
        } finally {
            setLoading(false);
        }
    }

    // Open the edit panel for a specific org card and pre-fill the form
    function openEdit(org) {
        setEditingOrgId(org._id);
        setEditMsg('');
        setEditForm({
            orgName: org.orgName,
            latitude: String(org.location?.lat ?? ''),
            longitude: String(org.location?.lng ?? ''),
            radiusAllowed: String(org.radiusAllowed ?? ''),
        });
    }

    function closeEdit() {
        setEditingOrgId(null);
        setEditMsg('');
    }

    async function handleEditOrganization(e, orgId) {
        e.preventDefault();
        setEditMsg('');
        setEditSaving(true);
        try {
            await api.put(`/organizations/${orgId}`, {
                orgName: editForm.orgName.trim(),
                latitude: parseFloat(editForm.latitude),
                longitude: parseFloat(editForm.longitude),
                radiusAllowed: parseFloat(editForm.radiusAllowed),
            });
            setEditMsg('Saved successfully!');
            await loadOrganizations();
            // Close after a short delay so user sees the success message
            setTimeout(() => closeEdit(), 1000);
        } catch (err) {
            setEditMsg(err.response?.data?.message || 'Failed to update organization');
        } finally {
            setEditSaving(false);
        }
    }

    async function handleCreateOrganization(e) {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            await api.post('/organizations', {
                orgName: createOrgForm.orgName.trim(),
                latitude: parseFloat(createOrgForm.latitude),
                longitude: parseFloat(createOrgForm.longitude),
                radiusAllowed: parseFloat(createOrgForm.radiusAllowed),
            });
            setMessage('Organization created successfully!');
            setCreateOrgForm({ orgName: '', latitude: '', longitude: '', radiusAllowed: '200' });
            setShowCreateOrg(false);
            await loadOrganizations();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create organization');
        }
    }

    async function handleCreateAdmin(e) {
        e.preventDefault();
        setMessage('');
        setError('');
        if (!selectedOrgId) {
            setError('Please select an organization');
            return;
        }
        try {
            const response = await api.post('/auth/create-org-admin', {
                name: createAdminForm.name.trim(),
                email: createAdminForm.email.trim(),
                organizationId: selectedOrgId,
            });
            setMessage(
                `Admin created! Temporary password: ${response.data.admin.temporaryPassword} — share this securely.`
            );
            setCreateAdminForm({ name: '', email: '' });
            setShowCreateAdmin(false);
            setTimeout(() => loadOrganizations(), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create admin');
        }
    }

    async function handleRemoveAdmin(adminId, orgName) {
        if (!window.confirm(`Remove admin from ${orgName}?`)) return;
        setMessage('');
        setError('');
        try {
            await api.delete(`/users/admin/${adminId}`);
            setMessage('Admin removed successfully');
            await loadOrganizations();
        } catch (err) {
            setError('Failed to remove admin');
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-slate-400">Loading organizations...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">

            {/* ── Header ── */}
            <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-400">Manage organizations and admins</p>
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

                {/* ── Global messages ── */}
                {message && (
                    <div className="mb-4 flex items-start justify-between rounded bg-green-900/20 p-4 text-green-400">
                        <span>{message}</span>
                        <button onClick={() => setMessage('')} className="ml-4 text-green-600 hover:text-green-400">✕</button>
                    </div>
                )}
                {error && (
                    <div className="mb-4 flex items-start justify-between rounded bg-red-900/20 p-4 text-red-400">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-4 text-red-600 hover:text-red-400">✕</button>
                    </div>
                )}

                {/* ── Action buttons ── */}
                <div className="mb-8 flex flex-wrap gap-3">
                    <button
                        onClick={() => { setShowCreateOrg(!showCreateOrg); setShowCreateAdmin(false); }}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        {showCreateOrg ? 'Cancel' : '+ Create Organization'}
                    </button>
                    <button
                        onClick={() => { setShowCreateAdmin(!showCreateAdmin); setShowCreateOrg(false); }}
                        className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
                    >
                        {showCreateAdmin ? 'Cancel' : '+ Assign Organization Admin'}
                    </button>
                </div>

                {/* ── Create Organization form ── */}
                {showCreateOrg && (
                    <div className="mb-8 rounded border border-slate-700 bg-slate-800/50 p-6">
                        <h3 className="mb-4 text-lg font-semibold">Create New Organization</h3>
                        <form onSubmit={handleCreateOrganization} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Organization Name</label>
                                <input
                                    type="text"
                                    value={createOrgForm.orgName}
                                    onChange={(e) => setCreateOrgForm({ ...createOrgForm, orgName: e.target.value })}
                                    className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Latitude</label>
                                    <input
                                        type="number" step="0.0001"
                                        value={createOrgForm.latitude}
                                        onChange={(e) => setCreateOrgForm({ ...createOrgForm, latitude: e.target.value })}
                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Longitude</label>
                                    <input
                                        type="number" step="0.0001"
                                        value={createOrgForm.longitude}
                                        onChange={(e) => setCreateOrgForm({ ...createOrgForm, longitude: e.target.value })}
                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Radius Allowed (meters)</label>
                                <input
                                    type="number"
                                    value={createOrgForm.radiusAllowed}
                                    onChange={(e) => setCreateOrgForm({ ...createOrgForm, radiusAllowed: e.target.value })}
                                    className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700">
                                Create Organization
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Assign Admin form ── */}
                {showCreateAdmin && (
                    <div className="mb-8 rounded border border-slate-700 bg-slate-800/50 p-6">
                        <h3 className="mb-4 text-lg font-semibold">Assign Organization Admin</h3>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Select Organization</label>
                                <select
                                    value={selectedOrgId}
                                    onChange={(e) => setSelectedOrgId(e.target.value)}
                                    className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                >
                                    <option value="">Choose an organization...</option>
                                    {organizations.map((org) => (
                                        <option key={org._id} value={org._id}>
                                            {org.orgName} {org.adminId ? '(Has Admin)' : '(No Admin)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Admin Name</label>
                                <input
                                    type="text"
                                    value={createAdminForm.name}
                                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, name: e.target.value })}
                                    className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Admin Email</label>
                                <input
                                    type="email"
                                    value={createAdminForm.email}
                                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                                    className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700">
                                Create Admin
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Organizations list ── */}
                <div>
                    <h2 className="mb-4 text-xl font-semibold">Organizations ({organizations.length})</h2>

                    {organizations.length === 0 ? (
                        <p className="text-slate-400">No organizations created yet.</p>
                    ) : (
                        <div className="grid gap-4">
                            {organizations.map((org) => (
                                <div
                                    key={org._id}
                                    className="rounded border border-slate-700 bg-slate-800/50 p-4"
                                >
                                    {/* ── Card top row: info + action buttons ── */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{org.orgName}</h3>
                                            <p className="mt-1 text-sm text-slate-400">
                                                📍 Lat: {org.location?.lat}, Lng: {org.location?.lng}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                📏 Radius: {org.radiusAllowed}m
                                            </p>
                                            {org.adminId ? (
                                                <div className="mt-2 inline-block rounded bg-green-900/20 px-3 py-1 text-sm text-green-400">
                                                    ✓ Admin: {org.adminId?.name} ({org.adminId?.email})
                                                </div>
                                            ) : (
                                                <div className="mt-2 inline-block rounded bg-yellow-900/20 px-3 py-1 text-sm text-yellow-400">
                                                    ⚠ No admin assigned
                                                </div>
                                            )}
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                                            <button
                                                onClick={() =>
                                                    editingOrgId === org._id ? closeEdit() : openEdit(org)
                                                }
                                                className="rounded bg-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-500"
                                            >
                                                {editingOrgId === org._id ? 'Cancel Edit' : 'Edit'}
                                            </button>
                                            {org.adminId && (
                                                <button
                                                    onClick={() => handleRemoveAdmin(org.adminId._id, org.orgName)}
                                                    className="rounded bg-red-600/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-600/30"
                                                >
                                                    Remove Admin
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Inline edit form (only shown for the selected org) ── */}
                                    {editingOrgId === org._id && (
                                        <form
                                            onSubmit={(e) => handleEditOrganization(e, org._id)}
                                            className="mt-4 border-t border-slate-700 pt-4"
                                        >
                                            <h4 className="mb-3 text-sm font-semibold text-slate-300">
                                                Edit Organization
                                            </h4>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-slate-400">
                                                        Organization Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editForm.orgName}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, orgName: e.target.value })
                                                        }
                                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400">
                                                        Latitude
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={editForm.latitude}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, latitude: e.target.value })
                                                        }
                                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400">
                                                        Longitude
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={editForm.longitude}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, longitude: e.target.value })
                                                        }
                                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-slate-400">
                                                        Radius Allowed (meters)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={editForm.radiusAllowed}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, radiusAllowed: e.target.value })
                                                        }
                                                        className="mt-1 w-full rounded bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center gap-3">
                                                <button
                                                    type="submit"
                                                    disabled={editSaving}
                                                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {editSaving ? 'Saving…' : 'Save Changes'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={closeEdit}
                                                    className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
                                                >
                                                    Cancel
                                                </button>
                                                {editMsg && (
                                                    <span
                                                        className={`text-sm ${editMsg.includes('success') || editMsg.includes('Saved')
                                                                ? 'text-green-400'
                                                                : 'text-red-400'
                                                            }`}
                                                    >
                                                        {editMsg}
                                                    </span>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
