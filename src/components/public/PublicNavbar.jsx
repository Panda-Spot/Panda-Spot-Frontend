import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  ArrowRight,
  Sparkles,
  Camera,
  Layers,
  ShieldCheck,
  Building,
  HelpCircle,
  Menu,
  X,
  Compass,
  Cpu,
  Zap,
  Users
} from 'lucide-react'
import { useAuth } from '../../auth.jsx'

export default function PublicNavbar({ onOpenEarlyAccess }) {
  const [scrolled, setScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null) // 'platform' | 'solutions' | null
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownTimeout = useRef(null)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false)
    setActiveDropdown(null)
  }, [location.pathname])

  const handleMouseEnter = (menu) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setActiveDropdown(menu)
  }

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setActiveDropdown(null)
    }, 180)
  }

  return (
    <div className={`nav-island-wrapper ${scrolled ? 'nav-island-scrolled' : ''}`}>
      <header className="nav-island-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand-logo">
          <div className="nav-logo-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12.5" r="4.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12.5" r="1.5" fill="#14B8A6" />
              <circle cx="17.5" cy="8.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="nav-brand-text">
            <span>PandaSpot</span>
            <span className="nav-brand-dot"></span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="nav-links-center">
          {/* Platform Dropdown */}
          <div
            className="nav-item-dropdown"
            onMouseEnter={() => handleMouseEnter('platform')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`nav-link-btn ${activeDropdown === 'platform' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'platform'}
            >
              <span>Platform</span>
              <ChevronDown size={14} className={`nav-chevron ${activeDropdown === 'platform' ? 'rotated' : ''}`} />
            </button>

            {activeDropdown === 'platform' && (
              <div className="nav-dropdown-menu">
                <div className="nav-dropdown-grid">
                  <Link to="/product" className="nav-dropdown-item">
                    <div className="nav-item-icon blue">
                      <Layers size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">System Overview</div>
                      <div className="nav-item-desc">5-module ingestion & discovery pipeline</div>
                    </div>
                  </Link>

                  <Link to="/how-it-works" className="nav-dropdown-item">
                    <div className="nav-item-icon teal">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">How It Works</div>
                      <div className="nav-item-desc">6-stage journey from camera to guest</div>
                    </div>
                  </Link>

                  <Link to="/features" className="nav-dropdown-item">
                    <div className="nav-item-icon purple">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">Feature Catalog</div>
                      <div className="nav-item-desc">Outcome-led matrix & live roadmap</div>
                    </div>
                  </Link>

                  <Link to="/privacy" className="nav-dropdown-item">
                    <div className="nav-item-icon green">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">Privacy by Design</div>
                      <div className="nav-item-desc">Event-isolated vector governance</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div
            className="nav-item-dropdown"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`nav-link-btn ${activeDropdown === 'solutions' ? 'active' : ''}`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              <span>Solutions</span>
              <ChevronDown size={14} className={`nav-chevron ${activeDropdown === 'solutions' ? 'rotated' : ''}`} />
            </button>

            {activeDropdown === 'solutions' && (
              <div className="nav-dropdown-menu nav-dropdown-menu-sm">
                <div className="nav-dropdown-grid">
                  <Link to="/for-photographers" className="nav-dropdown-item">
                    <div className="nav-item-icon blue">
                      <Camera size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">For Photographers & Studios</div>
                      <div className="nav-item-desc">Automate delivery & brand visibility</div>
                    </div>
                  </Link>

                  <Link to="/for-event-teams" className="nav-dropdown-item">
                    <div className="nav-item-icon teal">
                      <Building size={18} />
                    </div>
                    <div>
                      <div className="nav-item-title">For Event Teams & Venues</div>
                      <div className="nav-item-desc">Conferences, galas & activations</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <NavLink to="/faq" className="nav-link-btn">FAQ</NavLink>
          <NavLink to="/about" className="nav-link-btn">About</NavLink>
        </nav>

        {/* Right CTA Actions */}
        <div className="nav-actions-right">
          {user ? (
            <Link to="/events" className="nav-btn-signin">
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className="nav-btn-signin">
              <span>Sign In</span>
            </Link>
          )}

          <button
            type="button"
            className="nav-btn-primary"
            onClick={onOpenEarlyAccess}
          >
            <span className="btn-shine"></span>
            <span>Request Access</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            className="nav-mobile-trigger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="nav-mobile-panel">
          <div className="mobile-nav-group">
            <span className="mobile-group-title">Platform</span>
            <Link to="/product" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Layers size={16} /> <span>System Architecture</span>
            </Link>
            <Link to="/how-it-works" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Zap size={16} /> <span>How It Works (6 Stages)</span>
            </Link>
            <Link to="/features" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Cpu size={16} /> <span>Features & Roadmap</span>
            </Link>
            <Link to="/privacy" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <ShieldCheck size={16} /> <span>Privacy & Security</span>
            </Link>
          </div>

          <div className="mobile-nav-group">
            <span className="mobile-group-title">Solutions</span>
            <Link to="/for-photographers" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Camera size={16} /> <span>For Photographers & Studios</span>
            </Link>
            <Link to="/for-event-teams" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Building size={16} /> <span>For Event Teams & Venues</span>
            </Link>
          </div>

          <div className="mobile-nav-group">
            <span className="mobile-group-title">Company</span>
            <Link to="/faq" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <HelpCircle size={16} /> <span>Frequently Asked Questions</span>
            </Link>
            <Link to="/about" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              <Compass size={16} /> <span>About PandaSpot</span>
            </Link>
          </div>

          <div className="mobile-nav-actions">
            {user ? (
              <Link to="/events" className="nav-btn-signin" onClick={() => setMobileOpen(false)} style={{ textAlign: 'center' }}>
                Open Studio Dashboard
              </Link>
            ) : (
              <Link to="/login" className="nav-btn-signin" onClick={() => setMobileOpen(false)} style={{ textAlign: 'center' }}>
                Sign In to Account
              </Link>
            )}
            <button
              type="button"
              className="nav-btn-primary"
              onClick={() => {
                setMobileOpen(false)
                onOpenEarlyAccess()
              }}
            >
              <span>Request Early Access</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
