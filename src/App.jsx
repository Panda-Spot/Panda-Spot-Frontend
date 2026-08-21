import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import EventDetail from './pages/EventDetail.jsx'
import GuestEvent from './pages/GuestEvent.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Branding from './pages/Branding.jsx'
import InviteAccept from './pages/InviteAccept.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { useAuth } from './auth.jsx'
import { requestEmailVerification } from './api.js'
import './app.css'

function VerifyEmailBanner() {
  const { user } = useAuth()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!user || user.email_verified) return null

  const handleResend = async () => {
    setError('')
    try {
      await requestEmailVerification()
      setSent(true)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="verify-banner">
      {sent ? (
        <span>Verification email sent — check your inbox.</span>
      ) : (
        <>
          <span>Please verify your email address.</span>
          <button className="btn secondary" type="button" onClick={handleResend}>Resend email</button>
        </>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  )
}

function DashboardShell({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">PandaSpot</div>
        <nav>
          <NavLink to="/" end>Events</NavLink>
          {user && <NavLink to="/branding">Branding</NavLink>}
          {user && (
            <button className="btn secondary logout-btn" type="button" onClick={logout}>
              Log out
            </button>
          )}
        </nav>
      </header>

      <VerifyEmailBanner />

      <main className="content">{children}</main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/e/:slug" element={<GuestEvent />} />

      <Route
        path="/login"
        element={
          <DashboardShell>
            <Login />
          </DashboardShell>
        }
      />
      <Route
        path="/register"
        element={
          <DashboardShell>
            <Register />
          </DashboardShell>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <DashboardShell>
            <ForgotPassword />
          </DashboardShell>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <DashboardShell>
            <ResetPassword />
          </DashboardShell>
        }
      />
      <Route
        path="/verify-email/:token"
        element={
          <DashboardShell>
            <VerifyEmail />
          </DashboardShell>
        }
      />
      <Route
        path="/"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route
        path="/events/:eventId"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route
        path="/invites/:token"
        element={
          <DashboardShell>
            <InviteAccept />
          </DashboardShell>
        }
      />
      <Route
        path="/branding"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Branding />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
