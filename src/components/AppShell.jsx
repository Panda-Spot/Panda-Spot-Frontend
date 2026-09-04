import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Building2,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { requestEmailVerification } from '../api.js'
import ThemeToggle from './ThemeToggle.jsx'
import Avatar from './ui/Avatar.jsx'
import { useShutterNavigate } from '../context/ShutterContext.jsx'

const SIDEBAR_COLLAPSED_KEY = 'pandaspot_sidebar_collapsed'

/* ── Combined IA: every option from both products, usage-preserved ──
   Studio-Verse names win where both had the same page (Dashboard, Clients,
   Billing, Support, Plans); PandaSpot-only pages keep their place
   (face-search lives inside Dashboard/EventDetail; Metrics stays as its
   own platform entry; Studio Profile reuses the /branding route so no
   bookmark breaks — Branding.jsx itself is extended in Phase 18C). */
const STUDIO_NAV = [
  { to: '/events', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/access', icon: LayoutGrid, label: 'Access Board' },
  { to: '/billing', icon: Wallet, label: 'Billing' },
  { to: '/billing/documents', icon: Receipt, label: 'Invoicing' },
  { to: '/branding', icon: Store, label: 'Studio Profile' },
]

const PLATFORM_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/clients', icon: Building2, label: 'Studios' },
  { to: '/admin/events', icon: Calendar, label: 'All Events' },
  { to: '/admin/metrics', icon: BarChart3, label: 'Metrics' },
  { to: '/admin/plans', icon: CreditCard, label: 'Plans' },
]

const CLIENT_NAV = [
  { to: '/client', icon: Camera, label: 'My Gallery' },
]

const PAGE_TITLES = [
  { test: (p) => p === '/events', title: 'Dashboard' },
  { test: (p) => p.startsWith('/events/'), title: 'Event' },
  { test: (p) => p === '/clients', title: 'Clients' },
  { test: (p) => p.startsWith('/clients'), title: 'Clients' },
  { test: (p) => p === '/access', title: 'Access Board' },
  { test: (p) => p === '/branding', title: 'Studio Profile' },
  { test: (p) => p === '/billing', title: 'Billing' },
  { test: (p) => p === '/billing/documents', title: 'Invoicing' },
  { test: (p) => p === '/support', title: 'Support' },
  { test: (p) => p === '/settings', title: 'Settings' },
  { test: (p) => p === '/client', title: 'My Gallery' },
  { test: (p) => /\/client\/[^/]+\/favourites$/.test(p), title: 'Favourites' },
  { test: (p) => p.startsWith('/client/'), title: 'My Gallery' },
  { test: (p) => p === '/admin', title: 'Overview' },
  { test: (p) => p === '/admin/clients', title: 'Studios' },
  { test: (p) => p.startsWith('/admin/clients/'), title: 'Studio' },
  { test: (p) => p === '/admin/events', title: 'All Events' },
  { test: (p) => p.startsWith('/admin/events/'), title: 'Event (admin)' },
  { test: (p) => p === '/admin/metrics', title: 'Metrics' },
  { test: (p) => p === '/admin/plans', title: 'Plans' },
]

function pageTitleFor(pathname) {
  return PAGE_TITLES.find((p) => p.test(pathname))?.title || 'PandaSpot'
}

/* Sidebar is ALWAYS dark — like VS Code / Linear / Notion sidebars.
   This keeps it visible regardless of the page's light/dark mode. */
