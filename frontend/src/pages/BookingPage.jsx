import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function BookingPage() {
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
          <h1 className="text-4xl font-semibold text-slate-900">Booking Overview</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Review your current reservations and manage bookings from one place.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-white text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Booking</th>
                <th className="px-6 py-4 font-medium">Venue</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
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
        </section>
      </main>
    </div>
  )
}
