import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SportsPage from './pages/SportsPage'
import VenuePage from './pages/VenuePage'
import BookingPage from './pages/BookingPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sports"
          element={
            <ProtectedRoute>
              <SportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/venues"
          element={
            <ProtectedRoute>
              <VenuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
