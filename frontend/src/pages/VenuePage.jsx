import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function VenuePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let active = true

    async function loadVenues() {
      try {
        const { data } = await api.get('/venues/')
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
  }, [])

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
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
