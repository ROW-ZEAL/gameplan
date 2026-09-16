import { useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useToast } from '../../components/admin/Toast'
import api from '../../api/axios'

function FacilityModal({ facility, onClose, onSave, saving }) {
  const isEdit = !!facility
  const [form, setForm] = useState({
    name: facility?.name || '',
  })
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    onSave(isEdit ? facility.id : null, form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit Facility' : 'Add Facility'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Facility Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Wi-Fi, Parking, Shower…"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.name ? 'border-red-300' : 'border-slate-300'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ facility, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-4xl mb-3 text-center">🗑️</div>
        <h3 className="text-center font-semibold text-slate-900 mb-1">Delete Facility?</h3>
        <p className="text-center text-slate-500 text-sm mb-5">
          Are you sure you want to delete <strong>{facility.name}</strong>?
          {facility.venue_count > 0 && (
            <span className="block mt-2 text-red-500 font-medium">
              ⚠️ This facility is used by {facility.venue_count} venue{facility.venue_count !== 1 ? 's' : ''} and cannot be deleted.
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || facility.venue_count > 0}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminFacilities() {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const { showToast, ToastContainer } = useToast()
  const debounceRef = useRef(null)

  function fetchFacilities(s = search) {
    setLoading(true)
    const params = s ? { search: s } : {}
    api.get('/admin/facilities/', { params })
      .then((r) => setFacilities(r.data))
      .catch(() => showToast('Failed to load facilities.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFacilities() }, []) // eslint-disable-line

  function handleSearch(e) {
    const v = e.target.value
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchFacilities(v), 400)
  }

  async function handleSave(id, form) {
    setSaving(true)
    try {
      if (id) {
        const { data } = await api.patch(`/admin/facilities/${id}/`, form)
        setFacilities((prev) => prev.map((f) => (f.id === id ? data : f)))
        showToast('Facility updated successfully.')
      } else {
        const { data } = await api.post('/admin/facilities/', form)
        setFacilities((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Facility added successfully.')
      }
      setSelected(null)
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save facility.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setSaving(true)
    try {
      await api.delete(`/admin/facilities/${id}/`)
      setFacilities((prev) => prev.filter((f) => f.id !== id))
      setToDelete(null)
      showToast('Facility deleted.')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete facility.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Facilities">
      <ToastContainer />

      {selected !== null && (
        <FacilityModal
          facility={selected === false ? null : selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {toDelete && (
        <ConfirmDeleteDialog
          facility={toDelete}
          onConfirm={() => handleDelete(toDelete.id)}
          onCancel={() => setToDelete(null)}
          loading={saving}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search facilities…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
          />
        </div>
        <button
          onClick={() => setSelected(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Facility
        </button>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {facilities.length} facility{facilities.length !== 1 ? 'ies' : 'y'}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-24" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-slate-500 text-sm">No facilities found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((facility) => (
            <div key={facility.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold">
                      {facility.name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">{facility.name}</h3>
                      <p className="text-xs text-slate-500">{facility.venue_count ?? 0} venue{(facility.venue_count ?? 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex justify-end gap-2">
                <button
                  onClick={() => setSelected(facility)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setToDelete(facility)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
