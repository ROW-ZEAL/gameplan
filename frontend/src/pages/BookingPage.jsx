import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import PaymentModal from '../components/PaymentModal'
import api from '../api/axios'

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function BookingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState(null)
  const [payingBooking, setPayingBooking] = useState(null) // booking object shown in modal

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let active = true

    async function loadBookings() {
      try {
        const { data } = await api.get('/bookings/')
        if (!active) return
        setBookings(data)
        setError(null)
      } catch {
        if (!active) return
        setError('Unable to load bookings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBookings()
    return () => { active = false }
  }, [])

  async function handleCancel(bookingId) {
    setCancellingId(bookingId)
    setCancelError(null)
    try {
      const { data } = await api.post(`/bookings/${bookingId}/cancel/`)
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)))
    } catch (err) {
      setCancelError(err?.response?.data?.detail || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  // Called by PaymentModal when a payment is initiated (PAY_AT_VENUE or eSewa redirect)
  function handlePaymentSuccess(updatedBooking) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b))
    )
  }

  function paymentBadge(b) {
    if (b.payment_status === 'PAID') {
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
          Paid
        </span>
      )
    }
    const info = b.payment_info
    if (info && info.payment_method === 'PAY_AT_VENUE' && info.status === 'PENDING') {
      return (
        <div className="flex flex-col gap-1">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-700">
            Pay at Venue
          </span>
          <span className="font-mono text-xs text-slate-500">{info.transaction_id}</span>
        </div>
      )
    }
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
        Unpaid
      </span>
    )
  }

  function canPay(b) {
    if (b.status === 'CANCELLED') return false
    if (b.payment_status === 'PAID') return false
    if (b.payment_info) return false // already has a payment record
    return true
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-4xl font-semibold text-slate-900">Booking Overview</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Review your current reservations and manage bookings from one place.
          </p>
        </section>

        {cancelError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            {cancelError}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Loading bookings…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            You have no bookings yet.
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Booking</th>
                  <th className="px-6 py-4 font-medium">Venue</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Payment</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{b.user?.full_name || ''}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{b.booking_reference}</td>
                    <td className="px-6 py-4 text-slate-600">{b.venue_name || b.venue}</td>
                    <td className="px-6 py-4 text-slate-600">{b.booking_date}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {b.time_slot_start} – {b.time_slot_end}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatRs(b.total_amount)}</td>

                    <td className="px-6 py-4">{paymentBadge(b)}</td>

                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                        b.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                        b.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {b.is_cancellable ? (
                          <button
                            onClick={() => handleCancel(b.id)}
                            disabled={cancellingId === b.id}
                            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60 hover:bg-rose-700"
                          >
                            {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}

                        {canPay(b) && (
                          <button
                            onClick={() => setPayingBooking(b)}
                            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>

      {payingBooking && (
        <PaymentModal
          booking={payingBooking}
          onClose={() => setPayingBooking(null)}
          onSuccess={(updated) => {
            handlePaymentSuccess(updated)
          }}
        />
      )}
    </div>
  )
}
