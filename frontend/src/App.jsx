import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/admin/AdminRoute'
import { AuthProvider } from './context/AuthContext'

// User pages
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

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminVenues from './pages/admin/AdminVenues'
import AdminBookings from './pages/admin/AdminBookings'
import AdminSports from './pages/admin/AdminSports'
import AdminFacilities from './pages/admin/AdminFacilities'
import AdminPayments from './pages/admin/AdminPayments'
import AdminLoginPage from './pages/AdminLoginPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public routes ────────────────────────────────── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── eSewa callbacks ───────────────────────────────── */}
        <Route path="/esewa/success" element={<ProtectedRoute><EsewaSuccess /></ProtectedRoute>} />
        <Route path="/esewa/failure" element={<ProtectedRoute><EsewaFailure /></ProtectedRoute>} />

        {/* ── User protected routes ─────────────────────────── */}
        <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/sports"      element={<ProtectedRoute><SportsPage /></ProtectedRoute>} />
        <Route path="/venues"      element={<ProtectedRoute><VenuePage /></ProtectedRoute>} />
        <Route path="/venues/:id"  element={<ProtectedRoute><VenueDetailPage /></ProtectedRoute>} />
        <Route path="/booking"     element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/nearby"      element={<ProtectedRoute><NearbyVenuesPage /></ProtectedRoute>} />
        <Route path="/recommended" element={<ProtectedRoute><RecommendedVenuesPage /></ProtectedRoute>} />

        {/* ── Admin routes (SUPER_ADMIN only) ───────────────── */}
        <Route path="/admin/login"    element={<AdminLoginPage />} />
        <Route path="/admin"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users"    element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/venues"   element={<AdminRoute><AdminVenues /></AdminRoute>} />
        <Route path="/admin/bookings"    element={<AdminRoute><AdminBookings /></AdminRoute>} />
        <Route path="/admin/sports"      element={<AdminRoute><AdminSports /></AdminRoute>} />
        <Route path="/admin/facilities"  element={<AdminRoute><AdminFacilities /></AdminRoute>} />
        <Route path="/admin/payments"    element={<AdminRoute><AdminPayments /></AdminRoute>} />

        {/* ── Fallback ──────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
