import { useEffect, useState } from 'react'

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const styles = {
    success: 'bg-emerald-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-blue-600 text-white',
  }

  const icons = {
    success: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm animate-slide-up ${styles[type]}`}
    >
      {icons[type]}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-75 hover:opacity-100 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

// Hook to manage toast state
export function useToast() {
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type, id: Date.now() })
  }

  function hideToast() {
    setToast(null)
  }

  const ToastContainer = () =>
    toast ? (
      <Toast key={toast.id} message={toast.message} type={toast.type} onClose={hideToast} />
    ) : null

  return { showToast, ToastContainer }
}
