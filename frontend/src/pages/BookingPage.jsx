import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function BookingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState(null)
  const [payingId, setPayingId] = useState(null)
  const [payError, setPayError] = useState(null)

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
      } catch (err) {
        if (!active) return
        setError('Unable to load bookings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBookings()

    return () => {
      active = false
    }
  }, [])

  async function handleCancel(bookingId) {
    setCancellingId(bookingId)
    setCancelError(null)

    try {
      const { data } = await api.post(`/bookings/${bookingId}/cancel/`)
      // Update the booking in the list with the new status
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? data : b))
      )
    } catch (err) {
      setCancelError(err?.response?.data?.detail || 'Failed to cancel booking.')
    } finally {
      setCancellingId(null)
    }
  }

  async function handlePay(bookingId) {
    setPayingId(bookingId)
    setPayError(null)

    try {
      // send a simple manual payment payload; backend validates ownership and status
      const payload = { payment_method: 'manual', transaction_id: `txn_${Date.now()}` }
      await api.post(`/bookings/${bookingId}/pay/`, payload)
      // optimistic update: mark booking as PAID
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, payment_status: 'PAID' } : b)))
    } catch (err) {
      setPayError(err?.response?.data || 'Payment failed.')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-4xl font-semibold text-slate-900">Booking Overview</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Review your current reservations and manage bookings from one place.</p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">Loading bookings...</div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">{error}</div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">You have no bookings yet.</div>
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
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{b.user?.full_name || ''}</td>
                      <td className="px-6 py-4 text-slate-600">{b.notes || 'Booking'}</td>
                      <td className="px-6 py-4 text-slate-600">{b.venue_name || b.venue}</td>
                      <td className="px-6 py-4 text-slate-600">{b.booking_date}</td>
                      <td className="px-6 py-4 text-slate-600">{b.time_slot_start} - {b.time_slot_end}</td>
                      <td className="px-6 py-4 text-slate-600">₨{b.total_amount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${b.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {b.payment_status}
                        </span>
                        <span className="text-xs text-slate-500">{b.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {b.is_cancellable ? (
                          <button
                            onClick={() => handleCancel(b.id)}
                            disabled={cancellingId === b.id}
                            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60 hover:bg-rose-700"
                          >
                            {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Not cancellable</span>
                        )}

                        {b.payment_status !== 'PAID' && b.status !== 'CANCELLED' ? (
                          <button
                            onClick={() => handlePay(b.id)}
                            disabled={payingId === b.id}
                            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60 hover:bg-indigo-700"
                          >
                            {payingId === b.id ? 'Processing...' : 'Pay'}
                          </button>
                        ) : null}
                      </div>
                      {payError && <p className="mt-2 text-xs text-rose-600">{payError}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  )
}
