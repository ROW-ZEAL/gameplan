import { useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import { useToast } from '../../components/admin/Toast'
import api from '../../api/axios'

const ROLES = ['', 'USER', 'VENUE_ADMIN', 'SUPER_ADMIN']

function UserDetailModal({ user, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    role: user.role,
    is_active: user.is_active,
    is_verified: user.is_verified,
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{user.full_name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Phone</p>
            <p className="font-medium text-slate-800">{user.phone_number || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Joined</p>
            <p className="font-medium text-slate-800">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Current Role</p>
            <StatusBadge value={user.role} />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Status</p>
            <StatusBadge value={user.is_active} />
          </div>
        </div>

        {/* Edit form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
            >
              <option value="USER">User</option>
              <option value="VENUE_ADMIN">Venue Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 accent-emerald-600"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="is_verified"
                checked={form.is_verified}
                onChange={handleChange}
                className="w-4 h-4 accent-emerald-600"
              />
              Verified
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(user.id, form)}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const { showToast, ToastContainer } = useToast()
  const debounceRef = useRef(null)

  function fetchUsers(s = search, r = roleFilter) {
    setLoading(true)
    const params = {}
    if (s) params.search = s
    if (r) params.role = r
    api.get('/admin/users/', { params })
      .then((res) => setUsers(res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, []) // eslint-disable-line

  function handleSearch(e) {
    const v = e.target.value
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchUsers(v, roleFilter), 400)
  }

  function handleRoleFilter(e) {
    const v = e.target.value
    setRoleFilter(v)
    fetchUsers(search, v)
  }

  async function handleSave(id, form) {
    setSaving(true)
    try {
      await api.patch(`/admin/users/${id}/`, form)
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...form } : u)))
      setSelected(null)
      showToast('User updated successfully.')
    } catch {
      showToast('Failed to update user.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Users">
      <ToastContainer />
      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
          />
        </div>
        <select
          value={roleFilter}
          onChange={handleRoleFilter}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
        >
          <option value="">All Roles</option>
          {ROLES.slice(1).map((r) => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
        <div className="flex items-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-2">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">👤</div>
            <p className="text-slate-500 text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Verified</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold uppercase shrink-0">
                          {u.full_name?.[0] || u.email?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.full_name}</p>
                          <p className="text-slate-400 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge value={u.role} /></td>
                    <td className="px-5 py-3"><StatusBadge value={u.is_active} /></td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${u.is_verified ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {u.is_verified ? '✓ Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelected(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
