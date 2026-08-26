import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { requestEmailVerification } from '../api.js'
import SidebarSection from './SidebarSection.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const SIDEBAR_COLLAPSED_KEY = 'pandaspot_sidebar_collapsed'

const PAGE_TITLES = [
  { test: (p) => p === '/events', title: 'Events' },
  { test: (p) => p.startsWith('/events/'), title: 'Event' },
  { test: (p) => p === '/branding', title: 'Branding' },
  { test: (p) => p === '/billing', title: 'Billing' },
  { test: (p) => p === '/admin', title: 'Admin' },
  { test: (p) => p === '/admin/clients', title: 'Clients' },
  { test: (p) => p.startsWith('/admin/clients/'), title: 'Client' },
  { test: (p) => p === '/admin/events', title: 'Events (admin)' },
  { test: (p) => p.startsWith('/admin/events/'), title: 'Event (admin)' },
  { test: (p) => p === '/admin/metrics', title: 'Metrics' },
]

function pageTitleFor(pathname) {
  return PAGE_TITLES.find((p) => p.test(pathname))?.title || 'PandaSpot'
}

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

function SidebarLink({ to, icon: Icon, children, onNavigate }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      onClick={onNavigate}
      end={to === '/events' || to === '/admin'}
    >
      <Icon size={17} className="sidebar-link-icon" />
      <span className="sidebar-link-label">{children}</span>
    </NavLink>
  )
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // storage unavailable — collapse state just won't persist this session
    }
  }, [collapsed])

  // Close the mobile drawer on every navigation so it doesn't stay open
  // after tapping a link.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="app-shell" data-sidebar={collapsed ? 'collapsed' : 'expanded'} data-mobile-nav={mobileOpen ? 'open' : 'closed'}>
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <Link to="/events" className="app-sidebar-brand-link">
            <span className="app-sidebar-brand-name">PandaSpot</span>
            <span className="app-sidebar-brand-badge">STUDIO</span>
          </Link>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={closeMobile}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="app-sidebar-nav">
          <SidebarSection label="Workspace" defaultOpen>
            <SidebarLink to="/events" icon={Calendar} onNavigate={closeMobile}>Events</SidebarLink>
          </SidebarSection>
          <SidebarSection label="Studio" defaultOpen>
            <SidebarLink to="/branding" icon={Palette} onNavigate={closeMobile}>Branding</SidebarLink>
            <SidebarLink to="/billing" icon={CreditCard} onNavigate={closeMobile}>Billing</SidebarLink>
          </SidebarSection>
          {user?.is_admin && (
            <SidebarSection label="Platform" defaultOpen>
              <SidebarLink to="/admin" icon={LayoutDashboard} onNavigate={closeMobile}>Overview</SidebarLink>
              <SidebarLink to="/admin/clients" icon={Users} onNavigate={closeMobile}>Clients</SidebarLink>
              <SidebarLink to="/admin/events" icon={Calendar} onNavigate={closeMobile}>Events</SidebarLink>
              <SidebarLink to="/admin/metrics" icon={BarChart3} onNavigate={closeMobile}>Metrics</SidebarLink>
            </SidebarSection>
          )}
        </nav>

        <div className="app-sidebar-footer">
          <ThemeToggle />
          <button className="sidebar-footer-btn logout-btn" type="button" onClick={logout} title="Log out">
            <LogOut size={16} />
            <span className="sidebar-footer-btn-label">Log out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="app-sidebar-backdrop" onClick={closeMobile} />}

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="sidebar-mobile-open-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="app-topbar-title">{pageTitleFor(location.pathname)}</h1>
          <div className="app-topbar-actions">
            {user?.email && <span className="app-topbar-user hint">{user.email}</span>}
            <ThemeToggle className="topbar-theme-toggle" />
          </div>
        </header>

        <VerifyEmailBanner />

        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
