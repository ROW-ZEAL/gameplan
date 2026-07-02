import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import StarRating from '../components/StarRating'
import api from '../api/axios'

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default function VenueDetailPage() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [venue, setVenue] = useState(null)
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // current user's rating
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingError, setRatingError] = useState(null)
  const [ratingSuccess, setRatingSuccess] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [venueRes, ratingsRes] = await Promise.all([
          api.get(`/venues/${id}/`),
          api.get(`/venues/${id}/ratings/`),
        ])
        if (!active) return
        setVenue(venueRes.data)
        setRatings(Array.isArray(ratingsRes.data) ? ratingsRes.data : (ratingsRes.data.results ?? []))
      } catch {
        if (!active) return
        setError('Unable to load venue details.')
      } finally {
        if (active) setLoading(false)
      }
    }

    async function loadMyRating() {
      try {
        const ratingRes = await api.get(`/venues/${id}/rate/`)
        if (!active) return
        if (ratingRes.data.rating) {
          setMyRating(ratingRes.data.rating)
          setMyReview(ratingRes.data.review || '')
        }
      } catch {
        // not critical — silently ignore
      }
    }

    load()
    loadMyRating()
    return () => { active = false }
  }, [id])

  async function submitRating(e) {
    e.preventDefault()
    if (!myRating) {
      setRatingError('Please select a star rating.')
      return
    }
    setRatingSubmitting(true)
    setRatingError(null)
    setRatingSuccess(false)
    try {
      await api.post(`/venues/${id}/rate/`, { rating: myRating, review: myReview })
      setRatingSuccess(true)
      // refresh ratings list and venue avg
      const [venueRes, ratingsRes] = await Promise.all([
        api.get(`/venues/${id}/`),
        api.get(`/venues/${id}/ratings/`),
      ])
      setVenue(venueRes.data)
      setRatings(Array.isArray(ratingsRes.data) ? ratingsRes.data : (ratingsRes.data.results ?? []))
    } catch (err) {
      setRatingError(err?.response?.data?.detail || 'Failed to submit rating.')
    } finally {
      setRatingSubmitting(false)
    }
  }

  const ratingLabel = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][myRating] ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <button
          onClick={() => navigate('/venues')}
          className="text-sm text-slate-500 hover:text-slate-800 transition"
        >
          ← Back to venues
        </button>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading venue…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-rose-700 shadow-sm">
            {error}
          </div>
        ) : venue ? (
          <>
            {/* ── Hero ── */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {venue.images?.length > 0 ? (
                <div className="grid h-64 gap-1 sm:grid-cols-3">
                  {venue.images.slice(0, 3).map((img, i) => (
                    <img
                      key={img.id}
                      src={img.image}
                      alt={venue.name}
                      className={`h-full w-full object-cover object-center ${
                        i === 0 && venue.images.length > 1 ? 'sm:col-span-2' : ''
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-52 bg-slate-100 flex items-center justify-center text-slate-400 text-4xl">
                  🏟
                </div>
              )}

              <div className="p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-semibold text-slate-900">{venue.name}</h1>
                    <p className="mt-1 text-slate-500">{venue.city}{venue.address ? ` · ${venue.address}` : ''}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                    venue.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {venue.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Rating summary */}
                <div className="mt-4 flex items-center gap-3">
                  <StarRating value={Math.round(venue.average_rating ?? 0)} readonly size="md" />
                  {venue.average_rating ? (
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{venue.average_rating}</span>
                      {' '}({venue.rating_count} {venue.rating_count === 1 ? 'review' : 'reviews'})
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">No ratings yet</span>
                  )}
                </div>

                {venue.description && (
                  <p className="mt-5 text-sm leading-relaxed text-slate-600">{venue.description}</p>
                )}
              </div>
            </section>

            {/* ── Details ── */}
            <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Venue details</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sport</dt>
                  <dd className="mt-1 text-sm text-slate-700">{venue.sport_category?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Price</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatRs(venue.price_per_hour)} / hour</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Opens</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatTime(venue.opening_time)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Closes</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatTime(venue.closing_time)}</dd>
                </div>
              </dl>

              {venue.facilities?.length > 0 && (
                <div className="mt-6">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Facilities</dt>
                  <div className="flex flex-wrap gap-2">
                    {venue.facilities.map((f) => (
                      <span key={f.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {f.icon && <span className="mr-1">{f.icon}</span>}{f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {venue.time_slots?.length > 0 && (
                <div className="mt-6">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Available time slots</dt>
                  <div className="flex flex-wrap gap-2">
                    {venue.time_slots.map((ts) => (
                      <span key={ts.id} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                        {ts.start_time} – {ts.end_time}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-7">
                <button
                  onClick={() => navigate('/venues')}
                  className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Book this venue
                </button>
              </div>
            </section>

            {/* ── Rate this venue ── */}
            <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Rate this venue</h2>

              <form onSubmit={submitRating} className="mt-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Your rating</label>
                  <div className="flex items-center gap-3">
                    <StarRating value={myRating} onChange={setMyRating} size="md" />
                    {myRating > 0 && (
                      <span className="text-sm text-slate-500">{ratingLabel}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Review <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={myReview}
                    onChange={(e) => setMyReview(e.target.value)}
                    placeholder="Share your experience at this venue…"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {ratingError && (
                  <p className="text-sm text-rose-600">{ratingError}</p>
                )}
                {ratingSuccess && (
                  <p className="text-sm text-emerald-600 font-medium">Rating submitted — thank you!</p>
                )}

                <button
                  type="submit"
                  disabled={ratingSubmitting}
                  className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {ratingSubmitting ? 'Submitting…' : myRating ? 'Submit rating' : 'Select a rating first'}
                </button>
              </form>
            </section>

            {/* ── Reviews ── */}
            {ratings.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-5">
                  Reviews <span className="ml-1 text-slate-400 font-normal text-base">({ratings.length})</span>
                </h2>
                <ul className="space-y-5">
                  {ratings.map((r) => (
                    <li key={r.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {(r.user_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{r.user_name || 'Anonymous'}</p>
                            <p className="text-xs text-slate-400">{timeAgo(r.created_at)}</p>
                          </div>
                        </div>
                        <StarRating value={r.rating} readonly size="sm" />
                      </div>
                      {r.review && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.review}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
