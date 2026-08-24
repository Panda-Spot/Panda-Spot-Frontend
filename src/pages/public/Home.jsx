import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Camera,
  Users,
  ShieldCheck,
  Building,
  Layers,
  Search,
  Download,
  Share2,
  FileText
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'
import HeroInteractiveDemo from '../../components/public/HeroInteractiveDemo.jsx'
import WorkflowInteractiveStepper from '../../components/public/WorkflowInteractiveStepper.jsx'
import FAQAccordion from '../../components/public/FAQAccordion.jsx'
import { initSmoothScroll } from '../../lib/lenisSmoothScroll.js'
import { initScrollAnimations } from '../../lib/scrollAnimations.js'

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inlineForm, setInlineForm] = useState({
    name: '',
    email: '',
    company: '',
    role: 'photographer',
    message: ''
  })
  const [inlineSubmitted, setInlineSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const scroller = initSmoothScroll({ lerp: 0.085 })
    const cleanupAnim = initScrollAnimations()
    return () => {
      cleanupAnim?.()
      scroller?.destroy()
    }
  }, [])

  const handleInlineSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setInlineSubmitted(true)
    }, 600)
  }

  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      {/* ===================================================================
          1. HERO SECTION (Section 21)
          =================================================================== */}
      <section className="marketing-hero">
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Sparkles size={15} />
              <span>Event Photo Delivery & Discovery SaaS</span>
            </div>

            <h1 className="marketing-hero-title">
              Thousands of event photos. <span>Make the right ones easier to find.</span>
            </h1>

            <p className="marketing-hero-subtitle">
              PandaSpot helps photographers and event teams turn large photo collections into a searchable, branded delivery experience — so guests discover the moments they are in without hunting through everything.
            </p>

            <div className="marketing-hero-ctas">
              <button
                type="button"
                className="marketing-btn marketing-btn-primary marketing-btn-lg"
                onClick={openEarlyAccess}
              >
                <span>Request Early Access</span>
                <ArrowRight size={18} />
              </button>

              <a
                href="#how-it-works"
                className="marketing-btn marketing-btn-secondary marketing-btn-lg"
              >
                <span>See How It Works</span>
              </a>
            </div>

            <div className="marketing-hero-trust-tag">
              Built specifically for professional event workflows • No guest app download required
            </div>
          </div>

          {/* Dual-View Showcase Anchor */}
          <HeroInteractiveDemo />
        </div>
      </section>

      {/* ===================================================================
          2. PROBLEM DEFINITION: The Old Way vs The PandaSpot Way (Section 8)
          =================================================================== */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Problem & Solution</div>
            <h2 className="marketing-section-title">
              The photos are captured. The hard part is finding and delivering them.
            </h2>
            <p className="marketing-section-desc">
              A single event can produce thousands of images. Sharing a generic folder or sending files one by one does not answer the real question: <em>"How does each person quickly find the photos they care about?"</em>
            </p>
          </div>

          <div className="marketing-comparison-grid">
            {/* The Old Way */}
            <div className="comparison-card comparison-card-old">
              <span className="comparison-card-tag comparison-tag-old">The Old Delivery Way</span>
              <h3 className="comparison-card-title">Storage-Optimized, High Friction</h3>
              <ul className="comparison-list">
                <li>
                  <XCircle size={18} className="comparison-icon-bad" />
                  <span><strong>Giant Drive Folders:</strong> Guests face an unsorted wall of 2,500+ photos with no easy way to find themselves.</span>
                </li>
                <li>
                  <XCircle size={18} className="comparison-icon-bad" />
                  <span><strong>Repetitive Support:</strong> Endless WhatsApp messages and DMs asking "Can you send my ceremony shots again?"</span>
                </li>
                <li>
                  <XCircle size={18} className="comparison-icon-bad" />
                  <span><strong>Brand Leakage:</strong> Generic file host links surface third-party storage interfaces instead of your photography studio.</span>
                </li>
                <li>
                  <XCircle size={18} className="comparison-icon-bad" />
                  <span><strong>Manual Tagging Pain:</strong> Tagging hundreds of guests by hand is impossible as event size scales up.</span>
                </li>
              </ul>
            </div>

            {/* The PandaSpot Way */}
            <div className="comparison-card comparison-card-new">
              <span className="comparison-card-tag comparison-tag-new">The PandaSpot Way</span>
              <h3 className="comparison-card-title">Discovery-First, Branded Experience</h3>
              <ul className="comparison-list">
                <li>
                  <CheckCircle2 size={18} className="comparison-icon-good" />
                  <span><strong>Selfie Search:</strong> Guests upload 1–3 selfies and instantly receive every photo they appear in.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="comparison-icon-good" />
                  <span><strong>Frictionless Entry:</strong> QR table cards and clean web links with zero app downloads or accounts required.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="comparison-icon-good" />
                  <span><strong>Custom Studio Branding:</strong> Your logo, colors, and watermarked sharing keep your business front and center.</span>
                </li>
                <li>
                  <CheckCircle2 size={18} className="comparison-icon-good" />
                  <span><strong>Organized Control:</strong> 90-day clean soft-close, team assistant access, and real-time search analytics.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. 6-STAGE INTERACTIVE WORKFLOW DEMO (Section 10 & 11)
          =================================================================== */}
      <section id="how-it-works" className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">System Workflow</div>
            <h2 className="marketing-section-title">
              Watch a photo collection become a delivery experience.
            </h2>
            <p className="marketing-section-desc">
              From the photographer's camera to the guest's phone, PandaSpot orchestrates every step with speed, clarity, and event-scoped privacy.
            </p>
          </div>

          <WorkflowInteractiveStepper />
        </div>
      </section>

      {/* ===================================================================
          4. OUTCOME BENEFITS (Section 8 & 13)
          =================================================================== */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Core Value</div>
            <h2 className="marketing-section-title">
              Built for operational efficiency and client delight.
            </h2>
            <p className="marketing-section-desc">
              PandaSpot solves the business bottlenecks of event photography delivery.
            </p>
          </div>

          <div className="marketing-grid-4">
            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <Search size={22} />
              </div>
              <h3 className="benefit-title">Discover Faster</h3>
              <p className="benefit-desc">
                Guests find their personal photos in seconds using multi-selfie cosine similarity search rather than scrolling through endless galleries.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap teal">
                <Clock size={22} />
              </div>
              <h3 className="benefit-title">Eliminate Resends</h3>
              <p className="benefit-desc">
                Stop answering repetitive messages asking for specific shots. Attendees self-serve their photos on demand from any device.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <Camera size={22} />
              </div>
              <h3 className="benefit-title">Studio Branding</h3>
              <p className="benefit-desc">
                Every guest touchpoint, printable QR card, and watermarked social share carries your studio logo and brand colors.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap teal">
                <ShieldCheck size={22} />
              </div>
              <h3 className="benefit-title">Centralized Control</h3>
              <p className="benefit-desc">
                Invite second shooters with scoped access, monitor search counts and match rates, and enforce automatic 90-day event windows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. WHO IT IS FOR (Section 6 & 11 & 12)
          =================================================================== */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Audience & Use Cases</div>
            <h2 className="marketing-section-title">
              Designed for everyone who captures or delivers event media.
            </h2>
            <p className="marketing-section-desc">
              Explore tailored workflows for professional creators, studios, and event coordinators.
            </p>
          </div>

          <div className="marketing-grid-3">
            <div className="audience-card">
              <div>
                <div className="audience-header">
                  <div className="benefit-icon-wrap" style={{ marginBottom: 0 }}>
                    <Camera size={22} />
                  </div>
                  <h3 className="audience-title">Photographers & Studios</h3>
                </div>
                <p className="audience-desc">
                  Spend less time answering photo requests and more time shooting. Give clients a high-end, branded delivery experience with automated QR guest cards.
                </p>
              </div>
              <Link to="/for-photographers" className="marketing-btn marketing-btn-secondary" style={{ width: '100%' }}>
                <span>Photographer Workflows</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="audience-card">
              <div>
                <div className="audience-header">
                  <div className="benefit-icon-wrap teal" style={{ marginBottom: 0 }}>
                    <Building size={22} />
                  </div>
                  <h3 className="audience-title">Event Teams & Organizers</h3>
                </div>
                <p className="audience-desc">
                  Conferences, summits, galas, and venues: deliver attendee photos with brand consistency, fast discovery, and actionable search analytics.
                </p>
              </div>
              <Link to="/for-event-teams" className="marketing-btn marketing-btn-secondary" style={{ width: '100%' }}>
                <span>Organizer Workflows</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="audience-card">
              <div>
                <div className="audience-header">
                  <div className="benefit-icon-wrap" style={{ marginBottom: 0 }}>
                    <Users size={22} />
                  </div>
                  <h3 className="audience-title">Guests & Attendees</h3>
                </div>
                <p className="audience-desc">
                  Spot yourself. Get your photos. Scan the QR code with your phone camera, upload a selfie, and download your high-resolution memories instantly.
                </p>
              </div>
              <button
                type="button"
                className="marketing-btn marketing-btn-secondary"
                style={{ width: '100%' }}
                onClick={openEarlyAccess}
              >
                <span>Request Demo</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. PRIVACY & SECURITY BY DESIGN (Section 15)
          =================================================================== */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="trust-banner-card">
            <div className="trust-banner-grid">
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', display: 'inline-block', marginBottom: 12 }}>
                  Privacy & Data Stewardship
                </span>
                <h2 className="trust-banner-title">
                  Event-Scoped Discovery. Privacy by Design.
                </h2>
                <p className="trust-banner-desc">
                  We believe photo discovery should be private, transparent, and strictly bounded. PandaSpot never sells data or builds cross-event personal profiles.
                </p>
                <Link to="/privacy" className="marketing-btn marketing-btn-secondary" style={{ marginTop: 12 }}>
                  <span>Read Plain-Language Policy</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="trust-pillars-grid">
                <div className="trust-pillar-item">
                  <div className="trust-pillar-title">Event Isolation</div>
                  <p className="trust-pillar-desc">
                    Face embeddings are scoped exclusively to the specific event. Queries never search across unrelated galleries.
                  </p>
                </div>

                <div className="trust-pillar-item">
                  <div className="trust-pillar-title">No Guest Accounts</div>
                  <p className="trust-pillar-desc">
                    Attendees access photos via unauthenticated links without entering passwords or creating permanent accounts.
                  </p>
                </div>

                <div className="trust-pillar-item">
                  <div className="trust-pillar-title">90-Day Soft Close</div>
                  <p className="trust-pillar-desc">
                    Guest search windows automatically close after 90 days, while the photographer retains full archive management.
                  </p>
                </div>

                <div className="trust-pillar-item">
                  <div className="trust-pillar-title">Evidence Policy</div>
                  <p className="trust-pillar-desc">
                    We only claim verified security and infrastructure practices. Zero fake certifications or synthetic reviews.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. FAQ ACCORDION (Section 16)
          =================================================================== */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Frequently Asked Questions</div>
            <h2 className="marketing-section-title">
              Common questions about PandaSpot.
            </h2>
            <p className="marketing-section-desc">
              Clear, factual answers about setup, privacy, workflows, and availability.
            </p>
          </div>

          <FAQAccordion limit={6} />

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/faq" className="marketing-btn marketing-btn-secondary">
              <span>View All 10 Questions</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. CONTACT / EARLY ACCESS FORM (Section 17)
          =================================================================== */}
      <section id="early-access" className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-pill-label">
              <Sparkles size={14} />
              <span>Private Preview Program</span>
            </div>
            <h2 className="marketing-section-title">
              Give every event a better delivery layer.
            </h2>
            <p className="marketing-section-desc">
              Join leading photographers, studios, and event coordinators testing PandaSpot before public launch.
            </p>
          </div>

          <div className="early-access-form-card">
            {inlineSubmitted ? (
              <div className="form-success-state">
                <div className="form-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 8px', fontSize: 24, color: 'var(--text-main)' }}>
                  Thank you! Your request has been received.
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: '0 0 20px', lineHeight: 1.5 }}>
                  We are gradually welcoming studios and event teams into our private preview. We will be in touch with access credentials and demo scheduling.
                </p>
                <button
                  type="button"
                  className="marketing-btn marketing-btn-secondary"
                  onClick={() => setInlineSubmitted(false)}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleInlineSubmit}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="inline-name">Your Name *</label>
                    <input
                      id="inline-name"
                      required
                      className="form-input"
                      placeholder="Alex Morgan"
                      value={inlineForm.name}
                      onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="inline-email">Work Email *</label>
                    <input
                      id="inline-email"
                      type="email"
                      required
                      className="form-input"
                      placeholder="alex@studio.com"
                      value={inlineForm.email}
                      onChange={(e) => setInlineForm({ ...inlineForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="inline-company">Studio / Organization</label>
                    <input
                      id="inline-company"
                      className="form-input"
                      placeholder="Aurora Media"
                      value={inlineForm.company}
                      onChange={(e) => setInlineForm({ ...inlineForm, company: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="inline-role">Role</label>
                    <select
                      id="inline-role"
                      className="form-select"
                      value={inlineForm.role}
                      onChange={(e) => setInlineForm({ ...inlineForm, role: e.target.value })}
                    >
                      <option value="photographer">Photographer</option>
                      <option value="studio_lead">Studio Lead</option>
                      <option value="event_planner">Event Organizer / Coordinator</option>
                      <option value="corporate">Brand / Corporate Team</option>
                      <option value="venue">Venue Manager</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inline-message">Event Details / Questions</label>
                  <textarea
                    id="inline-message"
                    rows={3}
                    className="form-textarea"
                    placeholder="Tell us about your event photography volume or delivery workflow needs..."
                    value={inlineForm.message}
                    onChange={(e) => setInlineForm({ ...inlineForm, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="marketing-btn marketing-btn-primary marketing-btn-lg"
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={submitting}
                >
                  {submitting ? 'Sending Request...' : 'Request Early Access / Book Demo'}
                  <ArrowRight size={16} />
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)', margin: '14px 0 0' }}>
                  No commitment required. We never sell or share your contact details.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================
          9. FINAL DARK BRAND CALL TO ACTION (Section 8)
          =================================================================== */}
      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">
            Make event photo delivery easier to discover.
          </h2>
          <p className="final-cta-desc">
            Transform large photo sets into an organized, branded gallery experience that attendees love.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="marketing-btn marketing-btn-teal marketing-btn-lg"
              onClick={openEarlyAccess}
            >
              <span>Request Early Access</span>
              <ArrowRight size={18} />
            </button>
            <Link to="/product" className="marketing-btn marketing-btn-secondary marketing-btn-lg" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              <span>Explore Product Architecture</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter onOpenEarlyAccess={openEarlyAccess} />

      {/* Modal */}
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
