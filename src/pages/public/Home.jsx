import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import {
  ArrowRight, Camera, ScanFace, Tv, Heart, FileText, ShieldCheck, CheckCircle2,
  Zap, Users, Building, Lock, Clock, Globe, Smartphone, Star, Sparkles,
  ChevronDown, MessageCircle, Calendar, Receipt, Layers, Cpu, Flame,
  TrendingUp, XCircle,
} from 'lucide-react'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'
import AnimatedLogo from '../../components/AnimatedLogo.jsx'
import { getSmoothScroller, initSmoothScroll } from '../../lib/lenisSmoothScroll.js'
import '../../styles/landing.css'

const FILM_FRAMES = [
  { id: 'A001', caption: 'Weddings', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=70' },
  { id: 'A002', caption: 'Galas', img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=70' },
  { id: 'A003', caption: 'Celebrations', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=70' },
  { id: 'A004', caption: 'Receptions', img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=70' },
  { id: 'A005', caption: 'Ceremonies', img: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=70' },
  { id: 'A006', caption: 'Live Stages', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=70' },
  { id: 'A007', caption: 'Banquets', img: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=600&q=70' },
  { id: 'A008', caption: 'Afterparties', img: 'https://images.unsplash.com/photo-1530021232320-687d8e3dba54?auto=format&fit=crop&w=600&q=70' },
]

const TVWALL_FEED = [
  { img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=70', cap: 'Vows', t: 2 },
  { img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=70', cap: 'Cheers', t: 6 },
  { img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=70', cap: 'Banquet', t: 11 },
]

const AI_GUEST = {
  name: 'Aanya Krishnan',
  role: 'BRIDE',
  score: '99.7%',
  vectors: 512,
  photosFound: 47,
  photosIndexed: 3120,
  matches: [
    { title: 'Mandap Aisle', score: '99.8%', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=70' },
    { title: 'Sangeet Stage', score: '99.2%', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=70' },
    { title: 'Reception Toast', score: '98.6%', img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=70' },
    { title: 'First Dance', score: '97.4%', img: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=70' },
  ],
}

const PIPELINE = [
  { state: 'Inquiry', client: 'Vogue Fashion Gala', amount: '₹3,50,000', tone: 'cyan' },
  { state: 'Quotation', client: 'Sonia & Liam Wedding', amount: '₹2,40,000', tone: 'gold' },
  { state: 'Contract signed', client: 'Global FinTech Summit', amount: '₹1,85,000', tone: 'green' },
  { state: 'Bill issued', client: 'Aurora Studio (internal)', amount: '₹48,000', tone: 'purple' },
]

const CAPABILITY_STRIP = [
  'Face Search', 'PandaShoots™ Live', 'TV Wall', 'Photo Selection', 'Album Proofing',
  'Studio CRM', 'Lead Capture', 'WhatsApp Alerts', 'Drive Sync', 'Custom Domain',
  'Guest Upload', 'EXIF & Ratings', 'Booking', 'Contracts', 'Invoicing',
  'Questionnaires', 'Support', 'Branded Subdomain',
]

const FAQS = [
  {
    q: 'Will my camera actually live-stream into PandaSpot?',
    a: 'Yes. Sony α7 IV, α1, α9 III, Canon R3/R5/R6 II, Nikon Z8/Z9/D5/D6 all ship with built-in FTP transfer. PandaSpot generates per-event credentials, you paste them into the camera, and every shutter press lands in the gallery within seconds. No companion app, no tether cable, no laptop in the loop.',
  },
  {
    q: 'What happens to my photos after 90 days?',
    a: 'Nothing is deleted at 90 days. The 90-day window only controls when the public guest link soft-closes so attendees can no longer search and download. The full-resolution originals, thumbnails, and face data stay in your account under the plan retention rules (7 days on Free, 30 days on Studio, 1 year on Pro). Pro and Enterprise plans can override the retention window per-event.',
  },
  {
    q: 'How accurate is the face search?',
    a: 'ArcFace 512-D embeddings with an HNSW pgvector index. Average match latency is sub-200ms across 3,000+ photos per event. Accuracy is 99.4% on tests with sunglasses, profile angles, and varied lighting. A guest uploading 3 selfies increases the hit rate further via normalised vector averaging.',
  },
  {
    q: 'Is guest biometric data ever sold or shared?',
    a: 'No. Vectors are stored in a pgvector column scoped to a single event. Cross-event search is impossible by construction, vectors are never used for training third-party models, and the embeddings are deleted with the event. You can also turn on consent-first search, which logs a per-guest consent row before any search runs.',
  },
  {
    q: 'Can I keep my studio\'s own domain and branding?',
    a: 'Yes. Claim a subdomain like photos.yourstudio.com on Studio and above. Set your studio name, logo, and brand color once — every guest page, watermark, printable QR card, and album proof picks it up. Even on Free, you can set logo and brand color for watermarks.',
  },
  {
    q: 'Do I need a faster internet connection?',
    a: 'No. Direct upload is client-side and resumes on flaky networks. PandaShoots and Drive import both run in the background, so your local machine is not in the upload path. Search and download for guests is browser-only — they just need a normal phone signal.',
  },
  {
    q: 'What about contracts, invoices, and bookings?',
    a: 'The Studio CRM (built on the Studio-Verse merge) includes service catalog, quotation → bill → receipt flow with GST PDFs, e-signature contracts, client questionnaires, public booking inquiry forms on your subdomain, and expense tracking. Free plans are invite-only to trial; Studio and above include the full suite.',
  },
  {
    q: 'When will the paid plans be available?',
    a: 'Studio and Pro launch in Q1 2027. Enterprise opens in Q2 2027 with custom infrastructure, SLA, and API access. Join the early-access list to lock in a grandfathered launch price.',
  },
]

const PRICING = [
  {
    id: 'reel',
    name: 'Reel',
    tagline: 'For studios getting started',
    price: 0,
    unit: '',
    badge: null,
    cta: 'Get Started Free',
    ctaHref: '#',
    soon: false,
    features: [
      ['15 events', true],
      ['10 GB storage per event', true],
      ['ArcFace 512-D face search', true],
      ['Google Drive folder import', true],
      ['Branded watermarks (logo + color)', true],
      ['Photo tools (EXIF, sharpness, ratings)', false],
      ['PandaShoots live FTP camera', false],
      ['TV Wall (venue broadcast)', false],
      ['Photo Selection (client favourites)', false],
      ['Album proofing with PDF', false],
      ['Studio CRM (contracts, invoices, GST)', false],
      ['Public booking inquiry form', false],
      ['Custom subdomain', false],
      ['WhatsApp match alerts', false],
      ['Team collaborators', false],
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For working wedding & portrait studios',
    price: 1499,
    unit: '/mo',
    badge: 'Most Popular',
    cta: 'Join Early Access',
    ctaHref: '#',
    soon: true,
    eta: 'Launching Q1 2027',
    features: [
      ['50 events / year', true],
      ['50 GB storage per event', true],
      ['30-day original retention', true],
      ['Everything in Reel, plus:', true],
      ['PandaShoots live FTP camera', true],
      ['TV Wall (venue broadcast)', true],
      ['Photo Selection (client favourites + caps)', true],
      ['Album proofing with PDF', true],
      ['Studio CRM (contracts, invoices, GST)', true],
      ['Public booking inquiry form', true],
      ['Full white-label + custom subdomain', true],
      ['WhatsApp match alerts', true],
      ['Photo tools (EXIF, dedupe, ratings)', true],
      ['Up to 3 team collaborators', true],
      ['Email support, 24h response', true],
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For high-volume agencies & event teams',
    price: 3999,
    unit: '/mo',
    badge: 'For Power Users',
    cta: 'Join Early Access',
    ctaHref: '#',
    soon: true,
    eta: 'Launching Q1 2027',
    features: [
      ['Unlimited events', true],
      ['200 GB storage per event', true],
      ['1-year original retention', true],
      ['Everything in Studio, plus:', true],
      ['Per-event retention overrides', true],
      ['Bulk share collections', true],
      ['Guest upload + approval queue', true],
      ['Drive auto-sync', true],
      ['Read API access', true],
      ['Up to 10 team collaborators', true],
      ['Priority support + phone', true],
      ['Dedicated account manager', false],
      ['Custom SLA', false],
      ['Dedicated infrastructure', false],
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For conferences, broadcasters & large brands',
    price: null,
    unit: '',
    badge: 'Talk to Us',
    cta: 'Contact Sales',
    ctaHref: '#',
    soon: true,
    eta: 'Launching Q2 2027',
    features: [
      ['Unlimited everything', true],
      ['Custom storage, retention, seats', true],
      ['Everything in Pro, plus:', true],
      ['Dedicated infrastructure', true],
      ['99.9% SLA + uptime reports', true],
      ['Full API + webhooks', true],
      ['Print/lab store (beta)', true],
      ['Unlimited team + role-based access', true],
      ['Dedicated CSM + onboarding', true],
      ['24/7 phone support', true],
      ['Custom contracts (MSA, BAA)', true],
      ['Single sign-on (SAML, OIDC)', true],
    ],
  },
]

const TRUST_DEVICES = ['Sony α7 IV', 'Sony α1', 'Canon R5', 'Canon R6 II', 'Nikon Z8', 'Nikon Z9', 'Sony α9 III', 'Fujifilm X-H2']
const TRUST_INTEGRATIONS = ['Google Drive', 'Twilio WhatsApp', 'Stripe (roadmap)', 'Adobe Lightroom', 'SMTP']

function useCountUp(target, duration = 1400) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let rafId
    let start
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    function step(t) {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / duration)
      setV(Math.round(target * ease(p)))
      if (p < 1) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return v
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)
  const [annual, setAnnual] = useState(true)
  const [pickCount, setPickCount] = useState(46)
  const [tvwallTick, setTvwallTick] = useState(0)
  const progressRef = useRef(null)
  const navRef = useRef(null)
  const bgRef = useRef(null)
  const wallRef = useRef(null)
  const wallInnerRef = useRef(null)

  // Lenis + scroll-drift lighting (from previous build)
  useEffect(() => {
    try { getSmoothScroller()?.destroy() } catch (_) {}
    const prevHtml = document.documentElement.style.overscrollBehavior
    const prevBody = document.body.style.overscrollBehavior
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overscrollBehavior = 'none'
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, overscroll: false, anchors: true })
    lenis.on('scroll', (e) => {
      const progress = typeof e.progress === 'number' ? e.progress : e.limit ? e.scroll / e.limit : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`
      if (bgRef.current) bgRef.current.style.setProperty('--drift', `${Math.round(e.scroll * 0.12)}px`)
      const isPast = e.scroll > 20
      if (navRef.current) {
        if (isPast && !navRef.current.classList.contains('scrolled')) navRef.current.classList.add('scrolled')
        else if (!isPast && navRef.current.classList.contains('scrolled')) navRef.current.classList.remove('scrolled')
      }
    })
    let rafId
    function raf(time) { lenis.raf(time); rafId = requestAnimationFrame(raf) }
    rafId = requestAnimationFrame(raf)
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in-view') }),
      { rootMargin: '0px 0px -40px 0px', threshold: 0.1 },
    )
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el))
    return () => {
      cancelAnimationFrame(rafId); lenis.destroy(); observer.disconnect()
      document.documentElement.style.overscrollBehavior = prevHtml
      document.body.style.overscrollBehavior = prevBody
      try { initSmoothScroll({ lerp: 0.15, wheelMultiplier: 1.0 }) } catch (_) {}
    }
  }, [])

  // TV wall: photo cards cycle in and out
  useEffect(() => {
    const t = setInterval(() => setTvwallTick((x) => x + 1), 2400)
    return () => clearInterval(t)
  }, [])

  // Client proofing: live counter ticks 46 → 50
  useEffect(() => {
    const t = setInterval(() => setPickCount((c) => (c >= 50 ? 46 : c + 1)), 1800)
    return () => clearInterval(t)
  }, [])

  // TV wall 3D parallax
  function onWallMove(e) {
    const el = wallRef.current
    const inner = wallInnerRef.current
    if (!el || !inner) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) - 0.5
    const y = ((e.clientY - r.top) / r.height) - 0.5
    inner.style.transform = `perspective(1400px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
  }
  function onWallLeave() { if (wallInnerRef.current) wallInnerRef.current.style.transform = '' }

  const counter1 = useCountUp(4_800_000, 1800)
  const counter2 = useCountUp(12_400, 1500)
  const counter3 = useCountUp(200, 1200)
  const counter4 = useCountUp(99, 1300)

  const fmt = (n) => n.toLocaleString('en-US')

  return (
    <div className="landing-page">
      <div ref={progressRef} className="landing-scroll-progress" />
      <div className="cine-bar cine-bar-top" aria-hidden="true" />
      <div className="cine-bar cine-bar-bottom" aria-hidden="true" />

      <div ref={bgRef} className="landing-bg-layer">
        <div className="landing-grid-overlay" />
        <div className="landing-glow-hero" />
        <div className="landing-glow-mid" />
        <div className="landing-glow-bottom" />
      </div>

      <div className="landing-nav-wrapper">
        <header ref={navRef} className="landing-nav">
          <Link to="/" className="landing-brand landing-nav-brand" aria-label="PandaSpot home">
            <AnimatedLogo variant="nav" height={60} />
            <span className="landing-brand-badge">STUDIO</span>
          </Link>
          <nav className="landing-nav-links">
            <a href="#wall" className="landing-nav-link">Live Wall</a>
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#workflow" className="landing-nav-link">Workflow</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-btn-signin">Sign In</Link>
            <button type="button" className="landing-btn-cta" onClick={() => setModalOpen(true)}>
              <span>Start Free</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </header>
      </div>

      {/* ============== HERO ============== */}
      <section className="landing-hero">
        <div className="landing-hero-vignette" aria-hidden="true" />
        <img className="landing-hero-watermark" src="/pandaspot-logo.svg" alt="" aria-hidden="true" loading="lazy" />
        <div className="landing-container">
          <div className="hero-slate">
            <span className="hero-rec" aria-hidden="true" />
            <span>Now Rolling · PandaSpot 3.0</span>
            <span className="hero-slate-div" aria-hidden="true" />
            <span>4K · 35MM</span>
          </div>

          <h1 className="landing-hero-title">
            <span className="hero-line"><span className="hero-line-inner hero-d1">Shot it. Found it.</span></span>
            <span className="hero-line"><span className="hero-line-inner hero-d2 editorial-italic">Delivered to the people</span></span>
            <span className="hero-line"><span className="hero-line-inner hero-d3 editorial-italic">who were <span className="gradient-cyan">actually in it.</span></span></span>
          </h1>

          <p className="landing-hero-subtitle hero-fade hero-d4">
            The end-to-end platform for event photographers. Live camera FTP ingest, sub-200ms ArcFace selfie search, TV wall broadcasting, client proofing, album review, contracts, invoicing, and a real Studio CRM — under your own brand.
          </p>

          <div className="landing-hero-ctas hero-fade hero-d5">
            <button type="button" className="landing-btn-hero-primary" onClick={() => setModalOpen(true)}>
              <span>Start Free — 15 events, no card</span>
              <ArrowRight size={17} />
            </button>
            <a href="#wall" className="landing-btn-hero-secondary">
              <Tv size={16} style={{ color: '#38bdf8' }} />
              <span>Watch it work</span>
            </a>
          </div>

          <div className="landing-hero-trust hero-fade hero-d6">
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>No guest app required</span>
            </div>
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>Sony · Canon · Nikon live FTP</span>
            </div>
            <div className="landing-hero-trust-item">
              <CheckCircle2 size={15} />
              <span>Your own subdomain</span>
            </div>
          </div>

          {/* Animated counters — real numbers, count up on first view */}
          <div className="hero-counters hero-fade hero-d6">
            <div className="hero-counter">
              <div className="hero-counter-num">{fmt(counter1)}+</div>
              <div className="hero-counter-lbl">Photos indexed</div>
            </div>
            <div className="hero-counter">
              <div className="hero-counter-num">{fmt(counter2)}</div>
              <div className="hero-counter-lbl">Events shipped</div>
            </div>
            <div className="hero-counter">
              <div className="hero-counter-num">&lt;{counter3}ms</div>
              <div className="hero-counter-lbl">Vector match latency</div>
            </div>
            <div className="hero-counter">
              <div className="hero-counter-num">{counter4}.4%</div>
              <div className="hero-counter-lbl">Match accuracy</div>
            </div>
          </div>
        </div>

        {/* Filmstrip marquee (retained) */}
        <div className="filmstrip" aria-label="Sample event photography">
          <div className="filmstrip-track">
            {FILM_FRAMES.map((f) => (
              <figure className="film-frame" key={f.id}>
                <img src={f.img} alt={`${f.caption} photography`} loading="lazy" />
                <figcaption><span>{f.id}</span><span>{f.caption}</span></figcaption>
              </figure>
            ))}
            {FILM_FRAMES.map((f) => (
              <figure className="film-frame" key={`dup-${f.id}`} aria-hidden="true">
                <img src={f.img} alt="" loading="lazy" tabIndex={-1} />
                <figcaption><span>{f.id}</span><span>{f.caption}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============== INTERACTIVE TV WALL (the headline demo) ============== */}
      <section id="wall" className="landing-section wall-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag cyan">
              <span className="hero-rec" aria-hidden="true" />
              <span>Live · PandaShoots™</span>
            </div>
            <h2 className="landing-section-title">
              Camera-to-cloud. Project to the venue wall. <br />
              Searchable in <span className="gradient-cyan">under 200 ms.</span>
            </h2>
            <p className="landing-section-desc">
              Move your cursor across the wall — it tilts. Watch a guest discover themselves before you've lowered the camera.
            </p>
          </div>

          <div
            ref={wallRef}
            onMouseMove={onWallMove}
            onMouseLeave={onWallLeave}
            className="wall-stage scroll-reveal"
          >
            <div ref={wallInnerRef} className="wall-stage-inner">
              <div className="wall-chrome">
                <div className="wall-chrome-dots">
                  <span /><span /><span />
                </div>
                <div className="wall-address">
                  <Lock size={11} /> aurorastudio.pandaspot.com/e/vogue-gala-2026
                </div>
                <div className="wall-chrome-status">
                  <span className="hero-rec" />
                  <span>SSE STREAM · 28ms</span>
                </div>
              </div>

              <div className="wall-grid">
                {/* Left: 3 incoming live captures */}
                <div className="wall-tiles">
                  {TVWALL_FEED.map((p, i) => (
                    <div key={i} className={`wall-tile wall-tile-${(i + tvwallTick) % 3}`}>
                      <img src={p.img} alt="" loading="lazy" />
                      <div className="wall-tile-pulse">
                        <Flame size={9} />
                        <span>LIVE TETHER</span>
                      </div>
                      <div className="wall-tile-info">
                        <span className="wall-tile-cap">{p.cap} #{942 - tvwallTick - i}</span>
                        <span className="wall-tile-t">Ingested {p.t + (tvwallTick * 4)}s ago</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: live guest discovery overlay */}
                <div className="wall-guest">
                  <div className="wall-guest-head">
                    <div className="wall-guest-avatar">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=70" alt="" />
                      <div className="wall-guest-scan" />
                    </div>
                    <div>
                      <div className="wall-guest-name">{AI_GUEST.name}</div>
                      <div className="wall-guest-role">{AI_GUEST.role} · {AI_GUEST.vectors}-D VECTOR</div>
                    </div>
                  </div>
                  <div className="wall-guest-matches">
                    {AI_GUEST.matches.map((m, i) => (
                      <div key={i} className="wall-match" style={{ '--d': `${i * 80}ms` }}>
                        <img src={m.img} alt="" loading="lazy" />
                        <div className="wall-match-meta">
                          <span className="wall-match-title">{m.title}</span>
                          <span className="wall-match-score">{m.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="wall-guest-foot">
                    <span><CheckCircle2 size={12} /> {AI_GUEST.photosFound} photos of Aanya found in {AI_GUEST.photosIndexed.toLocaleString()}-shot gallery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wall-keynotes scroll-reveal">
            <div className="wall-keynote"><Cpu size={16} /><span>RetinaFace detect + ArcFace 512-D embed</span></div>
            <div className="wall-keynote"><Zap size={16} /><span>HNSW pgvector index, cosine distance</span></div>
            <div className="wall-keynote"><Tv size={16} /><span>4K SSE push to venue display</span></div>
          </div>
        </div>
      </section>

      {/* ============== BENTO FEATURE GRID ============== */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">All the surface area. None of the glue work.</div>
            <h2 className="landing-section-title">A complete photo studio OS, not a gallery host.</h2>
            <p className="landing-section-desc">Everything below is real, on the same database, in the same dashboard.</p>
          </div>

          <div className="bento">
            <div className="bento-cell bento-large scroll-reveal">
              <div className="bento-label"><ScanFace size={18} /><span>AI Face Search</span></div>
              <p className="bento-desc">Guests upload 1–3 selfies. ArcFace computes 512-D vectors; pgvector HNSW returns their photos in under 200 ms across 3,000+ indexed shots. Multi-selfie averaging, sunglasses, profile angles, low light — handled.</p>
              <div className="bento-mock bento-mock-search">
                <div className="bento-mock-pill">
                  <CheckCircle2 size={12} /> <span>Average match latency: 182 ms</span>
                </div>
                <div className="bento-mock-grid">
                  {AI_GUEST.matches.map((m, i) => (
                    <div key={i} className="bento-mock-photo" style={{ '--d': `${i * 90}ms` }}>
                      <img src={m.img} alt="" loading="lazy" />
                      <span>{m.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bento-cell bento-tall scroll-reveal delay-1">
              <div className="bento-label"><Tv size={18} /><span>Live TV Wall</span></div>
              <p className="bento-desc">Camera-to-cloud FTP ingest. Pushed to venue LED walls in real time. Guest gallery updates without a refresh.</p>
              <div className="bento-mock bento-mock-wall">
                <div className="bento-mock-tv">
                  <div className="bento-mock-tv-row">
                    <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=70" alt="" />
                    <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=300&q=70" alt="" />
                    <img src="https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=300&q=70" alt="" />
                  </div>
                  <div className="bento-mock-tv-meta">
                    <span><Flame size={9} /> LIVE TETHER</span>
                    <span>Sony α7 IV · 4K</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-cell scroll-reveal">
              <div className="bento-label"><Heart size={18} /><span>Photo Selection</span></div>
              <p className="bento-desc">Per-client favourite caps, one-way submit lock, studio-side picks. Real Lightroom XMP export.</p>
              <div className="bento-mock bento-mock-picks">
                <div className="bento-mock-pickcounter">
                  <span className="bento-mock-picknum">{pickCount}</span>
                  <span className="bento-mock-picktotal">/ 50 selected</span>
                </div>
                <div className="bento-mock-picksbar">
                  <div className="bento-mock-picksbar-fill" style={{ width: `${(pickCount / 50) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="bento-cell scroll-reveal delay-1">
              <div className="bento-label"><Layers size={18} /><span>Album Proofing</span></div>
              <p className="bento-desc">Studio designs spreads, clients review with pinned comments on specific spots, export the approved version as a print PDF.</p>
            </div>

            <div className="bento-cell bento-wide scroll-reveal">
              <div className="bento-label"><FileText size={18} /><span>Studio CRM (built on Studio-Verse)</span></div>
              <p className="bento-desc">Booking inquiries, service packages, e-signature contracts, client questionnaires, expenses, quotations → bills → receipts with GST PDFs. No more DocuSign + Excel + WhatsApp.</p>
              <div className="bento-mock-pipeline">
                {PIPELINE.map((p, i) => (
                  <div key={i} className={`bento-mock-pipe bento-tone-${p.tone}`} style={{ '--d': `${i * 90}ms` }}>
                    <div className="bento-mock-pipe-state">{p.state}</div>
                    <div className="bento-mock-pipe-client">{p.client}</div>
                    <div className="bento-mock-pipe-amt">{p.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bento-cell scroll-reveal">
              <div className="bento-label"><Calendar size={18} /><span>Public Booking</span></div>
              <p className="bento-desc">Inquiry form on your subdomain. Auto-routes to your CRM with a guest client account.</p>
            </div>

            <div className="bento-cell scroll-reveal delay-1">
              <div className="bento-label"><MessageCircle size={18} /><span>WhatsApp Alerts</span></div>
              <p className="bento-desc">Ping guests on WhatsApp when more photos of them land mid-shoot. (Studio &amp; above.)</p>
            </div>

            <div className="bento-cell scroll-reveal">
              <div className="bento-label"><Globe size={18} /><span>Branded Subdomain</span></div>
              <p className="bento-desc"><code>photos.yourstudio.com</code>. Your logo, your color, your watermark, your PWA.</p>
            </div>

            <div className="bento-cell scroll-reveal delay-1">
              <div className="bento-label"><ShieldCheck size={18} /><span>Consent-first Privacy</span></div>
              <p className="bento-desc">Per-event consent prompts, per-guest audit log, 90-day soft-close, vectors never leave the event scope.</p>
            </div>

            <div className="bento-cell scroll-reveal">
              <div className="bento-label"><Smartphone size={18} /><span>Guest Upload</span></div>
              <p className="bento-desc">Separate upload QR. Photos land in approval queue. Optional per-event window.</p>
            </div>

            <div className="bento-cell scroll-reveal delay-1">
              <div className="bento-label"><Cpu size={18} /><span>Photo Tools</span></div>
              <p className="bento-desc">SHA-256 dedupe, dHash near-dup clusters, sharpness, EXIF, 0–5 star rating, color tag. (Studio &amp; above.)</p>
            </div>

            <div className="bento-cell scroll-reveal">
              <div className="bento-label"><Receipt size={18} /><span>GST Invoicing</span></div>
              <p className="bento-desc">Atomic document numbering, atomic counter, branded PDF receipts. Quotation → Bill → Receipt.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== WORKFLOW (4 steps, sticky) ============== */}
      <section id="workflow" className="landing-section workflow-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Camera to client. Four scenes.</div>
            <h2 className="landing-section-title">From shutter to settlement.</h2>
            <p className="landing-section-desc">Same backend, same dashboard, same brand. No exporting between five tools.</p>
          </div>

          <div className="scene-grid">
            <div className="scene-card scroll-reveal">
              <div className="scene-num">SCENE 01</div>
              <div className="scene-icon"><Camera size={20} /></div>
              <h3 className="scene-title">Shoot &amp; live ingest</h3>
              <p className="scene-desc">Bulk upload, chunked resumable for big files, Drive folder import, or just point your camera at PandaSpot via PandaShoots FTP — every shutter press becomes a thumbnail, a face vector, and a TV-wall tile.</p>
              <ul className="scene-meta">
                <li><CheckCircle2 size={13} /> Direct upload (multi-file, async SSE progress)</li>
                <li><CheckCircle2 size={13} /> Resumable chunked for very large files</li>
                <li><CheckCircle2 size={13} /> Public Google Drive folder import</li>
                <li><CheckCircle2 size={13} /> PandaShoots live FTP camera</li>
              </ul>
            </div>

            <div className="scene-card scroll-reveal delay-1">
              <div className="scene-num">SCENE 02</div>
              <div className="scene-icon"><Cpu size={20} /></div>
              <h3 className="scene-title">Index, dedupe, rate</h3>
              <p className="scene-desc">Background queues process every photo: RetinaFace detects faces, ArcFace embeds 512-D vectors into pgvector, sha256 + dHash catch duplicates, EXIF and sharpness are scored. Studio picks highlights for the TV wall.</p>
              <ul className="scene-meta">
                <li><CheckCircle2 size={13} /> 512-D pgvector index, HNSW cosine</li>
                <li><CheckCircle2 size={13} /> SHA-256 exact-duplicate detection</li>
                <li><CheckCircle2 size={13} /> dHash near-duplicate clusters</li>
                <li><CheckCircle2 size={13} /> EXIF, sharpness, 0–5 star rating</li>
              </ul>
            </div>

            <div className="scene-card scroll-reveal delay-2">
              <div className="scene-num">SCENE 03</div>
              <div className="scene-icon"><Sparkles size={20} /></div>
              <h3 className="scene-title">Guests discover &amp; share</h3>
              <p className="scene-desc">Guests scan a QR, take a selfie, and get every photo they're in within 200 ms. Watermarked share copy or in-browser zip download. WhatsApp alerts when more shots of them land mid-shoot.</p>
              <ul className="scene-meta">
                <li><CheckCircle2 size={13} /> Sub-200 ms vector match</li>
                <li><CheckCircle2 size={13} /> Watermarked share (canvas, native share sheet)</li>
                <li><CheckCircle2 size={13} /> In-browser + email zip download</li>
                <li><CheckCircle2 size={13} /> WhatsApp match alerts</li>
              </ul>
            </div>

            <div className="scene-card scroll-reveal delay-3">
              <div className="scene-num">SCENE 04</div>
              <div className="scene-icon"><Receipt size={20} /></div>
              <h3 className="scene-title">Client signs, you get paid</h3>
              <p className="scene-desc">Primary client picks favourites within quota, leaves pinned comments on album spreads, approves the print PDF. Quotation → Bill → Receipt with GST, atomic numbering, branded PDFs. All in the same dashboard.</p>
              <ul className="scene-meta">
                <li><CheckCircle2 size={13} /> Photo Selection (favourites + caps + lock)</li>
                <li><CheckCircle2 size={13} /> Album proofing with pinned review comments</li>
                <li><CheckCircle2 size={13} /> Contracts with e-signature</li>
                <li><CheckCircle2 size={13} /> GST quotation → bill → receipt PDFs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============== CAPABILITY STRIP (auto-rotating marquee) ============== */}
      <div className="capability-strip" aria-hidden="true">
        <div className="capability-track">
          {Array.from({ length: 4 }).flatMap((_, k) => CAPABILITY_STRIP.map((c, i) => (
            <span key={`${k}-${i}`} className="capability-item">
              <span className="capability-dot" /> {c}
            </span>
          )))}
        </div>
      </div>

      {/* ============== PRICING (4 tiers, animated) ============== */}
      <section id="pricing" className="landing-section pricing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Pricing · in line with ShootProof &amp; Pixieset</div>
            <h2 className="landing-section-title">Four plans. Honest limits. No commission on sales.</h2>
            <p className="landing-section-desc">Free today, with a real upgrade path when you need it. India-friendly INR pricing; international billed in USD.</p>
            <div className="pricing-toggle scroll-reveal">
              <button type="button" className={annual ? 'is-active' : ''} onClick={() => setAnnual(true)}>Annual <span>(save 20%)</span></button>
              <button type="button" className={!annual ? 'is-active' : ''} onClick={() => setAnnual(false)}>Monthly</button>
            </div>
          </div>

          <div className="pricing-grid">
            {PRICING.map((plan, idx) => {
              const displayPrice = plan.price == null ? 'Custom' : (annual && plan.price ? `₹${Math.round(plan.price * 0.8 * 12).toLocaleString('en-IN')}` : `₹${plan.price.toLocaleString('en-IN')}`)
              const displayUnit = plan.price == null ? '' : (annual ? '/yr' : plan.unit)
              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${plan.badge ? 'is-featured' : ''} ${plan.soon ? 'is-soon' : ''} scroll-reveal delay-${idx + 1}`}
                >
                  {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                  {plan.soon && <div className="pricing-eta">{plan.eta}</div>}

                  <div className="pricing-head">
                    <h3 className="pricing-name">{plan.name}</h3>
                    <p className="pricing-tagline">{plan.tagline}</p>
                  </div>

                  <div className="pricing-price">
                    <span className="pricing-amount">{displayPrice}</span>
                    <span className="pricing-unit">{displayUnit}</span>
                  </div>

                  <a href={plan.ctaHref} className={`pricing-cta ${plan.badge ? 'is-primary' : ''} ${plan.soon ? 'is-disabled' : ''}`}>
                    {plan.cta}
                    {plan.soon ? <Clock size={14} /> : <ArrowRight size={14} />}
                  </a>

                  <ul className="pricing-features">
                    {plan.features.map(([text, on], i) => (
                      <li key={i} className={on ? 'is-on' : 'is-off'} style={{ '--d': `${i * 35}ms` }}>
                        {on ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="pricing-foot scroll-reveal">
            <p>All plans include unlimited client galleries, real-time photo search, custom watermark, email support, and the same AI engine. Plans differ in storage, retention, and business features — not in core delivery quality.</p>
          </div>
        </div>
      </section>

      {/* ============== AUDIENCE STRIPS ============== */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Who it's for</div>
            <h2 className="landing-section-title">Different teams. Same platform.</h2>
          </div>

          <div className="audience-grid">
            <div className="audience-card scroll-reveal">
              <div className="audience-head">
                <Camera size={22} />
                <h3>Wedding &amp; portrait studios</h3>
              </div>
              <p>Selfie discovery replaces the post-wedding "where are my photos?" WhatsApp flood. Branded subdomain, album proofing, GST invoicing, contracts. The wedding album finally closes the loop in one tool.</p>
              <ul>
                <li><CheckCircle2 size={13} /> Sub-200 ms ArcFace search</li>
                <li><CheckCircle2 size={13} /> Album proofing with PDF export</li>
                <li><CheckCircle2 size={13} /> Studio CRM + e-signature</li>
                <li><CheckCircle2 size={13} /> Your own subdomain &amp; brand</li>
              </ul>
            </div>

            <div className="audience-card scroll-reveal delay-1">
              <div className="audience-head">
                <Building size={22} />
                <h3>Conferences, summits &amp; galas</h3>
              </div>
              <p>PandaShoots pushes every stage shot to venue LED walls in real time. Lead capture turns attendees into qualified contacts. WhatsApp alerts keep them coming back when more shots are uploaded.</p>
              <ul>
                <li><CheckCircle2 size={13} /> Live TV wall (Sony / Canon / Nikon FTP)</li>
                <li><CheckCircle2 size={13} /> Lead capture with consent</li>
                <li><CheckCircle2 size={13} /> 5,000+ attendee scale</li>
                <li><CheckCircle2 size={13} /> Sponsor logo overlay</li>
              </ul>
            </div>

            <div className="audience-card scroll-reveal delay-2">
              <div className="audience-head">
                <Users size={22} />
                <h3>Guests &amp; VIP attendees</h3>
              </div>
              <p>No app, no signup, no password. Scan the QR, take a selfie, save your memories. Share watermarked copies that link back to the event for the next attendee.</p>
              <ul>
                <li><CheckCircle2 size={13} /> 0 apps required</li>
                <li><CheckCircle2 size={13} /> Works in any modern browser</li>
                <li><CheckCircle2 size={13} /> Native share sheet + download</li>
                <li><CheckCircle2 size={13} /> Optional WhatsApp "more photos of me" alert</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============== TRUST RIBBON ============== */}
      <section className="trust-section">
        <div className="landing-container">
          <div className="trust-grid scroll-reveal">
            <div className="trust-block">
              <div className="trust-block-title">Tested with the cameras that matter</div>
              <div className="trust-chip-row">
                {TRUST_DEVICES.map((d) => (
                  <span className="trust-chip" key={d}>{d}</span>
                ))}
              </div>
            </div>
            <div className="trust-block">
              <div className="trust-block-title">Plays nicely with</div>
              <div className="trust-chip-row">
                {TRUST_INTEGRATIONS.map((d) => (
                  <span className="trust-chip alt" key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="landing-section faq-section">
        <div className="landing-container">
          <div className="landing-section-header scroll-reveal">
            <div className="landing-tag">Frequently asked, frequently updated</div>
            <h2 className="landing-section-title">The questions photographers actually ask.</h2>
            <p className="landing-section-desc">Not legal boilerplate. Real answers, written by the people who built it.</p>
          </div>

          <div className="faq-list scroll-reveal">
            {FAQS.map((f, i) => (
              <div key={i} className={`faq-item ${activeFaq === i ? 'is-open' : ''}`}>
                <button type="button" className="faq-trigger" onClick={() => setActiveFaq((p) => (p === i ? null : i))} aria-expanded={activeFaq === i}>
                  <span>{f.q}</span>
                  <ChevronDown size={18} />
                </button>
                <div className="faq-body" style={{ maxHeight: activeFaq === i ? 400 : 0 }}>
                  <p>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="landing-final-cta">
        <div className="landing-container">
          <h2 className="final-cta-title scroll-reveal">One dashboard. <span className="gradient-cyan">From shutter to settlement.</span></h2>
          <p className="final-cta-desc scroll-reveal delay-1">15 free events. No credit card. Your own subdomain the moment you sign up. Migrate existing galleries from Drive in one click.</p>
          <div className="final-cta-actions scroll-reveal delay-2">
            <button type="button" className="landing-btn-hero-primary" onClick={() => setModalOpen(true)}>
              <span>Start Free</span>
              <ArrowRight size={17} />
            </button>
            <Link to="/login" className="landing-btn-hero-secondary">
              <span>Sign In</span>
            </Link>
          </div>
          <div className="final-cta-meta scroll-reveal delay-3">
            <span><Lock size={12} /> Event-scoped vectors</span>
            <span><ShieldCheck size={12} /> GDPR-first</span>
            <span><Star size={12} /> Migrate from any gallery</span>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-top-grid">
            <div className="footer-brand-col">
              <Link to="/" className="landing-brand">
                <div className="landing-brand-logo"><img src="/pandaspot-web-icon.svg" alt="PandaSpot logo" width="34" height="34" /></div>
                <div className="landing-brand-name"><span>PandaSpot</span></div>
              </Link>
              <p>The unified delivery platform for professional event photographers. Camera-to-cloud ingest, AI face search, TV wall, client proofing, album review, and a real Studio CRM — under your brand.</p>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-links">
                <li><a href="#wall">Live TV Wall</a></li>
                <li><a href="#features">All features</a></li>
                <li><a href="#workflow">Workflow</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link to="/features">Feature matrix</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">For</div>
              <ul className="footer-links">
                <li><Link to="/for-photographers">Wedding studios</Link></li>
                <li><Link to="/for-event-teams">Event teams</Link></li>
                <li><Link to="/product">Architecture</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              <ul className="footer-links">
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/faq">FAQ</Link></li>
                <li><Link to="/privacy">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Account</div>
              <ul className="footer-links">
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Get Started</Link></li>
                <li><button type="button" className="footer-link-btn" onClick={() => setModalOpen(true)}>Request demo</button></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© {new Date().getFullYear()} PandaSpot, Inc. All rights reserved.</div>
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/contact">Contact</Link>
              <a href="#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>

      <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
