import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function scorePercent(score) {
  return Math.round((score ?? 0) * 100)
}

function scoreConfig(score) {
  const pct = scorePercent(score)
  if (pct >= 75) return { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Excellent match' }
  if (pct >= 50) return { bar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700',       label: 'Good match'      }
  if (pct >= 25) return { bar: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',     label: 'Partial match'   }
  return           { bar: 'bg-slate-400',        badge: 'bg-slate-100 text-slate-600',     label: 'Low match'       }
}

// ── Score bar component ───────────────────────────────────────────────────────

function ScoreBar({ score, mode }) {
  const pct    = scorePercent(score)
  const config = scoreConfig(score)
  const label  = mode === 'cold_start' ? 'Popularity' : config.label

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">
          {mode === 'cold_start' ? 'Popularity score' : 'Match score'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.badge}`}>
          {pct}% · {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-2 bg-slate-100 rounded w-full" />
        <div className="h-8 bg-slate-200 rounded-full" />
      </div>
    </div>
  )
}

// ── Venue card ────────────────────────────────────────────────────────────────

function VenueCard({ venue, rank, mode, navigate }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md flex flex-col">

      {/* Image + badges */}
      <div className="relative h-44 shrink-0 overflow-hidden bg-slate-100">
        <img
          src={venue.primary_image || '/campnou.jpg'}
          alt={venue.name}
          className="h-full w-full object-cover"
        />

        {/* Rank */}
        <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
          #{rank}
        </span>

        {/* Previously booked badge */}
        {venue.is_previously_booked && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur-sm">
            ✓ Booked before
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 space-y-3">

        {/* Name + city + status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 leading-snug">{venue.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{venue.city || '—'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest ${
            venue.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {venue.is_active ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Score bar */}
        <ScoreBar score={venue.score} mode={mode} />

        {/* Reason chip */}
        <p className="text-xs text-slate-500 italic leading-relaxed">
          💡 {venue.reason}
        </p>

        {/* Details */}
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-medium text-slate-800">Sport:</span> {venue.sport_category?.name || '—'}</p>
          <p><span className="font-medium text-slate-800">Address:</span> {venue.address || 'Not available'}</p>
          <p><span className="font-medium text-slate-800">Rate:</span> {formatRs(venue.price_per_hour)} / hr</p>
        </div>

        {/* Book now — grows to bottom */}
        <div className="mt-auto pt-1">
          <button
            onClick={() => navigate(`/venues/${venue.id}`)}
            className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            View & Book
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Algorithm explainer panel ─────────────────────────────────────────────────

function AlgorithmPanel({ meta }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-2">
          🧠 <span>How does this recommendation work?</span>
        </span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 space-y-3">
          <p className="font-semibold text-slate-800">Content-Based Filtering Algorithm</p>

          {meta.mode === 'cold_start' ? (
            <p>
              You don't have any bookings yet, so venues are ranked by how many confirmed bookings they have received from all users.
              Book a venue to unlock personalised recommendations.
            </p>
          ) : (
            <>
              <p>Your score is calculated from <strong>{meta.totalBookings}</strong> confirmed bookings:</p>
              <ul className="list-none space-y-2 mt-1">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">50%</span>
                  <span><strong>Sport match</strong> — venues that share your most-played sport ({meta.topSport || '—'}) score highest</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">30%</span>
                  <span><strong>Price match</strong> — venues within 20% of your average spend ({formatRs(meta.avgPrice)}/hr) score 100%, within 50% score 50%</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">20%</span>
                  <span><strong>Facility match</strong> — venues that share facilities you've used before score higher</span>
                </li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RecommendedVenuesPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [venues,  setVenues]  = useState([])
  const [meta,    setMeta]    = useState(null)
  const [n,       setN]       = useState(6)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api.get('/venues/recommended/', { params: { n } })
      .then(({ data }) => {
        if (cancelled) return
        setVenues(data.recommended_venues)
        setMeta({
          mode:          data.mode,
          totalBookings: data.total_bookings_analyzed,
          topSport:      data.top_sport,
          avgPrice:      data.avg_price_per_hour,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.detail || 'Failed to load recommendations.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [n])

  const isPersonalised = meta?.mode === 'personalized'
  const isColdStart    = meta?.mode === 'cold_start'
  const noVenues       = meta?.mode === 'no_venues'

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-7">

        {/* ── Header ── */}
        <section className="rounded-[2rem] bg-white p-7 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Recommended For You</h1>

              {isPersonalised && (
                <p className="mt-2 text-sm text-slate-500 max-w-xl">
                  Personalised from your <strong className="text-slate-700">{meta.totalBookings}</strong> bookings
                  {meta.topSport && <> · Favourite sport: <strong className="text-slate-700">{meta.topSport}</strong></>}
                  {meta.avgPrice > 0 && <> · Avg spend: <strong className="text-slate-700">{formatRs(meta.avgPrice)}/hr</strong></>}
                </p>
              )}

              {isColdStart && (
                <p className="mt-2 text-sm text-amber-700 max-w-xl bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 inline-block">
                  📭 No bookings yet — showing popular venues. Book a venue to unlock personalised recommendations.
                </p>
              )}

              {noVenues && (
                <p className="mt-2 text-sm text-slate-500">No active venues in the system yet.</p>
              )}
            </div>

            {/* N selector */}
            {!noVenues && (
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-medium text-slate-600">Show</label>
                <select
                  value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[3, 6, 9, 12, 15, 20].map((v) => (
                    <option key={v} value={v}>{v} venues</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* ── Algorithm explainer ── */}
        {meta && !noVenues && <AlgorithmPanel meta={meta} />}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── No venues ── */}
        {!loading && noVenues && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-2xl mb-2">🏟️</p>
            <p className="font-semibold text-slate-800">No venues available yet</p>
            <p className="mt-1 text-sm text-slate-500">Check back once venues have been added to the platform.</p>
          </div>
        )}

        {/* ── Empty results (personalised but all scored 0) ── */}
        {!loading && !noVenues && venues.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-2xl mb-2">🔍</p>
            <p className="font-semibold text-slate-800">No recommendations found</p>
            <p className="mt-1 text-sm text-slate-500">Try increasing the number of results.</p>
          </div>
        )}

        {/* ── Venue grid ── */}
        {!loading && venues.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue, i) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                rank={i + 1}
                mode={meta?.mode}
                navigate={navigate}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