const SB = {
  bg: '#111113',
  border: '#2A2A30',
  textPrimary: '#F5F5F7',
  textMuted: '#A0A0AB',
  textTert: '#6B6B76',
  activeBg: 'rgba(245,158,11,0.12)',
  hoverBg: 'rgba(255,255,255,0.05)',
  gold: '#F59E0B',
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

function SidebarItem({ to, icon: Icon, label, active, collapsed, onNavigate }) {
  return (
    <div
      onClick={() => onNavigate(to)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group relative overflow-hidden cursor-pointer select-none"
      style={{
        background: active ? SB.activeBg : 'transparent',
        color: active ? SB.gold : SB.textMuted,
        borderLeft: `3px solid ${active ? SB.gold : 'transparent'}`,
        paddingLeft: 9,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = SB.hoverBg }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={17} className="flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {collapsed && (
        <div
          className="absolute left-14 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 hidden md:block"
          style={{
            background: '#242428',
            color: SB.textPrimary,
            border: `1px solid ${SB.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const shutterNavigate = useShutterNavigate()
  const sidebarRef = useRef(null)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // Slide-in on mount — x only, opacity never touched
  useEffect(() => {
    gsap.set(sidebarRef.current, { width: collapsed ? 64 : 240 })
    gsap.fromTo(sidebarRef.current, { x: -16 }, { x: 0, duration: 0.45, ease: 'power3.out' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // storage unavailable — collapse state just won't persist this session
    }
    if (sidebarRef.current) {
      gsap.to(sidebarRef.current, { width: collapsed ? 64 : 240, duration: 0.3, ease: 'power3.inOut' })
    }
  }, [collapsed])

  // Close the mobile drawer on every navigation so it doesn't stay open
  // after tapping a link.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleCollapse = () => {
    const next = !collapsed
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
    } catch {
      // ignore — state still updates for this session
    }
    setCollapsed(next)
    gsap.to(sidebarRef.current, { width: next ? 64 : 240, duration: 0.3, ease: 'power3.inOut' })
  }

  // Active check — exact match for root paths, prefix match for nested
  const isActive = (to) => {
    if (to === '/events' || to === '/admin' || to === '/client' || to === '/billing') {
      return location.pathname === to
    }
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  const handleNavigate = (to) => {
    setMobileOpen(false)
    shutterNavigate(to)
  }

  const handleLogout = async () => {
    try { await logout() } catch {
      // logout clears local state even if the server call fails
    }
    shutterNavigate('/login')
  }

  const isClient = user?.role === 'USER'
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User')
  const roleBadge = user?.role === 'SUPER_ADMIN' ? 'ADMIN' : isClient ? 'CLIENT' : 'STUDIO'

  return (
    <div className="app-shell">
      <style>{`
        .sv-sidebar { transition: transform 0.3s ease; }
        .sv-spacer { transition: width 0.3s ease; }
        @media (max-width: 767px) {
          .sv-sidebar[data-mobile="closed"] { transform: translateX(-100%); }
          .sv-sidebar[data-mobile="open"] { transform: translateX(0); }
          .sv-spacer { display: none; }
        }
      `}</style>
      <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <aside
          ref={sidebarRef}
          data-mobile={mobileOpen ? 'open' : 'closed'}
          className="sv-sidebar fixed left-0 top-0 h-screen flex flex-col z-40 select-none"
          style={{
            width: collapsed ? 64 : 240,
            background: SB.bg,
            borderRight: `1px solid ${SB.border}`,
            willChange: 'width',
          }}
        >
          {/* ── Logo ── */}
          <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${SB.border}` }}>
            <Link
              to={isClient ? '/client' : '/events'}
              className="flex items-center gap-3 min-w-0"
              style={{ textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}
            >
              <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-gold">
                <Camera size={15} className="text-black" />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
                    className="font-display font-semibold text-base truncate whitespace-nowrap"
                    style={{ color: SB.gold }}
                  >
                    PandaSpot
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <button
              type="button"
              className="sidebar-mobile-close-btn md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ color: SB.textTert, background: 'transparent', border: 'none', marginLeft: 'auto' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── User chip ── */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                className="px-4 py-3 flex-shrink-0 hidden md:block"
                style={{ borderBottom: `1px solid ${SB.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} size="sm" ring />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: SB.textPrimary }}>
                      {displayName}
                    </p>
                    <p className="text-[10px] font-bold tracking-widest" style={{ color: SB.gold }}>
                      {roleBadge}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Nav items ── */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {isClient ? (
              <>
                {CLIENT_NAV.map((item) => (
                  <SidebarItem key={item.to} {...item} active={isActive(item.to)} collapsed={collapsed} onNavigate={handleNavigate} />
                ))}
                <SidebarItem to="/support" icon={LifeBuoy} label="Support" active={isActive('/support')} collapsed={collapsed} onNavigate={handleNavigate} />
              </>
            ) : (
              <>
                {STUDIO_NAV.map((item) => (
                  <SidebarItem key={item.to} {...item} active={isActive(item.to)} collapsed={collapsed} onNavigate={handleNavigate} />
                ))}
                {!user?.is_admin && (
                  <SidebarItem to="/support" icon={LifeBuoy} label="Support" active={isActive('/support')} collapsed={collapsed} onNavigate={handleNavigate} />
                )}
                {user?.is_admin && (
                  <>
                    <div className="mx-1 my-2" style={{ borderTop: `1px solid ${SB.border}` }} />
                    {PLATFORM_NAV.map((item) => (
                      <SidebarItem key={item.to} {...item} active={isActive(item.to)} collapsed={collapsed} onNavigate={handleNavigate} />
                    ))}
                    <SidebarItem to="/support" icon={LifeBuoy} label="Support tickets" active={isActive('/support')} collapsed={collapsed} onNavigate={handleNavigate} />
                  </>
                )}
              </>
            )}
          </nav>

          {/* ── Bottom ── */}
          <div className="p-3 flex-shrink-0 space-y-0.5" style={{ borderTop: `1px solid ${SB.border}` }}>
            <SidebarItem to="/settings" icon={Settings} label="Settings" active={isActive('/settings')} collapsed={collapsed} onNavigate={handleNavigate} />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
              style={{ color: SB.textMuted, borderLeft: '3px solid transparent', paddingLeft: 9, background: 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F87171'
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = SB.textMuted
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <LogOut size={17} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap font-medium">Logout</span>}
            </button>
          </div>

          {/* ── Collapse pill ── */}
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hidden md:flex items-center justify-center z-50 transition-colors duration-150"
            style={{
              background: SB.bg,
              border: `1px solid ${SB.border}`,
              color: SB.textTert,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = SB.gold; e.currentTarget.style.color = SB.gold }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = SB.border; e.currentTarget.style.color = SB.textTert }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Spacer that matches sidebar width (desktop only) */}
        <div className="sv-spacer flex-shrink-0 hidden md:block" style={{ width: collapsed ? 64 : 240 }} />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className="app-topbar sticky top-0 z-20">
            <button
              type="button"
              className="sidebar-mobile-open-btn md:hidden"
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

          <main className="app-content flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
