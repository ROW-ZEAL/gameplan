import { useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import { useToast } from '../../components/admin/Toast'
import api from '../../api/axios'

const PAYMENT_STATUSES = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']
const PAYMENT_METHODS  = ['ESEWA', 'PAY_AT_VENUE', 'CARD', 'BANK_TRANSFER', 'WALLET', 'CASH']

function PaymentDetailModal({ payment, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Payment Record</p>
            <h2 className="text-base font-bold text-slate-900 font-mono mt-0.5">{payment.transaction_id || '—'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Booking Ref', value: payment.booking_reference, mono: true },
            { label: 'User',        value: payment.user_name || payment.user_email },
            { label: 'Email',       value: payment.user_email },
            { label: 'Venue',       value: payment.venue_name },
            { label: 'Amount',      value: `Rs. ${parseFloat(payment.amount).toLocaleString()}`, bold: true },
            { label: 'Method',      value: payment.payment_method },
            { label: 'Status',      component: <StatusBadge value={payment.status} /> },
            { label: 'Paid At',     value: payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '—' },
            { label: 'Created',     value: new Date(payment.created_at).toLocaleString() },
            { label: 'Payment ID',  value: payment.id?.slice(0, 8) + '…', mono: true },
          ].map((row) => (
            <div key={row.label} className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">{row.label}</p>
              {row.component || (
                <p className={`text-sm ${row.bold ? 'font-bold text-emerald-700' : 'font-medium text-slate-800'} ${row.mono ? 'font-mono' : ''}`}>
                  {row.value || '—'}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const [payments, setPayments]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [selected, setSelected]       = useState(null)
  const { showToast, ToastContainer } = useToast()
  const debounceRef = useRef(null)

  function fetchPayments(s = search, st = statusFilter, m = methodFilter) {
    setLoading(true)
    const params = {}
    if (s)  params.search = s
    if (st) params.status = st
    if (m)  params.method = m
    api.get('/admin/payments/', { params })
      .then((r) => setPayments(r.data))
      .catch(() => showToast('Failed to load payments.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPayments() }, []) // eslint-disable-line

  function handleSearch(e) {
    const v = e.target.value
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPayments(v, statusFilter, methodFilter), 400)
  }

  // Revenue summary
  const totalRevenue  = payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + parseFloat(p.amount), 0)
  const pendingAmount = payments.filter((p) => p.status === 'PENDING').reduce((s, p) => s + parseFloat(p.amount), 0)

  return (
    <AdminLayout title="Payments">
      <ToastContainer />

      {selected && <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />}

      {/* Summary cards */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Records', value: payments.length, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Successful',    value: payments.filter((p) => p.status === 'SUCCESS').length,  color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Pending',       value: payments.filter((p) => p.status === 'PENDING').length,  color: 'text-amber-700',   bg: 'bg-amber-50' },
            { label: 'Failed',        value: payments.filter((p) => p.status === 'FAILED').length,   color: 'text-red-700',     bg: 'bg-red-50' },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl border border-slate-200 ${c.bg} p-4 shadow-sm`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue summary */}
      {!loading && payments.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm">
            <span className="text-emerald-200 text-xs uppercase tracking-wide">Collected Revenue:</span>
            <span>Rs. {totalRevenue.toLocaleString()}</span>
          </div>
          {pendingAmount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-sm font-semibold border border-amber-200">
              <span className="text-amber-500 text-xs uppercase tracking-wide">Pending:</span>
              <span>Rs. {pendingAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by transaction, booking, user…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); fetchPayments(search, e.target.value, methodFilter) }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
        >
          <option value="">All Statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); fetchPayments(search, statusFilter, e.target.value) }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none transition"
        >
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
        </select>

        <div className="flex items-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-2">
          {payments.length} record{payments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-56" />
                </div>
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">💳</div>
            <p className="text-slate-500 text-sm">No payment records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Transaction ID', 'Booking', 'User', 'Venue', 'Amount', 'Method', 'Status', 'Paid At', 'Details'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700">{p.transaction_id ? p.transaction_id.slice(0, 16) + (p.transaction_id.length > 16 ? '…' : '') : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">{p.booking_reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 text-xs font-medium">{p.user_name || '—'}</p>
                      <p className="text-slate-400 text-xs">{p.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{p.venue_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${p.status === 'SUCCESS' ? 'text-emerald-700' : 'text-slate-700'}`}>
                        Rs. {parseFloat(p.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                        {p.payment_method?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={p.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(p)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        View
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
