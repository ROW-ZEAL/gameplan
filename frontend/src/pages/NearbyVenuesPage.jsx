import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

// ── Custom DivIcon markers (avoids Vite PNG-import quirks) ──────────────────

const USER_PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;
    background:#059669;border-radius:50%;
    border:3px solid white;
    box-shadow:0 2px 10px rgba(5,150,105,.6)
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
})

function venueMarkerIcon(rank) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;
      background:#1e293b;color:white;
      border-radius:50%;border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;font-family:sans-serif
    ">${rank}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -17],
  })
}

// ── Map sub-components ───────────────────────────────────────────────────────

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyTo({ lat, lng }) {
  const map = useMap()
  const prev = useRef(null)
  useEffect(() => {
    if (lat == null || lng == null) return
    const key = `${lat},${lng}`
    if (prev.current === key) return
    prev.current = key
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.9 })
  }, [lat, lng, map])
  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

const DEFAULT_CENTER = [27.7172, 85.324]   // Kathmandu
const DEFAULT_ZOOM   = 12

// ── Main page ────────────────────────────────────────────────────────────────

export default function NearbyVenuesPage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [pin, setPin]         = useState(null)   // { lat, lng }
  const [k, setK]             = useState(5)
  const [radiusKm, setRadiusKm] = useState(2)
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)  // null | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery]         = useState('')
  const [searchLoading, setSearchLoading]     = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)

  // ── Close suggestions on outside click ──
  useEffect(() => {
    function handleOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // ── Pre-load saved home location ──
  useEffect(() => {
    const lat = user?.home_latitude ? parseFloat(user.home_latitude) : null
    const lng = user?.home_longitude ? parseFloat(user.home_longitude) : null
    if (lat != null && lng != null) {
      setPin({ lat, lng })
    }
  }, [])   // run once on mount

  // ── Auto-search when pin, k, or radius changes ──
  useEffect(() => {
    if (!pin) return
    let cancelled = false

    async function fetchNearby() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get('/venues/nearby/', {
          params: { latitude: pin.lat, longitude: pin.lng, k, radius_km: radiusKm },
        })
        if (!cancelled) setResults(data)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || 'Failed to fetch nearby venues.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNearby()
    return () => { cancelled = true }
  }, [pin, k, radiusKm])

  // ── Handlers ──
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const handleMapClick = useCallback((lat, lng) => {
    setSaveStatus(null)
    setPin({ lat, lng })
  }, [])

  function detectLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
        setSaveStatus(null)
      },
      () => {
        setError('Could not retrieve your location. Please click the map to set it.')
        setGeoLoading(false)
      },
      { timeout: 10000 },
    )
  }

  async function handleLocationSearch(e) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearchLoading(true)
    setSearchSuggestions([])
    setError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      if (data.length === 0) {
        setError(`No locations found for "${q}". Try a more specific name.`)
      } else if (data.length === 1) {
        selectSuggestion(data[0])
      } else {
        setSearchSuggestions(data)
        setShowSuggestions(true)
      }
    } catch {
      setError('Location search failed. Please check your connection.')
    } finally {
      setSearchLoading(false)
    }
  }

  function selectSuggestion(place) {
    const lat = parseFloat(place.lat)
    const lng = parseFloat(place.lon)
    setPin({ lat, lng })
    setSaveStatus(null)
    setSearchQuery(place.display_name.split(',').slice(0, 2).join(',').trim())
    setShowSuggestions(false)
    setSearchSuggestions([])
  }

  async function saveHomeLocation() {
    if (!pin) return
    setSaveStatus('saving')
    try {
      const { data } = await api.patch('/auth/me/', {
        home_latitude: pin.lat,
        home_longitude: pin.lng,
      })
      updateUser({ home_latitude: data.home_latitude, home_longitude: data.home_longitude })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const hasSavedLocation =
    user?.home_latitude != null && user?.home_longitude != null

  const pinMatchesSaved =
    hasSavedLocation &&
    pin &&
    Math.abs(parseFloat(user.home_latitude) - pin.lat) < 0.000001 &&
    Math.abs(parseFloat(user.home_longitude) - pin.lng) < 0.000001

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">

        {/* Header + search */}
        <section className="rounded-[2rem] bg-white p-7 shadow-sm border border-slate-200 space-y-5">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Nearby Venues</h1>
            <p className="mt-1.5 text-slate-500 text-sm max-w-xl">
              Search a place name, click the map, or use GPS — the closest venues appear automatically.
            </p>
          </div>

          {/* Location search bar */}
          <form onSubmit={handleLocationSearch} className="relative" ref={searchRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (showSuggestions) setShowSuggestions(false)
                  }}
                  onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search location — e.g. Thamel, Kathmandu"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
              >
                {searchLoading
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : 'Search'}
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <ul className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                {searchSuggestions.map((place) => (
                  <li key={place.place_id}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(place)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-emerald-50 transition border-b border-slate-100 last:border-0"
                    >
                      <span className="mt-0.5 shrink-0 text-emerald-500">📍</span>
                      <span>
                        <span className="font-medium text-slate-800">
                          {place.display_name.split(',')[0]}
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5 leading-snug">
                          {place.display_name.split(',').slice(1).join(',').trim()}
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 self-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 capitalize">
                        {place.type}
                      </span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="w-full px-4 py-2 text-center text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Dismiss
                  </button>
                </li>
              </ul>
            )}
          </form>
        </section>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Detect GPS */}
          <button
            onClick={detectLocation}
            disabled={geoLoading}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {geoLoading
              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              : '📍'}
            {geoLoading ? 'Detecting…' : 'Use my location'}
          </button>

          {/* Radius selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Radius</label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[1, 2, 5, 10, 20].map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </div>

          {/* K selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Show</label>
            <select
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[3, 5, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} venues</option>
              ))}
            </select>
          </div>

          {/* Pin info */}
          {pin && (
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-mono text-slate-600 shadow-sm">
              {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
            </span>
          )}

          {/* Save home location */}
          {pin && !pinMatchesSaved && (
            <button
              onClick={saveHomeLocation}
              disabled={saveStatus === 'saving'}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saveStatus === 'saving' ? 'Saving…' : '💾 Save as home location'}
            </button>
          )}
          {saveStatus === 'saved' && (
            <span className="ml-auto text-sm font-medium text-emerald-600">✓ Location saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="ml-auto text-sm font-medium text-rose-600">Failed to save</span>
          )}
          {hasSavedLocation && pinMatchesSaved && (
            <span className="ml-auto text-xs text-slate-400">Home location active</span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Map */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm" style={{ height: '52vh', minHeight: 340 }}>
          <MapContainer
            center={pin ? [pin.lat, pin.lng] : DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} />
            {pin && <FlyTo lat={pin.lat} lng={pin.lng} />}

            {/* User pin */}
            {pin && (
              <Marker position={[pin.lat, pin.lng]} icon={USER_PIN_ICON}>
                <Popup>
                  <div className="text-sm font-semibold text-emerald-700">Your location</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Venue markers */}
            {results?.nearest_venues?.map((venue, i) => (
              <Marker
                key={venue.id}
                position={[parseFloat(venue.latitude ?? 0), parseFloat(venue.longitude ?? 0)]}
                icon={venueMarkerIcon(i + 1)}
              >
                <Popup minWidth={220}>
                  <div className="space-y-1 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{venue.name}</p>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        #{i + 1}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-semibold">📍 {venue.distance_km} km away</p>
                    <p className="text-xs text-slate-500">{venue.sport_category?.name}</p>
                    <p className="text-xs text-slate-500">{venue.address}</p>
                    <p className="text-xs text-slate-600 font-medium">{formatRs(venue.price_per_hour)} / hr</p>
                    <button
                      onClick={() => navigate('/venues')}
                      className="mt-2 w-full rounded-full bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Book now
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Instruction overlay — shown when no pin yet */}
          {!pin && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl">
              <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-lg backdrop-blur-sm text-center">
                <p className="text-lg font-semibold text-slate-800">Click the map to drop a pin</p>
                <p className="text-sm text-slate-500 mt-1">Nearest venues will appear automatically</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-6 text-slate-500 text-sm">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Searching nearby venues…
          </div>
        )}

        {/* Venue cards */}
        {!loading && results && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {results.nearest_venues.length > 0
                ? `${results.nearest_venues.length} venue${results.nearest_venues.length > 1 ? 's' : ''} within ${results.radius_km ?? radiusKm} km`
                : `No venues found within ${results.radius_km ?? radiusKm} km of your location`}
            </h2>

            {results.nearest_venues.length === 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center shadow-sm">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-base font-semibold text-amber-800">No venues within {results.radius_km ?? radiusKm} km</p>
                <p className="mt-1 text-sm text-amber-700">
                  Try increasing the radius or searching a different area.
                </p>
              </div>
            )}

            {results.nearest_venues.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.nearest_venues.map((venue, i) => (
                  <article
                    key={venue.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={venue.primary_image || '/campnou.jpg'}
                        alt={venue.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
                        #{i + 1}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 leading-snug">{venue.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{venue.city}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest ${venue.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {venue.is_active ? 'Open' : 'Closed'}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        📍 {venue.distance_km} km away
                      </span>

                      <div className="space-y-1 text-sm text-slate-600">
                        <p><span className="font-medium text-slate-800">Sport:</span> {venue.sport_category?.name || '—'}</p>
                        <p><span className="font-medium text-slate-800">Address:</span> {venue.address || 'Not available'}</p>
                        <p><span className="font-medium text-slate-800">Rate:</span> {formatRs(venue.price_per_hour)} / hr</p>
                      </div>

                      <button
                        onClick={() => navigate('/venues')}
                        className="w-full rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Book now
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  )
}
