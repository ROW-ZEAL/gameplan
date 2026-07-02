import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SportsPage from './pages/SportsPage'
import VenuePage from './pages/VenuePage'
import BookingPage from './pages/BookingPage'
import EsewaSuccess from './pages/EsewaSuccess'
import EsewaFailure from './pages/EsewaFailure'
import NearbyVenuesPage from './pages/NearbyVenuesPage'
import RecommendedVenuesPage from './pages/RecommendedVenuesPage'
import VenueDetailPage from './pages/VenueDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/esewa/success" element={<ProtectedRoute><EsewaSuccess /></ProtectedRoute>} />
        <Route path="/esewa/failure" element={<ProtectedRoute><EsewaFailure /></ProtectedRoute>} />
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
          path="/venues/:id"
          element={
            <ProtectedRoute>
              <VenueDetailPage />
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
        <Route
          path="/nearby"
          element={
            <ProtectedRoute>
              <NearbyVenuesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommended"
          element={
            <ProtectedRoute>
              <RecommendedVenuesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
