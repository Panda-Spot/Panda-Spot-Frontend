import { useEffect } from 'react'
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
import GuestUpload from './pages/GuestUpload.jsx'
import GuestSlideshow from './pages/GuestSlideshow.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Branding from './pages/Branding.jsx'
import Billing from './pages/Billing.jsx'
import BillingDocuments from './pages/BillingDocuments.jsx'
import Support from './pages/Support.jsx'
import Admin from './pages/Admin.jsx'
import AdminClients from './pages/AdminClients.jsx'
import AdminClientDetail from './pages/AdminClientDetail.jsx'
import AdminEvents from './pages/AdminEvents.jsx'
import AdminEventDetail from './pages/AdminEventDetail.jsx'
import AdminMetrics from './pages/AdminMetrics.jsx'
import AdminPlans from './pages/AdminPlans.jsx'
import InviteAccept from './pages/InviteAccept.jsx'
import AcceptClientInvite from './pages/AcceptClientInvite.jsx'
import ClientEvents from './pages/ClientEvents.jsx'
import ClientGallery from './pages/ClientGallery.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import AppShell from './components/AppShell.jsx'
import CameraShutter from './components/CameraShutter.jsx'
import RouteTransition from './components/RouteTransition.jsx'

// Styles
import './app.css'
import './styles/marketing.css'

// Lightweight shell for pre-auth/account-recovery pages (login, register,
// password reset, email verification, invite acceptance) — no sidebar,
// since there's no dashboard nav worth showing someone who isn't
// authenticated yet. The full sidebar shell (AppShell) is only used for the
// actual dashboard routes below.
function AuthLayout({ children }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CameraShutter size="sm" mark />
          PandaSpot
          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 9999, marginLeft: 8 }}>
            STUDIO
          </span>
        </Link>
        <nav>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/product">Product</NavLink>
          <NavLink to="/login">Sign In</NavLink>
        </nav>
      </header>

      <main className="content">{children}</main>
    </div>
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <RouteTransition />
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
      <Route path="/e/:slug/upload" element={<GuestUpload />} />
      <Route path="/e/:slug/slideshow" element={<GuestSlideshow />} />

      {/* 3. Authentication & Account Recovery Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPassword />
          </AuthLayout>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <AuthLayout>
            <ResetPassword />
          </AuthLayout>
        }
      />
      <Route
        path="/verify-email/:token"
        element={
          <AuthLayout>
            <VerifyEmail />
          </AuthLayout>
        }
      />
      <Route
        path="/invites/:token"
        element={
          <AuthLayout>
            <InviteAccept />
          </AuthLayout>
        }
      />
      <Route
        path="/client-invites/:token"
        element={
          <AuthLayout>
            <AcceptClientInvite />
          </AuthLayout>
        }
      />

      {/* Photo Selection: client-facing pages (MERGE: Studio-Verse) — a
          USER-role login, same ProtectedRoute/AppShell as the studio side;
          the API itself enforces the role/access-grant boundary. */}
      <Route
        path="/client"
        element={
          <AppShell>
            <ProtectedRoute>
              <ClientEvents />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/client/:eventId"
        element={
          <AppShell>
            <ProtectedRoute>
              <ClientGallery />
            </ProtectedRoute>
          </AppShell>
        }
      />

      {/* 4. Authenticated Photographer Studio Dashboard Routes */}
      <Route
        path="/events"
        element={
          <AppShell>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/dashboard"
        element={<Navigate to="/events" replace />}
      />
      <Route
        path="/events/:eventId"
        element={
          <AppShell>
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/branding"
        element={
          <AppShell>
            <ProtectedRoute>
              <Branding />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/billing"
        element={
          <AppShell>
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/billing/documents"
        element={
          <AppShell>
            <ProtectedRoute>
              <BillingDocuments />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/support"
        element={
          <AppShell>
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin"
        element={
          <AppShell>
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminClients />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/clients/:userId"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminClientDetail />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/events"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminEvents />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/events/:eventId"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminEventDetail />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/metrics"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminMetrics />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <AppShell>
            <ProtectedRoute>
              <AdminPlans />
            </ProtectedRoute>
          </AppShell>
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
