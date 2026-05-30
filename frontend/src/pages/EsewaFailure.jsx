import { useNavigate } from 'react-router-dom'

export default function EsewaFailure() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-200 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payment Failed</h1>
          <p className="mt-2 text-slate-500">
            Your eSewa payment was not completed. Your booking is still pending — you can try again.
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          No amount has been deducted from your eSewa wallet.
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/booking')}
            className="w-full rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Try Again from Bookings
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
