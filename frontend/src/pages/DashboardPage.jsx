import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-10 text-white shadow-[0_35px_60px_-30px_rgba(15,23,42,0.75)] sm:px-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs uppercase tracking-[0.32em] text-white/90">Welcome, {user?.full_name || 'Player'}</span>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Your sports booking dashboard</h1>
              <p className="max-w-2xl text-base text-cyan-100/90 sm:text-lg">
                Manage your reservations, discover venues, and explore sports categories all from one modern control center.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                <div className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.8)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/80">Next match</p>
                  <p className="mt-4 text-2xl font-semibold text-white">Fustal</p>
                  <p className="mt-2 text-sm text-cyan-100/80">Ground reservation opens tomorrow at 06:00 AM.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.8)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/80">Quick stats</p>
                  <p className="mt-4 text-2xl font-semibold text-white">4 bookings</p>
                  <p className="mt-2 text-sm text-cyan-100/80">Completed this month with venues ready to use.</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto max-w-md overflow-hidden rounded-[2.5rem] bg-white/10 shadow-2xl shadow-slate-950/20 ring-1 ring-white/15">
              <div className="absolute -left-10 top-12 h-28 w-28 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -right-10 bottom-16 h-24 w-24 rounded-full bg-cyan-300/20 blur-3xl" />
              <img
                src="/messiii.jpg"
                alt="Lionel Messi"
                className="h-[480px] w-full object-cover object-center rounded-[2rem]"
              />
            </div>
          </div>
        </section>

        <section id="overview" className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {/* <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard</p> */}
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">Booking Status</h1>
              </div>
              <p className="max-w-lg text-sm text-slate-600">Quickly review your booking status, sports categories, and venue options.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Active bookings</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">4</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Favorite venue</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">Sunrise Arena</p>
              </div>
            </div>
          </div>
        </section>

        {/* <section id="sports" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Sports Category</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Most popular sports</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">Choose a sport and find the best available venues for your next game.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { sport: 'Football', icon: '⚽', color: 'bg-amber-100 text-amber-800' },
              { sport: 'Basketball', icon: '🏀', color: 'bg-sky-100 text-sky-800' },
              { sport: 'Badminton', icon: '🏸', color: 'bg-pink-100 text-pink-800' },
              { sport: 'Tennis', icon: '🎾', color: 'bg-emerald-100 text-emerald-800' },
            ].map((item) => (
              <article key={item.sport} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`${item.color} flex h-14 w-14 items-center justify-center rounded-2xl text-2xl`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.sport}</h3>
                    <p className="text-sm text-slate-500">Easy venue search for your next session.</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="venue" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Venue</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Featured venues</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">Pick from trusted courts and fields near you.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: 'Sunrise Arena', location: 'Downtown', badge: 'Indoor' },
              { title: 'Riverfront Courts', location: 'Riverside', badge: 'Outdoor' },
              { title: 'City Sports Hall', location: 'Midtown', badge: 'Standard' },
            ].map((venue) => (
              <div key={venue.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{venue.title}</p>
                    <p className="text-sm text-slate-500">{venue.location}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">{venue.badge}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">Clean courts, easy booking, and flexible scheduling for every team.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="booking" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Booking</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Upcoming bookings</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">Review and manage your scheduled sessions.</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Booking</th>
                  <th className="px-6 py-4 font-medium">Venue</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { name: 'Team training', venue: 'Sunrise Arena', date: 'May 28, 2026', status: 'Confirmed' },
                  { name: '3v3 tournament', venue: 'Riverfront Courts', date: 'Jun 03, 2026', status: 'Pending' },
                ].map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-slate-600">{item.venue}</td>
                    <td className="px-6 py-4 text-slate-600">{item.date}</td>
                    <td className="px-6 py-4 text-emerald-600">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section> */}

        <section id="stadium" className="relative overflow-hidden rounded-3xl shadow-lg">
          <img
            src="/campnou.jpg"
            alt="Camp Nou Stadium"
            className="w-full h-[500px] object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-slate-900/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-10 lg:px-14 py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-white leading-tight">Book Place In Trusted Venue</p>
            <h2 className="mt-4 max-w-2xl text-3xl sm:text-4xl font-semibold text-white leading-tight">Experience world-class stadium facilities</h2>
            <p className="mt-4 max-w-xl text-base text-slate-200/90">Reserve your spot at iconic venues like Camp Nou and enjoy premium facilities for your next game.</p>
            <button className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Book now →
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
