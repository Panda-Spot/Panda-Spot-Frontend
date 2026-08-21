import { Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <p className="hint">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}
