import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Search,
  Calendar,
  Download,
  Camera,
  Shield,
  TrendingUp,
  Smartphone,
  CheckCircle2,
  Cpu,
  Share2,
  Users,
  HardDrive,
  QrCode,
  ArrowRight
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function Features() {
  const [modalOpen, setModalOpen] = useState(false)
  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  const featureGroups = [
    {
      group: 'Discovery & Matching',
      icon: Search,
      problem: 'Guests cannot easily find themselves across 2,000+ unsorted photos.',
      capability: 'Multi-selfie vector cosine search using InsightFace (ArcFace 512-d) and PostgreSQL pgvector.',
      outcome: 'Guests discover all photos they appear in within seconds of uploading a front-facing selfie.'
    },
    {
      group: 'Event Workflow',
      icon: Calendar,
      problem: 'Managing photo ingestion across multiple cards and assistants is messy.',
      capability: 'Asynchronous upload queue with live Server-Sent Events progress and collaborator invitations.',
      outcome: 'Organize all event media in one centralized workspace with live speed and ETA tracking.'
    },
    {
      group: 'Delivery Layer',
      icon: Download,
      problem: 'Large zip downloads block browser tabs and timeout on mobile networks.',
      capability: 'Dual download modes: instant direct streaming zips and asynchronous background emailed zip links.',
      outcome: 'Frictionless high-resolution file delivery for both small selections and large multi-photo batches.'
    },
    {
      group: 'Brand Presentation',
      icon: Camera,
      problem: 'Generic file links promote storage providers instead of your photography studio.',
      capability: 'Custom studio name, custom brand hex color, custom logo, and automated client-canvas QR visiting cards.',
      outcome: 'Every guest interaction and social share strengthens your brand and generates inbound inquiries.'
    },
    {
      group: 'Governance & Control',
      icon: Shield,
      problem: 'Permanent public links create privacy risks and unmanaged storage growth.',
      capability: '90-day automatic guest soft close, per-event storage meters (10GB cap), and scoped assistant permissions.',
      outcome: 'Full administrative control over who uploads, who views, and how long public access remains open.'
    },
    {
      group: 'Insights & Analytics',
      icon: TrendingUp,
      problem: 'Photographers have zero visibility into whether clients and guests actually view photos.',
      capability: 'Event analytics dashboard tracking total searches, unique guests, match rates, and 30-day trends.',
      outcome: 'Measure attendee engagement and photo discovery performance across all of your events.'
    },
    {
      group: 'Mobile & Progressive Web App',
      icon: Smartphone,
      problem: 'Forcing app store downloads creates immediate drop-off.',
      capability: 'Zero-install responsive mobile experience with dynamic per-event PWA manifest injection.',
      outcome: 'Guests open the page instantly in Safari or Chrome, with option to save shortcut directly to home screen.'
    }
  ]

  const roadmapItems = [
    'Automated WhatsApp event delivery notifications',
    'Custom white-label domains (e.g. photos.yourstudio.com)',
    'E-commerce print ordering & photo proofing add-on',
    'Camera-to-cloud direct tethering ingest'
  ]

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Sparkles size={14} />
              <span>Feature Catalog</span>
            </div>
            <h1 className="marketing-hero-title">
              Engineered for discovery, <span>control, and brand growth.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              Explore every capability built into PandaSpot, organized strictly by user problem, platform capability, and operational outcome.
            </p>
            <div className="marketing-hero-ctas">
              <button type="button" className="marketing-btn marketing-btn-primary" onClick={openEarlyAccess}>
                Request Early Access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Outcome-Led Feature Grid */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            {featureGroups.map((f, idx) => {
              const IconComp = f.icon
              return (
                <div key={idx} className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div className="benefit-icon-wrap" style={{ marginBottom: 0 }}>
                      <IconComp size={22} />
                    </div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--text-main)' }}>
                      {f.group}
                    </h3>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>
                      Problem Solved
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                      {f.problem}
                    </p>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-blue)', letterSpacing: '0.05em' }}>
                      Platform Capability
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                      {f.capability}
                    </p>
                  </div>

                  <div style={{ marginTop: 'auto', background: 'var(--accent-teal-bg)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(20,184,166,0.2)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-teal-dark)', letterSpacing: '0.05em' }}>
                      User Outcome
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                      {f.outcome}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Honesty / Roadmap Section */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Transparency</div>
            <h2 className="marketing-section-title">Planned Roadmap (In Active Development)</h2>
            <p className="marketing-section-desc">
              We only market what is actually built and tested. Features below are scheduled for future milestone releases.
            </p>
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto', background: 'var(--bg-soft)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 32 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {roadmapItems.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-teal)' }}></div>
                  <span>{item}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
                    Roadmap
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">Test PandaSpot features on your next shoot</h2>
          <p className="final-cta-desc">Request private preview access or book a guided demonstration.</p>
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
