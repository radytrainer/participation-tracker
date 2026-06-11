import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

function defaultRoute(role) {
  if (role === 'student') return '/student/dashboard'
  return '/trainer/dashboard' // admin + trainer
}

function hasAccess(profileRole, requiredRole) {
  if (!requiredRole) return true
  if (requiredRole === 'trainer') return profileRole === 'trainer' || profileRole === 'admin'
  return profileRole === requiredRole
}

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingSpinner message="Authenticating..." />
  if (!user) return <Navigate to="/login" replace />
  if (!hasAccess(profile?.role, role)) {
    return <Navigate to={defaultRoute(profile?.role)} replace />
  }

  return children
}
