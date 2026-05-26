import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'sports', label: 'Sports Category', path: '/sports' },
  { id: 'venue', label: 'Venue', path: '/venues' },
  { id: 'booking', label: 'Booking', path: '/booking' },
]

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  const menu = useMemo(
    () =>
      navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(item.path)}
          className="text-sm font-medium text-slate-700 hover:text-emerald-600 transition"
        >
          {item.label}
        </button>
      )),
    [navigate]
  )

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-3 rounded-3xl bg-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-600/20 ring-1 ring-white/10">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-xl">⚽</span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">GAMEPLANR</p>
              <p className="text-xs text-emerald-100/90">Booking + Venue Hub</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 sm:gap-5">
            {menu}
          </nav>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            Signed in as {user?.full_name || user?.email || 'Guest'}
          </div>
          <button
            onClick={onLogout}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
