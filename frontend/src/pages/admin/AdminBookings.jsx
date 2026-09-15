import { useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import { useToast } from '../../components/admin/Toast'
import api from '../../api/axios'

const BOOKING_STATUSES  = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
const PAYMENT_STATUSES  = ['UNPAID', 'PAID', 'REFUNDED', 'FAILED']

function BookingDetailModal({ booking, onClose, onUpdate, saving }) {
  const [form, setForm] = useState({
    status:         booking.status,
    payment_status: booking.payment_status,
    notes:          booking.notes || '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Booking</p>
            <h2 className="text-lg font-bold text-slate-900 font-mono mt-0.5">{booking.booking_reference}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Info grid */}
        <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">User</p>
            <p className="font-semibold text-slate-800">{booking.user?.full_name || '—'}</p>
            <p className="text-xs text-slate-500">{booking.user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Venue</p>
            <p className="font-semibold text-slate-800">{booking.venue_name || '—'}</p>
            <p className="text-xs text-slate-500">{booking.venue_city}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Sport</p>
            <p className="font-semibold text-slate-800">{booking.sport_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Date</p>
            <p className="font-semibold text-slate-800">{booking.booking_date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Time Slot</p>
            <p className="font-semibold text-slate-800">{booking.time_slot_display || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Amount</p>
            <p className="font-bold text-emerald-700">Rs. {parseFloat(booking.total_amount).toLocaleString()}</p>
          </div>
          {booking.payment_info && (
            <>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Payment Method</p>
                <p className="font-medium text-slate-800">{booking.payment_info.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Transaction ID</p>
                <p className="font-mono text-xs text-slate-700">{booking.payment_info.transaction_id || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Paid At</p>
                <p className="text-sm text-slate-700">
                  {booking.payment_info.paid_at
                    ? new Date(booking.payment_info.paid_at).toLocaleString()
                    : '—'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Edit form */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Booking Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              >
                {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Payment Status</label>
              <select
                name="payment_status"
                value={form.payment_status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              >
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Admin Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition resize-none"
              placeholder="Optional admin notes…"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={() => onUpdate(booking.id, form)}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : 'Update Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminBookings() {
  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payFilter, setPayFilter]     = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [selected, setSelected]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const { showToast, ToastContainer } = useToast()
  const debounceRef = useRef(null)

  function fetchBookings(s = search, st = statusFilter, pt = payFilter, df = dateFrom, dt = dateTo) {
    setLoading(true)
    const params = {}
    if (s)  params.search = s
    if (st) params.status = st
    if (pt) params.payment_status = pt
    if (df) params.date_from = df
    if (dt) params.date_to   = dt
    api.get('/admin/bookings/', { params })
      .then((r) => setBookings(r.data))
      .catch(() => showToast('Failed to load bookings.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, []) // eslint-disable-line

  function handleSearch(e) {
    const v = e.target.value
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchBookings(v, statusFilter, payFilter, dateFrom, dateTo), 400)
  }

  async function handleUpdate(id, form) {
    setSaving(true)
    try {
      const { data } = await api.patch(`/admin/bookings/${id}/`, form)
      setBookings((prev) => prev.map((b) => (b.id === id ? data : b)))
      setSelected(null)
      showToast('Booking updated successfully.')
    } catch {
      showToast('Failed to update booking.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function applyFilters(st, pt, df, dt) {
    setStatusFilter(st)
    setPayFilter(pt)
    setDateFrom(df)
    setDateTo(dt)
    fetchBookings(search, st, pt, df, dt)
  }

  return (
    <AdminLayout title="Bookings">
      <ToastContainer />

      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          saving={saving}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by reference, user, or venue…"
              value={search}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => applyFilters(e.target.value, payFilter, dateFrom, dateTo)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
          >
            <option value="">All Status</option>
            {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={payFilter}
            onChange={(e) => applyFilters(statusFilter, e.target.value, dateFrom, dateTo)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
          >
            <option value="">All Payments</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => applyFilters(statusFilter, payFilter, e.target.value, dateTo)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-emerald-400 outline-none transition"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => applyFilters(statusFilter, payFilter, dateFrom, e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-emerald-400 outline-none transition"
            />
          </div>
          {(statusFilter || payFilter || dateFrom || dateTo || search) && (
            <button
              onClick={() => {
                setSearch(''); setStatusFilter(''); setPayFilter('')
                setDateFrom(''); setDateTo('')
                fetchBookings('', '', '', '', '')
              }}
              className="text-xs font-medium text-slate-500 hover:text-red-500 transition"
            >
              ✕ Clear Filters
            </button>
          )}
          <span className="ml-auto text-sm text-slate-500">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-slate-500 text-sm">No bookings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Reference', 'User', 'Venue', 'Sport', 'Date', 'Amount', 'Status', 'Payment', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">{b.booking_reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-xs">{b.user?.full_name || '—'}</p>
                      <p className="text-slate-400 text-xs">{b.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">{b.venue_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{b.sport_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{b.booking_date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      Rs. {parseFloat(b.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={b.status} /></td>
                    <td className="px-4 py-3"><StatusBadge value={b.payment_status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(b)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition whitespace-nowrap"
                      >
                        View / Edit
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
