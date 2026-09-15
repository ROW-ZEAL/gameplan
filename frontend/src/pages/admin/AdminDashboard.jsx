import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import api from '../../api/axios'

function StatCard({ label, value, sub, icon, gradient, loading }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <p className="mt-1 text-3xl font-bold">{value}</p>
          )}
          {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
    </div>
  )
}

function BookingStatusCard({ label, count, color, loading }) {
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-12 rounded bg-slate-200 animate-pulse" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
      )}
    </div>
  )
}

function RecentTable({ title, rows, columns, emptyText }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-400 text-sm">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/stats/')
      .then((r) => setStats(r.data))
      .catch(() => setError('Failed to load dashboard stats.'))
      .finally(() => setLoading(false))
  }, [])

  const bookingCols = [
    { key: 'booking_reference', label: 'Reference', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.booking_reference}</span> },
    { key: 'user',     label: 'User',    render: (r) => r.user?.full_name || r.user?.email || '—' },
    { key: 'venue_name', label: 'Venue', render: (r) => r.venue_name || '—' },
    { key: 'booking_date', label: 'Date', render: (r) => r.booking_date },
    { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${parseFloat(r.total_amount).toLocaleString()}` },
    { key: 'status',   label: 'Status',  render: (r) => <StatusBadge value={r.status} /> },
  ]

  const paymentCols = [
    { key: 'booking_reference', label: 'Booking', render: (r) => <span className="font-mono text-xs font-semibold">{r.booking_reference}</span> },
    { key: 'user_name', label: 'User',   render: (r) => r.user_name || r.user_email || '—' },
    { key: 'venue_name', label: 'Venue', render: (r) => r.venue_name || '—' },
    { key: 'amount',    label: 'Amount', render: (r) => `Rs. ${parseFloat(r.amount).toLocaleString()}` },
    { key: 'payment_method', label: 'Method', render: (r) => <span className="text-xs font-medium">{r.payment_method}</span> },
    { key: 'status',    label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
  ]

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Users"
          value={stats?.total_users ?? '—'}
          icon="👥"
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          loading={loading}
        />
        <StatCard
          label="Total Venues"
          value={stats?.total_venues ?? '—'}
          sub={stats ? `${stats.active_venues} active` : undefined}
          icon="🏟️"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          loading={loading}
        />
        <StatCard
          label="Total Bookings"
          value={stats?.total_bookings ?? '—'}
          icon="📅"
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
          loading={loading}
        />
        <StatCard
          label="Total Revenue"
          value={stats ? `Rs. ${stats.total_revenue.toLocaleString()}` : '—'}
          sub="Successful payments"
          icon="💰"
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          loading={loading}
        />
      </div>

      {/* Booking status breakdown */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Booking Status Breakdown</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BookingStatusCard label="Pending"   count={stats?.booking_status?.pending   ?? '—'} color="border-amber-200"   loading={loading} />
          <BookingStatusCard label="Confirmed" count={stats?.booking_status?.confirmed ?? '—'} color="border-emerald-200" loading={loading} />
          <BookingStatusCard label="Completed" count={stats?.booking_status?.completed ?? '—'} color="border-blue-200"    loading={loading} />
          <BookingStatusCard label="Cancelled" count={stats?.booking_status?.cancelled ?? '—'} color="border-red-200"     loading={loading} />
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <RecentTable
          title="Recent Bookings"
          rows={loading ? [] : (stats?.recent_bookings ?? [])}
          columns={bookingCols}
          emptyText="No bookings yet"
        />
        <RecentTable
          title="Recent Payments"
          rows={loading ? [] : (stats?.recent_payments ?? [])}
          columns={paymentCols}
          emptyText="No payments yet"
        />
      </div>

      {loading && (
        <div className="mt-4 text-center text-sm text-slate-400">Loading dashboard data…</div>
      )}
    </AdminLayout>
  )
}
