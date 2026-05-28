import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function SportsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await api.get('/sport-categories/')
        if (!active) return
        setCategories(data)
        setError(null)
      } catch (err) {
        if (!active) return
        setError('Failed to load sport categories.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function handleSportClick(category) {
    // backend filters venues with `sport_category` (name)
    navigate(`/venues?sport_category=${encodeURIComponent(category.name)}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-4xl font-semibold text-slate-900">Sports Categories</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Explore all available sports categories and find venue options for each game.</p>
        </section>

        <section>
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">Loading categories...</div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 shadow-sm">{error}</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <article key={cat.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm cursor-pointer" onClick={() => handleSportClick(cat)}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                      {cat.icon ? (
                        <img src={cat.icon.startsWith('http') ? cat.icon : window.location.origin + cat.icon} alt={cat.name} className="h-10 w-10 object-contain" />
                      ) : (
                        <span className="text-2xl">{cat.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{cat.name}</h2>
                      <p className="mt-2 text-sm text-slate-600">{cat.description || 'Book now'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
