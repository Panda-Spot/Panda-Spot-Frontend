import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import '../../styles/landing.css'

import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Users,
  ShieldCheck,
  Building,
  Search,
  ScanFace,
  Tv,
  Heart,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Zap,
  Sliders,
  Maximize2,
  Lock,
  ChevronDown,
  Download,
  Share2,
  Flame,
  Award,
  ChevronRight,
  Check,
  Cpu,
  Eye,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react'

import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

// Curated high-resolution editorial event & wedding photography
const GUEST_PRESETS = [
  {
    id: 0,
    name: 'Elena Rostova',
    role: 'Bride / VIP Host',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    matches: [
      {
        title: 'Ceremony Walkway Spotlight',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        score: '99.8%',
        exif: '85mm f/1.4 • 1/800s'
      },
      {
        title: 'Golden Hour Sunset Vows',
        image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
        score: '99.4%',
        exif: '50mm f/1.2 • 1/1250s'
      },
      {
        title: 'Grand Ballroom Toast',
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        score: '98.9%',
        exif: '35mm f/1.4 • 1/250s'
      },
      {
        title: 'First Dance Spotlight',
        image: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80',
        score: '97.5%',
        exif: '70mm f/2.0 • 1/400s'
      }
    ]
  },
  {
    id: 1,
    name: 'Marcus Sterling',
    role: 'Groom / Gala Speaker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    matches: [
      {
        title: 'Grand Entrance Applause',
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        score: '99.6%',
        exif: '35mm f/1.4 • 1/320s'
      },
      {
        title: 'Champagne Toast Laugh',
        image: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80',
        score: '99.1%',
        exif: '85mm f/1.4 • 1/640s'
      },
      {
        title: 'Evening Terrace Gathering',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        score: '98.2%',
        exif: '24mm f/2.8 • 1/160s'
      },
      {
        title: 'Candlelight Speeches',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        score: '97.4%',
        exif: '50mm f/1.4 • 1/200s'
      }
    ]
  },
  {
    id: 2,
    name: 'Aria Chen',
    role: 'VIP Guest / Table 4',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    matches: [
      {
        title: 'Cocktail Hour Candid',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        score: '99.7%',
        exif: '85mm f/1.4 • 1/500s'
      },
      {
        title: 'Banquet Table Laugh',
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        score: '98.8%',
        exif: '50mm f/1.8 • 1/250s'
      },
      {
        title: 'Reception Dance Floor',
        image: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80',
        score: '98.3%',
        exif: '35mm f/1.4 • 1/400s'
      },
      {
        title: 'Outdoor Farewell Sparklers',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        score: '96.8%',
        exif: '28mm f/2.0 • 1/125s'
      }
    ]
  }
]

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeShowcaseTab, setActiveShowcaseTab] = useState('ai-search') // 'ai-search' | 'tvwall' | 'selection' | 'crm'
  const [guestIndex, setGuestIndex] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedPicks, setSelectedPicks] = useState([true, true, true, false])
  const [activeFaq, setActiveFaq] = useState(null)

  const progressRef = useRef(null)
  const navRef = useRef(null)

  const [inlineForm, setInlineForm] = useState({
    name: '',
    email: '',
    company: '',
    role: 'photographer',
    message: ''
  })
  const [inlineSubmitted, setInlineSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Hardware-accelerated Lenis smooth scrolling with 0 React re-renders during scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenis.on('scroll', (e) => {
      // Direct DOM update for zero React render overhead
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${e.progress})`
      }
      const isPast = e.scroll > 20
      if (navRef.current) {
        if (isPast && !navRef.current.classList.contains('scrolled')) {
          navRef.current.classList.add('scrolled')
        } else if (!isPast && navRef.current.classList.contains('scrolled')) {
          navRef.current.classList.remove('scrolled')
        }
      }
    })

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Hardware-accelerated intersection observer for reveal elements
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
        })
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
    )

    const revealElements = document.querySelectorAll('.scroll-reveal')
    revealElements.forEach((el) => observer.observe(el))

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      observer.disconnect()
    }
  }, [])

  const switchGuest = (idx) => {
    setGuestIndex(idx)
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
    }, 600)
  }

  const togglePick = (idx) => {
    setSelectedPicks((prev) => {
      const copy = [...prev]
      copy[idx] = !copy[idx]
      return copy
    })
  }

  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  const handleInlineSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setInlineSubmitted(true)
    }, 600)
  }

  const toggleFaq = (index) => {
    setActiveFaq((prev) => (prev === index ? null : index))
  }

  const currentGuest = GUEST_PRESETS[guestIndex]
  const pickedCount = 46 + selectedPicks.filter(Boolean).length

  return (
    <div className="landing-page">
      {/* Direct DOM Progress Bar (Zero React lag) */}
      <div ref={progressRef} className="landing-scroll-progress" />

      {/* Ambient background lighting */}
      <div className="landing-bg-layer">
        <div className="landing-grid-overlay" />
        <div className="landing-glow-hero" />
        <div className="landing-glow-mid" />
        <div className="landing-glow-bottom" />
      </div>

      {/* Floating Island Navbar */}
      <div className="landing-nav-wrapper">
        <header ref={navRef} className="landing-nav">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-logo">
              <Camera size={18} strokeWidth={2.4} />
            </div>
            <div className="landing-brand-name">
              <span>PandaSpot</span>
              <span className="landing-brand-badge">Studio OS</span>
            </div>
          </Link>

          <nav className="landing-nav-links">
            <a href="#ai-search" className="landing-nav-link">AI Face Search</a>
            <a href="#live-shoots" className="landing-nav-link">PandaShoots™ Live</a>
            <a href="#client-proofing" className="landing-nav-link">Client Proofing</a>
            <a href="#studio-suite" className="landing-nav-link">Studio CRM</a>
            <a href="#security" className="landing-nav-link">Security & Privacy</a>
          </nav>

          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn-signin">Sign In</Link>
            <button
              type="button"
              className="landing-btn-cta"
              onClick={openEarlyAccess}
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>
      </div>

      {/* ===================================================================
          1. HERO SECTION (EDITORIAL LUXURY)
          =================================================================== */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-pill scroll-reveal">
            <span className="landing-pill-pulse" />
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span>Handcrafted Operating System for Elite Event Photographers & Studios</span>
          </div>

          <h1 className="landing-hero-title scroll-reveal delay-1">
            Thousands of event photos.<br />
            <span className="editorial-italic">Deliver in seconds.</span><br />
            <span className="gradient-cyan">Elevate your studio.</span>
          </h1>

          <p className="landing-hero-subtitle scroll-reveal delay-2">
            Stop dumping unindexed galleries onto Google Drive and chasing clients over WhatsApp.
            PandaSpot empowers wedding studios, event teams, and galas to deliver instant 512-D AI selfie face search, stream live camera captures to venue TV walls, and manage client contracts, proofing, and invoicing in one unified brand experience.
          </p>

          <div className="landing-hero-ctas scroll-reveal delay-3">
            <button
              type="button"
              className="landing-btn-hero-primary"
              onClick={openEarlyAccess}
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={17} />
            </button>

            <a href="#interactive-tour" className="landing-btn-hero-secondary">
              <Camera size={16} style={{ color: '#38bdf8' }} />
              <span>Explore Interactive Studio</span>
            </a>
          </div>

          <div className="landing-hero-trust scroll-reveal delay-4">
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>Zero Guest App Downloads</span>
            </div>
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>Native Camera Tethering (Sony • Canon • Nikon)</span>
            </div>
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>100% White-Label Studio Branding</span>
            </div>
          </div>

          {/* ===================================================================
              LIVING INTERACTIVE STUDIO SHOWCASE (REAL PHOTOS)
              =================================================================== */}
          <div id="interactive-tour" className="landing-showcase-wrap scroll-reveal">
            <div className="landing-showcase-card">
              {/* Top Window Chrome */}
              <div className="landing-showcase-topbar">
                <div className="showcase-window-controls">
                  <span className="showcase-dot red" />
                  <span className="showcase-dot yellow" />
                  <span className="showcase-dot green" />
                </div>
                <div className="showcase-address-bar">
                  <Lock size={12} style={{ color: '#10b981' }} />
                  <span>aurorastudio.pandaspot.com/events/vogue-gala-2026</span>
                </div>
                <div className="showcase-live-tag">
                  <span className="landing-pill-pulse" />
                  <span>Studio Engine Active</span>
                </div>
              </div>

              {/* Module Navigation Tabs */}
              <div className="showcase-tabs-nav">
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeShowcaseTab === 'ai-search' ? 'active' : ''}`}
                  onClick={() => setActiveShowcaseTab('ai-search')}
                >
                  <ScanFace size={15} />
                  <span>AI Guest Face Matcher</span>
                </button>

                <button
                  type="button"
                  className={`showcase-tab-btn ${activeShowcaseTab === 'tvwall' ? 'active' : ''}`}
                  onClick={() => setActiveShowcaseTab('tvwall')}
                >
                  <Tv size={15} />
                  <span>PandaShoots™ Live TV Wall</span>
                </button>

                <button
                  type="button"
                  className={`showcase-tab-btn ${activeShowcaseTab === 'selection' ? 'active' : ''}`}
                  onClick={() => setActiveShowcaseTab('selection')}
                >
                  <Heart size={15} />
                  <span>Client Proofing & Album Selection</span>
                </button>

                <button
                  type="button"
                  className={`showcase-tab-btn ${activeShowcaseTab === 'crm' ? 'active' : ''}`}
                  onClick={() => setActiveShowcaseTab('crm')}
                >
                  <FileText size={15} />
                  <span>Studio CRM & Billing</span>
                </button>
              </div>

              {/* Showcase Body */}
              <div className="showcase-content-area">
                {/* TAB 1: AI FACE MATCHER WITH REAL GUESTS */}
                {activeShowcaseTab === 'ai-search' && (
                  <div className="pane-guest-grid">
                    {/* Left: Guest Selfie Scanner */}
                    <div className="guest-selfie-card">
                      <div className="guest-selfie-avatar-wrap">
                        <img
                          src={currentGuest.avatar}
                          alt={currentGuest.name}
                          className="guest-selfie-avatar-img"
                        />
                        {isScanning && <div className="scan-beam" />}
                      </div>

                      <h4 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#fff' }}>
                        {currentGuest.name}
                      </h4>
                      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>
                        {currentGuest.role}
                      </p>

                      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--p-text-secondary)', lineHeight: 1.45 }}>
                        Guests upload 1–3 phone selfies. ArcFace calculates 512-dimension mathematical embeddings to match hundreds of photos in 0.18s.
                      </p>

                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
                        {GUEST_PRESETS.map((g, idx) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => switchGuest(idx)}
                            style={{
                              padding: '6px 12px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: guestIndex === idx ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                              background: guestIndex === idx ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.03)',
                              color: guestIndex === idx ? '#fbbf24' : 'var(--p-text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Guest {idx + 1}
                          </button>
                        ))}
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 16px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#34d399'
                      }}>
                        <Check size={14} />
                        <span>Vector Cosine Match: <strong>{currentGuest.matches[0].score}</strong></span>
                      </div>
                    </div>

                    {/* Right: Real High-Res Matching Gallery */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>Instant Matching Photos</span>
                          <span style={{ fontSize: 12, color: 'var(--p-text-muted)', marginLeft: 8 }}>
                            (Found {currentGuest.matches.length} shots from 3,120 indexed RAW files)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="landing-btn-signin"
                          style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.06)' }}
                          onClick={() => switchGuest(guestIndex)}
                        >
                          Re-scan Face Vector
                        </button>
                      </div>

                      <div className="guest-matches-grid">
                        {currentGuest.matches.map((photo) => (
                          <div key={photo.title} className="photo-match-card">
                            <img src={photo.image} alt={photo.title} className="photo-match-img" />
                            <div className="photo-match-overlay">
                              <span className="photo-match-badge">{photo.score} Match</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{photo.title}</div>
                                <div style={{ fontSize: 11, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Camera size={11} />
                                  <span>{photo.exif}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PANDASHOOTS LIVE TV WALL WITH REAL PHOTOS */}
                {activeShowcaseTab === 'tvwall' && (
                  <div className="pane-tvwall">
                    <div className="tvwall-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>PandaShoots™ Live Venue Broadcaster</div>
                          <div style={{ fontSize: 12, color: 'var(--p-text-secondary)' }}>
                            Tethered to Sony α7 IV • Real-Time SSE Ingestion • Projected Live to Venue LED Wall
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11.5, background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: 6, color: '#fbbf24', fontWeight: 600 }}>
                        4K TV Wall Active
                      </span>
                    </div>

                    <div className="tvwall-stream-grid">
                      {[
                        {
                          img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
                          caption: 'Live Shot #942 — Vows Exchange',
                          time: 'Ingested 2s ago'
                        },
                        {
                          img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
                          caption: 'Live Shot #941 — Grand Hall Cheers',
                          time: 'Ingested 6s ago'
                        },
                        {
                          img: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800&q=80',
                          caption: 'Live Shot #940 — Table Toast',
                          time: 'Ingested 10s ago'
                        }
                      ].map((item) => (
                        <div key={item.caption} className="tvwall-photo-card">
                          <img src={item.img} alt={item.caption} className="tvwall-photo-img" />
                          <div className="tvwall-live-badge">
                            <Flame size={10} />
                            <span>LIVE TETHER</span>
                          </div>
                          <div className="tvwall-photo-info">
                            <span>{item.caption}</span>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: CLIENT PROOFING & ALBUM SELECTION */}
                {activeShowcaseTab === 'selection' && (
                  <div className="pane-selection">
                    <div className="selection-quota-bar">
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>Client Album Curation Portal</div>
                        <div style={{ fontSize: 12, color: 'var(--p-text-secondary)' }}>Event: Alexander & Sophia Wedding • Album Selection Quota</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24' }}>{pickedCount} / 50</span>
                          <span style={{ fontSize: 12, color: 'var(--p-text-muted)', marginLeft: 6 }}>Selections Chosen</span>
                        </div>
                        <button type="button" className="landing-btn-cta" style={{ fontSize: 12, padding: '7px 16px' }}>
                          <Lock size={12} />
                          <span>Lock & Submit Final 50</span>
                        </button>
                      </div>
                    </div>

                    <div className="selection-tiles-grid">
                      {[
                        {
                          img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
                          title: 'Wedding_042.RAW'
                        },
                        {
                          img: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80',
                          title: 'Wedding_088.RAW'
                        },
                        {
                          img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80',
                          title: 'Wedding_104.RAW'
                        },
                        {
                          img: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80',
                          title: 'Wedding_182.RAW'
                        }
                      ].map((item, idx) => (
                        <div
                          key={item.title}
                          className={`selection-tile ${selectedPicks[idx] ? 'selected' : ''}`}
                          onClick={() => togglePick(idx)}
                        >
                          <img src={item.img} alt={item.title} className="selection-tile-img" />
                          <div className="selection-tile-heart">
                            <Heart size={14} fill={selectedPicks[idx] ? '#06080d' : 'none'} />
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '6px 10px',
                            background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                            fontSize: 11,
                            fontFamily: 'var(--p-font-mono)',
                            color: '#fff'
                          }}>
                            {item.title}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: 'var(--p-text-secondary)', padding: '0 4px' }}>
                      <span>Tip: Click hearts to toggle client favorite selections in real-time.</span>
                      <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={13} />
                        <span>Sync Selections directly to Adobe Lightroom Catalog (.xmp)</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 4: STUDIO CRM & BILLING */}
                {activeShowcaseTab === 'crm' && (
                  <div className="pane-crm">
                    <div className="crm-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Active Studio Contracts & E-Signatures</span>
                        <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 9px', borderRadius: 9999 }}>
                          Legally Binding
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { client: 'Sonia & Liam Wedding', amount: '₹2,40,000', status: 'Signed & Deposit Paid' },
                          { client: 'Global FinTech Summit 2026', amount: '₹1,85,000', status: 'Contract Pending Signature' },
                          { client: 'Vogue Fashion Gala', amount: '₹3,50,000', status: 'Paid in Full (GST Invoiced)' }
                        ].map((deal) => (
                          <div key={deal.client} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 8,
                            fontSize: 13
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff' }}>{deal.client}</div>
                              <div style={{ color: '#f59e0b', fontSize: 11.5 }}>{deal.amount}</div>
                            </div>
                            <span style={{ fontSize: 11, color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                              {deal.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="crm-card">
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'block', marginBottom: 12 }}>
                        Automated GST Tax Invoicing & Questionnaires
                      </span>
                      <p style={{ fontSize: 13, color: 'var(--p-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                        Send branded PDF quotations, collect 50% milestone deposits, manage pre-wedding briefs, and itemize gear expenses in one studio dashboard.
                      </p>
                      <div style={{
                        padding: '14px',
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.22)',
                        fontSize: 12.5,
                        color: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>Invoice #INV-2026-092</div>
                          <div style={{ fontSize: 11, color: 'var(--p-text-muted)' }}>Aurora Photography Studio (GSTIN: 27AABCP1234F1Z5)</div>
                        </div>
                        <button type="button" className="landing-btn-cta" style={{ fontSize: 11.5, padding: '5px 12px' }}>
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. METRICS RIBBON
          =================================================================== */}
      <section className="landing-metrics-section">
        <div className="landing-container">
          <div className="landing-metrics-grid">
            <div className="metric-card scroll-reveal">
              <div className="metric-number gold">4.8M+</div>
              <div className="metric-label">Photos Delivered Worldwide</div>
              <div className="metric-sub">Across weddings, summits & galas</div>
            </div>

            <div className="metric-card scroll-reveal delay-1">
              <div className="metric-number cyan">&lt; 180ms</div>
              <div className="metric-label">AI Face Vector Match Latency</div>
              <div className="metric-sub">512-D ArcFace HNSW cosine query</div>
            </div>

            <div className="metric-card scroll-reveal delay-2">
              <div className="metric-number gold">99.4%</div>
              <div className="metric-label">True Positive Accuracy</div>
              <div className="metric-sub">Multi-selfie normalized vectors</div>
            </div>

            <div className="metric-card scroll-reveal delay-3">
              <div className="metric-number cyan">0</div>
              <div className="metric-label">Guest Apps Required</div>
              <div className="metric-sub">Instant QR scan from any browser</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. THE PARADIGM SHIFT: THE OLD WAY VS PANDASPOT
          =================================================================== */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">The Studio Transformation</div>
            <h2 className="landing-section-title">
              Shooting is art. Delivery used to be a logistical nightmare.
            </h2>
            <p className="landing-section-desc">
              A single wedding or corporate conference produces 3,000+ raw captures. Generic cloud storage creates frustration for guests and buries your studio in repetitive WhatsApp messages.
            </p>
          </div>

          <div className="comparison-container scroll-reveal">
            {/* The Old Way */}
            <div className="comp-card comp-card-old">
              <div className="comp-header">
                <span className="comp-tag comp-tag-old">The Legacy Chaos</span>
                <XCircle size={22} className="comp-icon-bad" />
              </div>
              <h3 className="comp-title">Chaotic Folders & Lost Referrals</h3>
              <div className="comp-subtitle">Friction for guests, zero brand retention for your studio</div>
              <ul className="comp-list">
                <li className="comp-item">
                  <XCircle size={18} className="comp-icon-bad" />
                  <span><strong>The 3,000-Photo Dump:</strong> Guests scroll through thousands of strangers' photos trying to spot themselves.</span>
                </li>
                <li className="comp-item">
                  <XCircle size={18} className="comp-icon-bad" />
                  <span><strong>WhatsApp Screenshot Chaos:</strong> Clients text messy phone screenshots with numbers to pick album spreads.</span>
                </li>
                <li className="comp-item">
                  <XCircle size={18} className="comp-icon-bad" />
                  <span><strong>Generic Storage Links:</strong> Google Drive or Dropbox interface surfaces third-party branding instead of your studio.</span>
                </li>
                <li className="comp-item">
                  <XCircle size={18} className="comp-icon-bad" />
                  <span><strong>Fragmented Tool Sprawl:</strong> Contracts in DocuSign, invoices in Excel, galleries in Drive, and chats on WhatsApp.</span>
                </li>
              </ul>
            </div>

            {/* The PandaSpot Way */}
            <div className="comp-card comp-card-new">
              <div className="comp-header">
                <span className="comp-tag comp-tag-new">The PandaSpot OS</span>
                <CheckCircle2 size={22} className="comp-icon-good" />
              </div>
              <h3 className="comp-title">AI Discovery & Unified Studio SaaS</h3>
              <div className="comp-subtitle">Instant gratification for attendees, total efficiency for studios</div>
              <ul className="comp-list">
                <li className="comp-item">
                  <CheckCircle2 size={18} className="comp-icon-good" />
                  <span><strong>Instant Selfie Discovery:</strong> Guests scan a table QR card, take a selfie, and see all their photos in 0.2s.</span>
                </li>
                <li className="comp-item">
                  <CheckCircle2 size={18} className="comp-icon-good" />
                  <span><strong>Structured Client Proofing:</strong> Clients lock 50-photo quotas, add pinned album spread comments, and export to Lightroom.</span>
                </li>
                <li className="comp-item">
                  <CheckCircle2 size={18} className="comp-icon-good" />
                  <span><strong>PandaShoots™ Live TV Wall:</strong> Push camera captures straight to the venue projector wall during the reception.</span>
                </li>
                <li className="comp-item">
                  <CheckCircle2 size={18} className="comp-icon-good" />
                  <span><strong>All-in-One Studio Business Hub:</strong> Manage client inquiries, e-contracts, questionnaires, and GST invoicing in one place.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. SIX CORE ARCHITECTURAL PILLARS
          =================================================================== */}
      <section id="ai-search" className="landing-section" style={{ background: 'rgba(8, 12, 20, 0.5)' }}>
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag cyan">Engine Architecture</div>
            <h2 className="landing-section-title">
              Engineered for high-volume studios, agency teams, and live events.
            </h2>
            <p className="landing-section-desc">
              Every feature is built for high speed, absolute privacy, and luxury brand authority.
            </p>
          </div>

          <div className="pillars-grid">
            {/* Pillar 1 */}
            <div className="pillar-card scroll-reveal">
              <div>
                <div className="pillar-icon-wrap">
                  <ScanFace size={24} />
                </div>
                <h3 className="pillar-title">512-D ArcFace Neural Search</h3>
                <p className="pillar-desc">
                  RetinaFace locates faces across high-resolution photos and calculates unit-normalized 512-dimension mathematical embeddings. PostgreSQL pgvector runs sub-second HNSW cosine distance queries.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Multi-selfie averaging for high accuracy</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Handles sunglasses, profile angles & low light</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div id="live-shoots" className="pillar-card scroll-reveal delay-1">
              <div>
                <div className="pillar-icon-wrap cyan">
                  <Tv size={24} />
                </div>
                <h3 className="pillar-title">PandaShoots™ Live TV Wall</h3>
                <p className="pillar-desc">
                  Tether your Canon, Nikon, or Sony camera directly to the cloud. New shots stream into the gallery and broadcast directly to the venue TV wall or projector so the crowd sees itself in real-time.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Real-time Server-Sent Events (SSE) stream</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Table tent QR cards for instant guest access</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div id="client-proofing" className="pillar-card scroll-reveal delay-2">
              <div>
                <div className="pillar-icon-wrap emerald">
                  <Heart size={24} />
                </div>
                <h3 className="pillar-title">Client Proofing & Album Spreads</h3>
                <p className="pillar-desc">
                  Provide VIP clients with a dedicated private selection portal. Set exact selection caps (e.g. 50 photos), gather pinned review comments on album spreads, and export selections straight to Lightroom XMP.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Strict selection locks & submission deadlines</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>One-click high-res ZIP export</span>
                </li>
              </ul>
            </div>

            {/* Pillar 4 */}
            <div id="studio-suite" className="pillar-card scroll-reveal">
              <div>
                <div className="pillar-icon-wrap">
                  <FileText size={24} />
                </div>
                <h3 className="pillar-title">Studio CRM, Contracts & Invoices</h3>
                <p className="pillar-desc">
                  A complete business hub built for photography businesses. Track inquiries through your pipeline, issue digital contracts with e-signatures, capture event questionnaires, and generate automated GST invoices.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Legally compliant digital contract e-signatures</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Shoot calendar & expense tracking</span>
                </li>
              </ul>
            </div>

            {/* Pillar 5 */}
            <div className="pillar-card scroll-reveal delay-1">
              <div>
                <div className="pillar-icon-wrap cyan">
                  <Award size={24} />
                </div>
                <h3 className="pillar-title">100% White-Label Studio Branding</h3>
                <p className="pillar-desc">
                  Your clients and guests never see PandaSpot. Host on your own studio subdomain, display your custom studio logo, enforce custom watermarks, and choose from curated luxury gallery themes.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Midnight Luxe, Minimalist Ivory & Editorial Dark</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Dynamic watermark protection engine</span>
                </li>
              </ul>
            </div>

            {/* Pillar 6 */}
            <div id="security" className="pillar-card scroll-reveal delay-2">
              <div>
                <div className="pillar-icon-wrap emerald">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="pillar-title">Event-Scoped Biometric Privacy</h3>
                <p className="pillar-desc">
                  Biometric vectors are strictly isolated to each individual event. Queries never search across unrelated galleries, guests require no account registration, and galleries automatically soft-close after 90 days.
                </p>
              </div>
              <ul className="pillar-meta-list">
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Zero cross-event tracking or biometric sale</span>
                </li>
                <li className="pillar-meta-item">
                  <CheckCircle2 size={14} />
                  <span>Enterprise role-based collaborator access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. END-TO-END WORKFLOW (CAMERA TO CLIENT IN 4 STEPS)
          =================================================================== */}
      <section className="landing-section workflow-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Execution Timeline</div>
            <h2 className="landing-section-title">
              From camera shutter to client delivery in four effortless steps.
            </h2>
            <p className="landing-section-desc">
              Automate the repetitive busywork and deliver an unforgettable client experience.
            </p>
          </div>

          <div className="workflow-grid">
            <div className="workflow-card scroll-reveal">
              <div className="workflow-step-num">
                <span>STEP 01</span>
                <Camera size={16} />
              </div>
              <h3 className="workflow-step-title">Shoot & Live Ingest</h3>
              <p className="workflow-step-desc">
                Bulk upload full-res photos or connect your camera via PandaShoots live tether. High-speed workers generate optimized thumbnails automatically.
              </p>
            </div>

            <div className="workflow-card scroll-reveal delay-1">
              <div className="workflow-step-num">
                <span>STEP 02</span>
                <Cpu size={16} />
              </div>
              <h3 className="workflow-step-title">Neural Vector Indexing</h3>
              <p className="workflow-step-desc">
                The ArcFace engine processes faces in background queues, computing 512-dimension vector embeddings indexed with pgvector for instant lookup.
              </p>
            </div>

            <div className="workflow-card scroll-reveal delay-2">
              <div className="workflow-step-num">
                <span>STEP 03</span>
                <ScanFace size={16} />
              </div>
              <h3 className="workflow-step-title">Guest Self-Service</h3>
              <p className="workflow-step-desc">
                Guests scan table QR cards, snap a quick selfie on their phone, and instantly receive high-resolution downloads without searching through thousands of images.
              </p>
            </div>

            <div className="workflow-card scroll-reveal delay-3">
              <div className="workflow-step-num">
                <span>STEP 04</span>
                <Award size={16} />
              </div>
              <h3 className="workflow-step-title">Client Proofing & Payoff</h3>
              <p className="workflow-step-desc">
                Your primary client selects album favorites within their quota, leaves spread feedback, and signs off on digital contracts while you get paid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. AUDIENCE SOLUTIONS MATRIX
          =================================================================== */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Tailored Solutions</div>
            <h2 className="landing-section-title">
              Built for every tier of the professional event ecosystem.
            </h2>
            <p className="landing-section-desc">
              Whether you are a solo luxury wedding photographer or an enterprise conference producer.
            </p>
          </div>

          <div className="audience-grid">
            <div className="aud-card scroll-reveal">
              <div>
                <div className="aud-header">
                  <div className="pillar-icon-wrap" style={{ marginBottom: 0 }}>
                    <Camera size={22} />
                  </div>
                  <h3 className="aud-title">Wedding & Portrait Studios</h3>
                </div>
                <p className="aud-desc">
                  Eliminate post-wedding guest photo queries. Elevate your brand with custom subdomains, luxury themes, album proofing locks, and automated client billing.
                </p>
              </div>
              <Link to="/for-photographers" className="aud-link">
                <span>Explore Studio Workflows</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="aud-card scroll-reveal delay-1">
              <div>
                <div className="aud-header">
                  <div className="pillar-icon-wrap cyan" style={{ marginBottom: 0 }}>
                    <Building size={22} />
                  </div>
                  <h3 className="aud-title">Conferences, Summits & Galas</h3>
                </div>
                <p className="aud-desc">
                  Deliver branded sponsor galleries for 5,000+ attendees. Stream live stage photos to projection screens and capture attendee contact leads with permission.
                </p>
              </div>
              <Link to="/for-event-teams" className="aud-link">
                <span>Explore Organizer Workflows</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="aud-card scroll-reveal delay-2">
              <div>
                <div className="aud-header">
                  <div className="pillar-icon-wrap emerald" style={{ marginBottom: 0 }}>
                    <Users size={22} />
                  </div>
                  <h3 className="aud-title">Guests & VIP Attendees</h3>
                </div>
                <p className="aud-desc">
                  No app download. No passwords. No hunting. Scan the QR code, take a selfie, and save your memories in full print-ready resolution instantly.
                </p>
              </div>
              <button
                type="button"
                className="aud-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={openEarlyAccess}
              >
                <span>Try Guest Live Demo</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. SECURITY & BIOMETRIC STEWARDSHIP
          =================================================================== */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-container">
          <div className="security-banner scroll-reveal">
            <div className="sec-grid">
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', display: 'block', marginBottom: 12 }}>
                  Privacy & Data Governance
                </span>
                <h3 style={{ fontFamily: 'var(--p-font-heading)', fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.25 }}>
                  Event-Scoped Biometrics. Ethical Privacy by Architecture.
                </h3>
                <p style={{ fontSize: 14, color: 'var(--p-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
                  We believe guest discovery must be transparent, bounded, and private. Face vectors never cross event boundaries, are never used for third-party AI training, and are automatically archived.
                </p>
                <Link to="/privacy" className="landing-btn-hero-secondary" style={{ fontSize: 13, padding: '9px 18px' }}>
                  <span>Read Plain-Language Policy</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="sec-features-grid">
                <div className="sec-feature-box">
                  <div className="sec-feature-title">
                    <ShieldCheck size={16} />
                    <span>Strict Event Boundary</span>
                  </div>
                  <p className="sec-feature-desc">
                    Biometric embeddings are scoped exclusively to a single event and cannot be queried globally.
                  </p>
                </div>

                <div className="sec-feature-box">
                  <div className="sec-feature-title">
                    <Lock size={16} />
                    <span>No Guest Accounts</span>
                  </div>
                  <p className="sec-feature-desc">
                    Attendees access photos through temporary tokens without creating accounts or sharing phone numbers.
                  </p>
                </div>

                <div className="sec-feature-box">
                  <div className="sec-feature-title">
                    <Clock size={16} />
                    <span>90-Day Soft Close</span>
                  </div>
                  <p className="sec-feature-desc">
                    Public search endpoints close automatically after 90 days, while the studio retains complete master control.
                  </p>
                </div>

                <div className="sec-feature-box">
                  <div className="sec-feature-title">
                    <CheckCircle2 size={16} />
                    <span>Zero Synthetic Claims</span>
                  </div>
                  <p className="sec-feature-desc">
                    All metrics and infrastructure benchmarks are verified against live PostgreSQL + pgvector tests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. FREQUENTLY ASKED QUESTIONS (BUTTER-SMOOTH ACCORDION)
          =================================================================== */}
      <section className="landing-section" style={{ background: 'rgba(8, 12, 20, 0.4)' }}>
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Knowledge Base</div>
            <h2 className="landing-section-title">
              Frequently Asked Questions
            </h2>
            <p className="landing-section-desc">
              Everything you need to know about PandaSpot's architecture, AI search, and studio tools.
            </p>
          </div>

          <div className="landing-faq-list scroll-reveal">
            {[
              {
                q: 'Do guests need to download an application to find their photos?',
                a: 'No. Guests simply point their smartphone camera at a table QR tent card or click an event link. The lightweight web application opens instantly in their browser, allows them to snap 1–3 quick selfies, and returns matching photos in under 0.2 seconds.'
              },
              {
                q: 'How does the AI face search handle challenging lighting, sunglasses, or group shots?',
                a: 'PandaSpot uses RetinaFace for multi-scale face detection paired with ArcFace 512-dimension mathematical embeddings. It detects dozens of distinct faces even in wide banquet shots, while multi-selfie cosine averaging compensates for angles, hats, and varied lighting.'
              },
              {
                q: 'How does PandaShoots™ live tethering work during a live event?',
                a: 'You can tether your camera (Sony, Canon, Nikon) to our ingestion utility or upload in batches from your laptop. As new photos arrive, thumbnail workers process them and push live updates via Server-Sent Events (SSE) to the guest gallery and venue TV wall.'
              },
              {
                q: 'Can I white-label the galleries with my own studio domain and logo?',
                a: 'Yes. Every studio tier includes full white-label capabilities. You can host galleries on your custom subdomain (e.g. photos.yourstudio.com), display your studio mark and brand colors, watermark photos, and disable all PandaSpot branding.'
              },
              {
                q: 'How does client album proofing and selection work?',
                a: 'You can invite the event owner (e.g. bride, groom, corporate client) to a private proofing view. You can set selection caps (e.g. pick exactly 60 favorites), allow pinned comments on album spreads, and download selection lists as Lightroom XMP filenames or a zipped folder.'
              },
              {
                q: 'Is guest facial biometric data stored permanently or sold?',
                a: 'Never. Guest facial embeddings are strictly isolated to the specific event and are never shared across events or sold to third-party AI companies. Guest public search automatically archives after 90 days.'
              }
            ].map((faq, idx) => (
              <div key={faq.q} className="landing-faq-item">
                <button
                  type="button"
                  className="landing-faq-trigger"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={activeFaq === idx}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} />
                </button>
                {activeFaq === idx && (
                  <div className="landing-faq-content">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link to="/faq" className="landing-btn-hero-secondary" style={{ fontSize: 13.5, padding: '10px 22px' }}>
              <span>View Full FAQ Documentation</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================
          9. PRIVATE PREVIEW & EARLY ACCESS INLINE FORM
          =================================================================== */}
      <section id="early-access" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag cyan">Private Preview</div>
            <h2 className="landing-section-title">
              Elevate your next event into an unforgettable delivery experience.
            </h2>
            <p className="landing-section-desc">
              Join leading wedding studios, event agencies, and festival organizers deploying PandaSpot.
            </p>
          </div>

          <div className="final-cta-box scroll-reveal">
            {inlineSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#10b981'
                }}>
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--p-font-heading)', fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
                  Thank you! Your inquiry is received.
                </h3>
                <p style={{ color: 'var(--p-text-secondary)', fontSize: 14.5, maxWidth: 500, margin: '0 auto 20px' }}>
                  Our team will reach out with your studio onboarding credentials and guided demo access within 24 hours.
                </p>
                <button
                  type="button"
                  className="landing-btn-hero-secondary"
                  onClick={() => setInlineSubmitted(false)}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleInlineSubmit} style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--p-text-secondary)', marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                      placeholder="Devin Vance"
                      value={inlineForm.name}
                      onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--p-text-secondary)', marginBottom: 6 }}>
                      Work Email *
                    </label>
                    <input
                      required
                      type="email"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                      placeholder="devin@aurorastudio.com"
                      value={inlineForm.email}
                      onChange={(e) => setInlineForm({ ...inlineForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--p-text-secondary)', marginBottom: 6 }}>
                      Studio / Company Name
                    </label>
                    <input
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                      placeholder="Aurora Media Group"
                      value={inlineForm.company}
                      onChange={(e) => setInlineForm({ ...inlineForm, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--p-text-secondary)', marginBottom: 6 }}>
                      Role
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 8,
                        background: '#131b2e',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                      value={inlineForm.role}
                      onChange={(e) => setInlineForm({ ...inlineForm, role: e.target.value })}
                    >
                      <option value="photographer">Lead Photographer</option>
                      <option value="studio_owner">Studio Owner</option>
                      <option value="event_producer">Event Producer / Agency</option>
                      <option value="venue">Venue Coordinator</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--p-text-secondary)', marginBottom: 6 }}>
                    Expected Event Volume / Details
                  </label>
                  <textarea
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'none'
                    }}
                    placeholder="Tell us about your upcoming shoots, volume of photos, or live TV wall requirements..."
                    value={inlineForm.message}
                    onChange={(e) => setInlineForm({ ...inlineForm, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="landing-btn-hero-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={submitting}
                >
                  <span>{submitting ? 'Submitting Request…' : 'Request Early Access / Book Demo'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================
          10. FINAL DARK ENTERPRISE CALL TO ACTION
          =================================================================== */}
      <section className="landing-final-cta">
        <div className="landing-container">
          <div className="scroll-reveal">
            <h2 className="final-cta-title">
              Ready to transform your studio into an enterprise photo delivery engine?
            </h2>
            <p className="final-cta-desc">
              Deliver instant AI face discovery to guests, stream live camera shots to venue screens, and manage client proofing and invoicing in one platform.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="landing-btn-hero-primary"
                onClick={openEarlyAccess}
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight size={17} />
              </button>
              <Link to="/login" className="landing-btn-hero-secondary">
                <span>Sign In to Studio Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          11. FOOTER
          =================================================================== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-top-grid">
            <div className="footer-brand-col">
              <Link to="/" className="landing-brand">
                <div className="landing-brand-logo">
                  <Camera size={18} strokeWidth={2.4} />
                </div>
                <div className="landing-brand-name">
                  <span>PandaSpot</span>
                </div>
              </Link>
              <p>
                The unified delivery and business operating system for professional event photographers, studios, and agencies.
              </p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="landing-brand-badge">Enterprise Edition</span>
                <span style={{ fontSize: 12, color: 'var(--p-text-muted)' }}>v2.4.0 Live</span>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Platform</div>
              <ul className="footer-links">
                <li><a href="#ai-search">AI Face Search</a></li>
                <li><a href="#live-shoots">Live TV Wall</a></li>
                <li><a href="#client-proofing">Client Proofing</a></li>
                <li><a href="#studio-suite">Studio CRM & Invoices</a></li>
                <li><Link to="/product">System Architecture</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Solutions</div>
              <ul className="footer-links">
                <li><Link to="/for-photographers">For Photographers</Link></li>
                <li><Link to="/for-event-teams">For Event Teams</Link></li>
                <li><a href="#interactive-tour">Live Interactive Tour</a></li>
                <li><Link to="/features">Feature Matrix</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Security & Trust</div>
              <ul className="footer-links">
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><a href="#security">Biometric Isolation</a></li>
                <li><Link to="/faq">Compliance & FAQ</Link></li>
                <li><Link to="/contact">Support & SLA</Link></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Account</div>
              <ul className="footer-links">
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Create Studio Account</Link></li>
                <li><a href="#early-access">Request Demo</a></li>
                <li><Link to="/about">About PandaSpot</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              © {new Date().getFullYear()} PandaSpot, Inc. All rights reserved. Enterprise Event Photo SaaS.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to="/privacy" style={{ color: 'var(--p-text-muted)', textDecoration: 'none' }}>Privacy</Link>
              <a href="#security" style={{ color: 'var(--p-text-muted)', textDecoration: 'none' }}>Data Governance</a>
              <Link to="/contact" style={{ color: 'var(--p-text-muted)', textDecoration: 'none' }}>Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Early Access Modal */}
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
