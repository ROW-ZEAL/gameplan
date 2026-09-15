import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
