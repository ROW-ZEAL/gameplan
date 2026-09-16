import { useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import { useToast } from '../../components/admin/Toast'
import api from '../../api/axios'

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-4xl mb-3 text-center">⚠️</div>
        <p className="text-center text-slate-700 text-sm font-medium mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition">
            {loading ? 'Processing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VenueModal({ venue, sports, venueAdmins, facilities, onClose, onSave, saving }) {
  const isEdit = !!venue
  const [imageFile, setImageFile] = useState(null)
  const [imageError, setImageError] = useState('')
  const [imagePreview, setImagePreview] = useState(venue?.images?.[0]?.image || '')
  const parseTimeInput = (value) => {
    if (!value) return ''
    if (/^\d{2}:\d{2}$/.test(value) || /^\d{2}:\d{2}:\d{2}$/.test(value)) {
      return value.slice(0, 5)
    }
    if (/[AP]M/i.test(value)) {
      const [time, meridiem] = value.trim().split(/\s+/)
      const [hour, minute] = time.split(':').map(Number)
      let normalizedHour = hour
      if (meridiem.toUpperCase() === 'PM' && hour !== 12) normalizedHour += 12
      if (meridiem.toUpperCase() === 'AM' && hour === 12) normalizedHour = 0
      return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
    return value.slice(0, 5)
  }

  const buildInitialTimeSlots = () => {
    if (isEdit && Array.isArray(venue?.time_slots) && venue.time_slots.length > 0) {
      return venue.time_slots.map((slot) => ({
        id: slot.id || null,
        start_time: parseTimeInput(slot.start_time),
        end_time: parseTimeInput(slot.end_time),
        is_active: slot.is_active !== false,
      }))
    }
    return [
      { id: null, start_time: '06:00', end_time: '07:00', is_active: true },
    ]
  }

  const [form, setForm] = useState(
    isEdit
      ? {
          name: venue.name,
          sport_category: venue.sport_category?.id || '',
          owner: venue.owner?.id || '',
          description: venue.description || '',
          address: venue.address,
          city: venue.city,
          latitude: venue.latitude || '',
          longitude: venue.longitude || '',
          price_per_hour: venue.price_per_hour,
          opening_time: venue.opening_time,
          closing_time: venue.closing_time,
          is_active: venue.is_active,
          facilities: (venue.facilities || []).map((f) => f.id),
          time_slots: buildInitialTimeSlots(),
        }
      : {
          name: '', sport_category: '', owner: '', description: '',
          address: '', city: '', latitude: '', longitude: '',
          price_per_hour: '', opening_time: '06:00:00', closing_time: '22:00:00',
          is_active: true,
          facilities: [],
          time_slots: buildInitialTimeSlots(),
        }
  )
  const [errors, setErrors] = useState({})

  function updateTimeSlot(index, field, value) {
    setForm((prev) => ({
      ...prev,
      time_slots: prev.time_slots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }))
  }

  function addTimeSlot() {
    setForm((prev) => ({
      ...prev,
      time_slots: [...prev.time_slots, { id: null, start_time: '07:00', end_time: '08:00', is_active: true }],
    }))
  }

  function removeTimeSlot(index) {
    setForm((prev) => ({
      ...prev,
      time_slots: prev.time_slots.length > 1
        ? prev.time_slots.filter((_, i) => i !== index)
        : [{ id: null, start_time: '06:00', end_time: '07:00', is_active: true }],
    }))
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  function toggleFacility(facilityId) {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facilityId)
        ? prev.facilities.filter((id) => id !== facilityId)
        : [...prev.facilities, facilityId],
    }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose a valid image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be 5 MB or smaller.')
      return
    }
    setImageError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())         e.name = 'Name is required'
    if (!form.sport_category)       e.sport_category = 'Sport is required'
    if (!form.owner)               e.owner = 'Owner is required'
    if (!form.address.trim())       e.address = 'Address is required'
    if (!form.city.trim())         e.city = 'City is required'
    if (!form.price_per_hour)       e.price_per_hour = 'Price is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    if (!isEdit && !imageFile) {
      setImageError('A venue photo is required.')
      return
    }
    const payload = { ...form }
    payload.time_slots = (payload.time_slots || []).map((slot) => ({
      id: slot.id || undefined,
      start_time: slot.start_time || '00:00:00',
      end_time: slot.end_time || '00:00:00',
      is_active: slot.is_active !== false,
    }))
    if (!payload.latitude) delete payload.latitude
    if (!payload.longitude) delete payload.longitude
    if (!payload.description) delete payload.description
    onSave(isEdit ? venue.id : null, payload, imageFile)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit Venue' : 'Add Venue'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Venue Name', type: 'text', placeholder: 'e.g. Sunrise Arena' },
              { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Kathmandu' },
              { name: 'price_per_hour', label: 'Price / Hour (Rs.)', type: 'number', placeholder: '500' },
              { name: 'opening_time', label: 'Opening Time', type: 'time' },
              { name: 'closing_time', label: 'Closing Time', type: 'time' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">{f.label}</label>
                <input
                  type={f.type}
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors[f.name] ? 'border-red-300' : 'border-slate-300'}`}
                />
                {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Sport Category</label>
              <select
                name="sport_category"
                value={form.sport_category}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.sport_category ? 'border-red-300' : 'border-slate-300'}`}
              >
                <option value="">Select sport…</option>
                {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.sport_category && <p className="text-red-500 text-xs mt-1">{errors.sport_category}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Owner</label>
              <select
                name="owner"
                value={form.owner}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.owner ? 'border-red-300' : 'border-slate-300'}`}
              >
                <option value="">Select owner…</option>
                {venueAdmins.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name} ({a.email})</option>
                ))}
              </select>
              {errors.owner && <p className="text-red-500 text-xs mt-1">{errors.owner}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Full street address"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.address ? 'border-red-300' : 'border-slate-300'}`}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Latitude (optional)</label>
              <input type="number" step="any" name="latitude" value={form.latitude} onChange={handleChange} placeholder="27.7172" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Longitude (optional)</label>
              <input type="number" step="any" name="longitude" value={form.longitude} onChange={handleChange} placeholder="85.3240" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Description (optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of this venue…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Venue Photo {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Venue preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-500">Photo preview</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200"
                />
                <p className="text-[11px] text-slate-500 mt-2">Use a clear JPG, PNG, or WebP photo up to 5 MB.</p>
                {imageError && <p className="text-red-500 text-xs mt-1">{imageError}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Facilities</label>
            {facilities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No facilities available. Add them from the Facilities page first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 max-h-40 overflow-y-auto">
                {facilities.map((facility) => (
                  <label
                    key={facility.id}
                    className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-emerald-50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={form.facilities.includes(facility.id)}
                      onChange={() => toggleFacility(facility.id)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span>{facility.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Select all facilities that this venue provides.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Time Slots</h3>
              <button
                type="button"
                onClick={addTimeSlot}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition"
              >
                + Add Slot
              </button>
            </div>

            <div className="space-y-3">
              {form.time_slots.map((slot, index) => (
                <div key={`${slot.id || 'new'}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Slot {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateTimeSlot(index, 'start_time', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateTimeSlot(index, 'end_time', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="w-4 h-4 accent-emerald-600" />
              Active (venue visible to users)
            </label>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Venue'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminVenues() {
  const [venues, setVenues] = useState([])
  const [sports, setSports] = useState([])
  const [facilities, setFacilities] = useState([])
  const [venueAdmins, setVenueAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [selected, setSelected] = useState(null)   // null = hidden, false = add, object = edit
  const [toDeactivate, setToDeactivate] = useState(null)
  const [saving, setSaving] = useState(false)
  const { showToast, ToastContainer } = useToast()
  const debounceRef = useRef(null)

  function fetchVenues(s = search, sp = sportFilter, a = activeFilter) {
    setLoading(true)
    const params = {}
    if (s)  params.search = s
    if (sp) params.sport = sp
    if (a !== '') params.is_active = a
    api.get('/admin/venues/', { params })
      .then((r) => setVenues(r.data))
      .catch(() => showToast('Failed to load venues.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchVenues()
    api.get('/admin/sports/').then((r) => setSports(r.data)).catch(() => {})
    api.get('/admin/facilities/').then((r) => setFacilities(r.data)).catch(() => {})
    api.get('/admin/venue-admins/').then((r) => setVenueAdmins(r.data)).catch(() => {})
  }, []) // eslint-disable-line

  function handleSearch(e) {
    const v = e.target.value
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchVenues(v, sportFilter, activeFilter), 400)
  }

  async function handleSave(id, form, imageFile) {
    setSaving(true)
    try {
      let venue
      if (id) {
        const { data } = await api.patch(`/admin/venues/${id}/`, form)
        venue = data
      } else {
        const { data } = await api.post('/admin/venues/', form)
        venue = data
      }
      if (imageFile) {
        const imageData = new FormData()
        imageData.append('image', imageFile)
        const { data: uploadedImage } = await api.post(`/admin/venues/${venue.id}/images/`, imageData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        venue = { ...venue, images: [...(venue.images || []), uploadedImage] }
      }
      setVenues((prev) => id ? prev.map((v) => (v.id === id ? venue : v)) : [venue, ...prev])
      showToast(id ? 'Venue updated successfully.' : 'Venue created successfully.')
      setSelected(null)
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to save venue.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id) {
    setSaving(true)
    try {
      await api.delete(`/admin/venues/${id}/`)
      setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: false } : v)))
      setToDeactivate(null)
      showToast('Venue deactivated.')
    } catch {
      showToast('Failed to deactivate venue.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Venues">
      <ToastContainer />

      {selected !== null && (
        <VenueModal
          venue={selected === false ? null : selected}
          sports={sports}
          venueAdmins={venueAdmins}
          facilities={facilities}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {toDeactivate && (
        <ConfirmDialog
          message={`Remove "${toDeactivate.name}"? It will be hidden from users but kept in the admin records.`}
          onConfirm={() => handleDeactivate(toDeactivate.id)}
          onCancel={() => setToDeactivate(null)}
          loading={saving}
        />
      )}

      {/* Filters & add button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search venues…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
          />
        </div>
        <select
          value={sportFilter}
          onChange={(e) => { setSportFilter(e.target.value); fetchVenues(search, e.target.value, activeFilter) }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
        >
          <option value="">All Sports</option>
          {sports.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); fetchVenues(search, sportFilter, e.target.value) }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          onClick={() => setSelected(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Venue
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-28" />
                </div>
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="text-slate-500 text-sm">No venues found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Venue', 'Sport', 'City', 'Price/hr', 'Bookings', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {venues.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{v.name}</p>
                      <p className="text-xs text-slate-400">{v.owner?.full_name || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{v.sport_category?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{v.city}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium">Rs. {parseFloat(v.price_per_hour).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-600">{v.booking_count ?? 0}</td>
                    <td className="px-5 py-3"><StatusBadge value={v.is_active} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          Edit
                        </button>
                        {v.is_active && (
                          <button
                            onClick={() => setToDeactivate(v)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
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
