import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, Link, useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Public SaaS Marketing Pages (per PDF Master Spec)
import Home from './pages/public/Home.jsx'
import Product from './pages/public/Product.jsx'
import HowItWorks from './pages/public/HowItWorks.jsx'
import ForPhotographers from './pages/public/ForPhotographers.jsx'
import ForEventTeams from './pages/public/ForEventTeams.jsx'
import Features from './pages/public/Features.jsx'
import Privacy from './pages/public/Privacy.jsx'
import FAQ from './pages/public/FAQ.jsx'
import About from './pages/public/About.jsx'
import Contact from './pages/public/Contact.jsx'
import NotFound from './pages/public/NotFound.jsx'

// Authenticated Photographer Studio Pages
import Dashboard from './pages/Dashboard.jsx'
import EventDetail from './pages/EventDetail.jsx'
import GuestEvent from './pages/GuestEvent.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Branding from './pages/Branding.jsx'
import Billing from './pages/Billing.jsx'
import Admin from './pages/Admin.jsx'
import InviteAccept from './pages/InviteAccept.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import { useAuth } from './auth.jsx'
import { requestEmailVerification } from './api.js'

// Styles
import './app.css'
import './styles/marketing.css'

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
        <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          PandaSpot
          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary-blue-bg)', color: 'var(--primary-blue)', padding: '2px 8px', borderRadius: 9999, marginLeft: 8 }}>
            STUDIO
          </span>
        </Link>
        <nav>
          {user ? (
            <>
              <NavLink to="/events" end>Events</NavLink>
              <NavLink to="/branding">Branding</NavLink>
              <NavLink to="/billing">Billing</NavLink>
              {user?.is_admin && <NavLink to="/admin">Admin</NavLink>}
              <button className="btn secondary logout-btn" type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/product">Product</NavLink>
              <NavLink to="/login">Sign In</NavLink>
            </>
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
    <>
      <ScrollToTop />
      <Routes>
      {/* 1. Public Marketing Routes (PDF Plan) */}
      <Route path="/" element={<Home />} />
      <Route path="/product" element={<Product />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/for-photographers" element={<ForPhotographers />} />
      <Route path="/for-event-teams" element={<ForEventTeams />} />
      <Route path="/features" element={<Features />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />

      {/* 2. Public Guest Photo Discovery Route */}
      <Route path="/e/:slug" element={<GuestEvent />} />

      {/* 3. Authentication & Account Recovery Routes */}
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
        path="/invites/:token"
        element={
          <DashboardShell>
            <InviteAccept />
          </DashboardShell>
        }
      />

      {/* 4. Authenticated Photographer Studio Dashboard Routes */}
      <Route
        path="/events"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route
        path="/dashboard"
        element={<Navigate to="/events" replace />}
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
        path="/branding"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Branding />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route
        path="/billing"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          </DashboardShell>
        }
      />
      <Route
        path="/admin"
        element={
          <DashboardShell>
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </DashboardShell>
        }
      />

      {/* 5. 404 Recovery */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}

export default App
