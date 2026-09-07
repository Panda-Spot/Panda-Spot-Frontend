import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  Download,
  Heart,
  LayoutDashboard,
  Menu,
  Palette,
  ScanFace,
  Upload,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { useShutterNavigate } from '../../context/ShutterContext.jsx'
import { useEvent } from './EventContext.jsx'

const SIDEBAR_KEY = 'pandaspot_event_sidebar_collapsed'

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

const GROUPS = [
  {
    label: 'Manage',
    items: [
      { to: '', end: true, icon: LayoutDashboard, label: 'Overview' },
      { to: 'photos', icon: Upload, label: 'Photos & Imports' },
      { to: 'ai-search', icon: ScanFace, label: 'AI Face Search' },
      { to: 'selection', icon: Heart, label: 'Photo Selection' },
      { to: 'albums', icon: BookOpen, label: 'Albums' },
    ],
  },
  {
    label: 'Share',
    items: [
      { to: 'guests', icon: Users, label: 'Guests' },
      { to: 'exports', icon: Download, label: 'Exports' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { to: 'tools', icon: Wrench, label: 'Tools' },
      { to: 'theme', icon: Palette, label: 'Theme' },
      { to: 'team', icon: UserPlus, label: 'Team', ownerOnly: true },
      { to: 'danger', icon: AlertTriangle, label: 'Danger' },
    ],
  },
]

const TITLES = {
  '': { title: 'Overview', desc: 'Details, numbers, enabled features and next steps.' },
  photos: { title: 'Photos & Imports', desc: 'Upload, import and manage photos.' },
  'ai-search': { title: 'AI Face Search', desc: 'Searchable photos, face groups and analytics.' },
  selection: { title: 'Photo Selection', desc: 'Clients, favourites and exports.' },
  albums: { title: 'Albums', desc: 'Proofing projects and versions.' },
  guests: { title: 'Guests', desc: 'Links, uploads, TV wall and attendees.' },
  exports: { title: 'Exports', desc: 'Zips, records and proofs.' },
  tools: { title: 'Tools', desc: 'Quality, duplicates and covers.' },
  theme: { title: 'Theme', desc: "This event's look." },
  team: { title: 'Team', desc: 'Second shooters for this event.' },
  danger: { title: 'Danger', desc: 'Archive, features and deletion.' },
  attendees: { title: 'Attendees', desc: 'Visitors, leads and CSV export.' },
}

function sectionOf(pathname, eventId) {
  const rest = pathname.split(`/events/${eventId}`)[1] || '/'
  const seg = rest.split('/').filter(Boolean)[0] || ''
  if (seg === 'albums' && rest.split('/').filter(Boolean).length > 1) return TITLES.albums
  return TITLES[seg] || { title: 'Event', desc: '' }
}

export default function EventShell() {
  const { eventId } = useParams()
  const { event } = useEvent()
  const { user } = useAuth()
  const location = useLocation()
  const shutterNavigate = useShutterNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed))
    } catch {
      // ignore — state still updates for this session
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isOwner = event?.role === 'owner'
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User')

  const go = (to) => {
    setMobileOpen(false)
    shutterNavigate(to)
  }

  return (
    <div className="sv-shell">
      <style>{`
        .sv-shell { display: block; min-height: 100vh; }
        .sv-sidebar { transition: transform 0.3s ease, width 0.3s ease; }
        .sv-spacer { transition: width 0.3s ease; }
        .sv-sidebar nav { scrollbar-width: thin; scrollbar-color: #0e8a8a transparent; }
        .sv-sidebar nav::-webkit-scrollbar { width: 4px; }
        .sv-sidebar nav::-webkit-scrollbar-track { background: transparent; }
        .sv-sidebar nav::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0e8a8a, #0b6e6e);
          border-radius: 999px;
        }
        .sv-sidebar nav::-webkit-scrollbar-thumb:hover { background: #F59E0B; }
        .sv-group-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 12px 4px; }
        @media (max-width: 767px) {
          .sv-sidebar[data-mobile="closed"] { transform: translateX(-100%); }
          .sv-sidebar[data-mobile="open"] { transform: translateX(0); }
          .sv-spacer { display: none; }
        }
      `}</style>
      <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <aside
          data-mobile={mobileOpen ? 'open' : 'closed'}
          className="sv-sidebar fixed left-0 top-0 h-screen flex flex-col z-40 select-none"
          style={{ width: collapsed ? 64 : 240, background: SB.bg, borderRight: `1px solid ${SB.border}` }}
        >
          <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${SB.border}` }}>
            <button
              type="button"
              onClick={() => go('/events')}
              className="flex items-center gap-2 text-xs font-medium w-full text-left"
              style={{ color: SB.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ChevronLeft size={14} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">All events</span>}
            </button>
            {!collapsed && (
              <p className="text-sm font-semibold truncate mt-2" style={{ color: SB.textPrimary }} title={event?.name}>
                {event?.name || 'Loading event…'}
              </p>
            )}
            <button
              type="button"
              className="sidebar-mobile-close-btn md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ color: SB.textTert, background: 'transparent', border: 'none' }}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
            {GROUPS.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="sv-group-label" style={{ color: SB.textTert }}>{group.label}</p>
                )}
                {group.items
                  .filter((item) => !item.ownerOnly || isOwner)
                  .map((item) => {
                    const to = item.to ? `/events/${eventId}/${item.to}` : `/events/${eventId}`
                    return (
                      <NavLink
                        key={item.to || 'overview'}
                        to={to}
                        end={!!item.end}
                        onClick={(e) => { e.preventDefault(); go(to) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
                        style={({ isActive }) => ({
                          color: isActive ? SB.gold : SB.textMuted,
                          background: isActive ? SB.activeBg : 'transparent',
                          borderLeft: `3px solid ${isActive ? SB.gold : 'transparent'}`,
                          paddingLeft: 9,
                          textDecoration: 'none',
                        })}
                      >
                        <item.icon size={17} className="flex-shrink-0" />
                        {!collapsed && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                      </NavLink>
                    )
                  })}
              </div>
            ))}
          </nav>

          <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${SB.border}` }}>
            {!collapsed && (
              <div className="flex items-center gap-3 px-1 py-2">
                <Avatar name={displayName} size="sm" ring />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: SB.textPrimary }}>{displayName}</p>
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: SB.gold }}>
                    {user?.email || ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hidden md:flex items-center justify-center z-50"
            style={{ background: SB.bg, border: `1px solid ${SB.border}`, color: SB.textTert }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={12} style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
          </button>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

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
            <div className="app-topbar-heading">
              <h1 className="app-topbar-title">{sectionOf(location.pathname, eventId).title}</h1>
              {sectionOf(location.pathname, eventId).desc && (
                <span className="app-topbar-sub">{sectionOf(location.pathname, eventId).desc}</span>
              )}
            </div>
            <div className="app-topbar-actions">
              {user?.email && <span className="app-topbar-user hint">{user.email}</span>}
              <ThemeToggle className="topbar-theme-toggle" />
            </div>
          </header>

          <main className="app-content flex-1"><Outlet /></main>
        </div>
      </div>
    </div>
  )
}
