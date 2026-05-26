import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function SportsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-4xl font-semibold text-slate-900">Sports Categories</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Explore all available sports categories and find venue options for each game.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Football', description: 'Find local fields and team slots.', accent: 'bg-amber-100 text-amber-800' },
            { title: 'Basketball', description: 'Book courts for practice and matches.', accent: 'bg-sky-100 text-sky-800' },
            { title: 'Badminton', description: 'Reserve indoor courts for singles and doubles.', accent: 'bg-pink-100 text-pink-800' },
            { title: 'Tennis', description: 'Choose clay, grass, or hard court venues.', accent: 'bg-emerald-100 text-emerald-800' },
            { title: 'Cricket', description: 'Find pitches and nets near you.', accent: 'bg-lime-100 text-lime-800' },
            { title: 'Squash', description: 'Book courts for fast-paced indoor play.', accent: 'bg-violet-100 text-violet-800' },
          ].map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`${item.accent} flex h-14 w-14 items-center justify-center rounded-2xl text-2xl`}>
                  {item.title[0]}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
