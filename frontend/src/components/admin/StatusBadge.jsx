const configs = {
  // Booking statuses
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  // Payment statuses
  UNPAID:    { label: 'Unpaid',    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  PAID:      { label: 'Paid',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REFUNDED:  { label: 'Refunded',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  FAILED:    { label: 'Failed',    cls: 'bg-red-100 text-red-700 border-red-200' },
  SUCCESS:   { label: 'Success',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  // User roles
  USER:        { label: 'User',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  VENUE_ADMIN: { label: 'Venue Admin', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  // Active states
  true:  { label: 'Active',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  false: { label: 'Inactive', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export default function StatusBadge({ value, size = 'sm' }) {
  const key = typeof value === 'boolean' ? String(value) : String(value).toUpperCase()
  const cfg = configs[key] || { label: value, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  const text = size === 'xs' ? 'text-xs' : 'text-xs'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium ${text} ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
