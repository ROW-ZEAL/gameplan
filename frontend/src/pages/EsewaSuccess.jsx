import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function EsewaSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [payment, setPayment] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const data = searchParams.get('data')
    if (!data) {
      setState('error')
      setErrorMsg('No payment data received from eSewa.')
      return
    }

    api.post('/esewa/verify/', { data })
      .then(({ data: payment }) => {
        setPayment(payment)
        setState('success')
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.detail || 'Payment verification failed.')
        setState('error')
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-200 text-center space-y-6">

        {state === 'verifying' && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
            <p className="text-slate-600">Verifying your payment…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Payment Successful!</h1>
              <p className="mt-2 text-slate-500">Your booking has been confirmed.</p>
            </div>
            {payment && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking ref</span>
                  <span className="font-mono font-medium text-slate-800">{payment.booking_reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono text-slate-700">{payment.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="font-semibold text-slate-900">{formatRs(payment.amount)}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/booking')}
              className="w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              View My Bookings
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Verification Failed</h1>
              <p className="mt-2 text-sm text-rose-600">{errorMsg}</p>
            </div>
            <button
              onClick={() => navigate('/booking')}
              className="w-full rounded-full bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-900 transition"
            >
              Back to Bookings
            </button>
          </>
        )}
      </div>
    </div>
  )
}
