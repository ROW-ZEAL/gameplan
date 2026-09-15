import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'venues',
    label: 'Venues',
    path: '/admin/venues',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'bookings',
    label: 'Bookings',
    path: '/admin/bookings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'sports',
    label: 'Sports',
    path: '/admin/sports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8l4 4-4 4-4-4z" />
      </svg>
    ),
  },
  {
    id: 'payments',
    label: 'Payments',
    path: '/admin/payments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
]

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-emerald-500/30">
            ⚽
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-widest uppercase">GamePlanR</p>
            <p className="text-emerald-400 text-xs font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold uppercase">
            {user?.full_name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                onClick={() => setMobileOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {/* Desktop toggle */}
              <button
                className="hidden lg:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                <p className="text-xs text-slate-500">GamePlanR Administration</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                Back to App
              </a>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name?.[0] || 'A'}
                </div>
                <span className="text-xs font-medium text-emerald-700 hidden sm:block">{user?.full_name}</span>
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
