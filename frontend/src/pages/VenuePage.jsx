import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function VenuePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)


    // booking modal state
    const [activeVenue, setActiveVenue] = useState(null)
    const [bookingDate, setBookingDate] = useState('')
    const [timeSlot, setTimeSlot] = useState('')
    const [amount, setAmount] = useState('')
    const [availableTimeSlots, setAvailableTimeSlots] = useState([])
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState(null)

    async function handleLogout() {
      await logout()
      navigate('/login')
    }

    useEffect(() => {
      let active = true

      async function loadVenues() {
        try {
          const params = {}
          const q = new URLSearchParams(location.search)
          const sport_category = q.get('sport_category')
          if (sport_category) params.sport_category = sport_category

          const { data } = await api.get('/venues/', { params })
          if (!active) return
          setVenues(data)
          setError(null)
        } catch (err) {
          if (!active) return
          setError('Unable to load venues. Please try again.')
        } finally {
          if (active) setLoading(false)
        }
      }

      loadVenues()

      return () => {
        active = false
      }
    }, [location.search])

    function openBooking(venue) {
      ;(async () => {
        try {
          const { data } = await api.get(`/venues/${venue.id}/`)
          setAvailableTimeSlots(data.time_slots || [])
          setActiveVenue(venue)
          setBookingDate('')
          setTimeSlot('')
          setAmount(venue.price_per_hour || '')
          setNotes('')
          setSubmitError(null)
        } catch (err) {
          setSubmitError('Unable to load venue time slots.')
        }
      })()
    }

    function closeBooking() {
      setActiveVenue(null)
      setSubmitting(false)
      setSubmitError(null)
    }

    async function submitBooking(e) {
      e.preventDefault()
      if (!activeVenue) return
      setSubmitting(true)
      setSubmitError(null)

      const payload = {
        venue: activeVenue.id,
        booking_date: bookingDate,
        time_slot: timeSlot || null,
        total_amount: amount || activeVenue.price_per_hour || '0.00',
        notes: notes || '',
      }

      try {
        const { data } = await api.post('/bookings/', payload)
        // success — navigate to bookings page or refresh list
        closeBooking()
        navigate('/booking')
      } catch (err) {
        setSubmitError(err?.response?.data?.detail || 'Failed to create booking.')
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
          <section className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
            <h1 className="text-4xl font-semibold text-slate-900">Featured Venues</h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Browse trusted venues and choose the best place for your next booking.
            </p>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
              Loading venues...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">
              {error}
            </div>
          ) : venues.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
              No venues available yet.
            </div>
          ) : (
            <section className="grid gap-6 lg:grid-cols-3">
              {venues.map((venue) => (
                <article key={venue.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-52 overflow-hidden bg-slate-100">
                    <img
                      src={venue.primary_image || '/campnou.jpg'}
                      alt={venue.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{venue.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">{venue.city || 'Unknown city'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${venue.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {venue.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">Sport:</span>{' '}
                        {venue.sport_category?.name || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Address:</span> {venue.address || 'Not available'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Rate:</span> ₨{venue.price_per_hour} / hour
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <button
                        onClick={() => openBooking(venue)}
                        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Book now
                      </button>
                      <button
                        onClick={() => navigate(`/venues/${venue.id}`)}
                        className="text-sm text-slate-600 hover:text-slate-900"
                      >
                        View details →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {/* Booking modal */}
          {activeVenue && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/40" onClick={closeBooking} />
              <form onSubmit={submitBooking} className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900">Book {activeVenue.name}</h3>
                <p className="mt-1 text-sm text-slate-600">Rate: ₨{activeVenue.price_per_hour} / hour</p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-slate-700">Date</label>
                  <input
                    required
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                  />

                  <label className="block text-sm text-slate-700">Time slot</label>
                  <select
                    required
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                  >
                    <option value="">Select a time slot</option>
                    {availableTimeSlots.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {ts.start_time} - {ts.end_time}
                      </option>
                    ))}
                  </select>

                  <label className="block text-sm text-slate-700">Total amount</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                  />

                  <label className="block text-sm text-slate-700">Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2"
                  />
                </div>

                {submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeBooking} className="rounded-md px-4 py-2 text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                  >
                    {submitting ? 'Booking...' : 'Confirm booking'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    )
  }
