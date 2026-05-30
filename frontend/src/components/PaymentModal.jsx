import { useRef, useState } from 'react'
import api from '../api/axios'

function formatRs(amount) {
  const n = parseFloat(amount)
  const isWhole = n === Math.floor(n)
  return '₨' + n.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function PaymentModal({ booking, onClose, onSuccess }) {
  const [step, setStep] = useState('choose') // 'choose' | 'venue-confirm' | 'esewa-loading'
  const [venuePayment, setVenuePayment] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)
  const [esewaParams, setEsewaParams] = useState(null)

  async function handlePayAtVenue() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(`/bookings/${booking.id}/pay/`, {
        payment_method: 'PAY_AT_VENUE',
      })
      setVenuePayment(data)
      setStep('venue-confirm')
      onSuccess({ ...booking, payment_info: data, payment_status: 'UNPAID' })
    } catch (err) {
      setError(err?.response?.data?.detail || JSON.stringify(err?.response?.data) || 'Payment failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEsewaInitiate() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(`/bookings/${booking.id}/initiate-esewa/`)
      setEsewaParams(data)
      setStep('esewa-loading')
      // Auto-submit the hidden form after state update
      setTimeout(() => {
        if (formRef.current) formRef.current.submit()
      }, 100)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to initiate eSewa payment.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Choose Payment Method</h2>
            <p className="mt-1 text-sm text-slate-500">
              Booking <span className="font-mono font-medium text-slate-700">{booking.booking_reference}</span>
              &nbsp;·&nbsp; {formatRs(booking.total_amount)}
            </p>
          </div>
          {step !== 'esewa-loading' && (
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Choose step */}
          {step === 'choose' && (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {/* eSewa option */}
                <button
                  onClick={handleEsewaInitiate}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-center transition hover:border-green-400 hover:bg-green-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Pay with eSewa</p>
                    <p className="mt-1 text-xs text-slate-500">Instant online payment via eSewa digital wallet</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Pay Online
                  </span>
                </button>

                {/* Pay at venue option */}
                <button
                  onClick={handlePayAtVenue}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                    <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Pay at Venue</p>
                    <p className="mt-1 text-xs text-slate-500">Get a payment ID and pay cash when you arrive</p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    Pay On Arrival
                  </span>
                </button>
              </div>

              {loading && (
                <p className="mt-4 text-center text-sm text-slate-500">Processing…</p>
              )}
            </>
          )}

          {/* Pay at Venue confirmation */}
          {step === 'venue-confirm' && venuePayment && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Your Payment ID</p>
                <p className="font-mono text-2xl font-bold text-indigo-700 tracking-widest">
                  {venuePayment.transaction_id}
                </p>
                <p className="mt-2 text-sm text-indigo-600">
                  Show this ID at the venue counter when you arrive to complete your payment.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Venue</span>
                  <span className="font-medium text-slate-800">{booking.venue_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">{booking.booking_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-medium text-slate-800">{booking.time_slot_start} – {booking.time_slot_end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount due</span>
                  <span className="font-semibold text-slate-900">{formatRs(booking.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking ref</span>
                  <span className="font-mono text-slate-700">{booking.booking_reference}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Your slot is reserved. Bring this payment ID to the venue.
              </p>

              <button
                onClick={onClose}
                className="w-full rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Done
              </button>
            </div>
          )}

          {/* eSewa loading — hidden form auto-submits */}
          {step === 'esewa-loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
              <p className="text-sm text-slate-600">Redirecting to eSewa…</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden eSewa form — auto-submitted after params load */}
      {esewaParams && (
        <form ref={formRef} action={esewaParams.payment_url} method="POST" className="hidden">
          {[
            'amount', 'tax_amount', 'total_amount', 'transaction_uuid',
            'product_code', 'product_service_charge', 'product_delivery_charge',
            'success_url', 'failure_url', 'signed_field_names', 'signature',
          ].map((field) => (
            <input key={field} type="hidden" name={field} value={esewaParams[field]} />
          ))}
        </form>
      )}
    </div>
  )
}
