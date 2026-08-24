import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Camera,
  Target,
  ShieldCheck,
  ArrowRight,
  Heart,
  Award
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function About() {
  const [modalOpen, setModalOpen] = useState(false)
  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Sparkles size={14} />
              <span>About PandaSpot</span>
            </div>
            <h1 className="marketing-hero-title">
              Our Mission: <span>Fix Event Photo Delivery.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              Event photo delivery is traditionally built for storage, not discovery. PandaSpot is designed to turn large photo sets into effortless, personal discovery experiences.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container" style={{ maxWidth: 840 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Problem Observed */}
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--text-main)', margin: '0 0 14px' }}>
                The Problem We Observed
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, margin: '0 0 14px' }}>
                Photographers capture incredible moments at weddings, conferences, festivals, and parties. But once the shoot ends, the delivery process breaks down. Sending clients a 3,000-photo folder forces guests to endlessly scroll, download giant zip files on weak mobile connections, or constantly ask the photographer to manually find specific shots.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Storage platforms were designed for file archiving, not human discovery.
              </p>
            </div>

            {/* The PandaSpot Approach */}
            <div className="card" style={{ padding: 32, borderLeft: '4px solid var(--primary-blue)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--text-main)', margin: '0 0 14px' }}>
                The PandaSpot Approach
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, margin: '0 0 14px' }}>
                We built PandaSpot as a discovery-first delivery layer. By combining high-capacity asynchronous batch processing, facial vector embeddings, and zero-install mobile guest access, we enable guests to spot themselves in seconds while keeping the photographer's brand front and center.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Photographers save hours of post-event admin, and attendees get immediate access to the memories they care about most.
              </p>
            </div>

            {/* Our Evidence & Ethics Policy */}
            <div className="card" style={{ padding: 32, background: 'var(--bg-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <ShieldCheck size={22} color="#14B8A6" />
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--text-main)' }}>
                  Our Evidence & Privacy Policy
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
                We do not publish fabricated statistics, synthetic customer quotes, or unverified security badges. We build real, measurable software and respect user data through strict event-isolated vector matching.
              </p>
              <Link to="/privacy" style={{ color: 'var(--primary-blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Read our Privacy Policy &rarr;
              </Link>
            </div>

          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">Join our early access community</h2>
          <p className="final-cta-desc">Be part of the private preview testing PandaSpot on upcoming events.</p>
          <button type="button" className="marketing-btn marketing-btn-teal marketing-btn-lg" onClick={openEarlyAccess}>
            Request Early Access
          </button>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={openEarlyAccess} />
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
