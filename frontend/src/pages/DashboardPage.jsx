import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-emerald-600">GamePlanR</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Hello, <span className="font-medium text-gray-800">{user?.full_name}</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">
          Welcome back, {user?.full_name}. Explore venues and book your next game.
        </p>

        {/* Placeholder sport category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {['Football', 'Basketball', 'Badminton', 'Cricket', 'Tennis'].map((sport) => (
            <div
              key={sport}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-emerald-400 transition cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
                🏅
              </div>
              <span className="text-sm font-medium text-gray-700">{sport}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
