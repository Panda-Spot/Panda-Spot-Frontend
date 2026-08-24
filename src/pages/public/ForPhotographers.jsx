import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  QrCode,
  Users,
  Share2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function ForPhotographers() {
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
              <Camera size={14} />
              <span>For Wedding & Event Photographers</span>
            </div>
            <h1 className="marketing-hero-title">
              Spend less time helping people find photos. <span>Spend more time shooting.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              PandaSpot gives your events a professional photo delivery layer: upload in bulk, distribute via QR, and let guests find themselves instantly with zero support overhead.
            </p>
            <div className="marketing-hero-ctas">
              <button type="button" className="marketing-btn marketing-btn-primary marketing-btn-lg" onClick={openEarlyAccess}>
                Request Early Access
              </button>
              <Link to="/how-it-works" className="marketing-btn marketing-btn-secondary marketing-btn-lg">
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Chain vs PandaSpot Workflow */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Workflow Evolution</div>
            <h2 className="marketing-section-title">Replace the Manual Post-Event Scramble</h2>
            <p className="marketing-section-desc">
              Compare traditional photo delivery with the automated PandaSpot experience.
            </p>
          </div>

          <div className="marketing-comparison-grid">
            <div className="comparison-card comparison-card-old">
              <span className="comparison-card-tag comparison-tag-old">The Old Delivery Chain</span>
              <h3 className="comparison-card-title">Time-Consuming & Repetitive</h3>
              <ul className="comparison-list">
                <li><XCircle size={18} className="comparison-icon-bad" /> <span>Export photos and upload to generic Drive/Dropbox links.</span></li>
                <li><XCircle size={18} className="comparison-icon-bad" /> <span>Send link to client; client shares it with 300+ guests.</span></li>
                <li><XCircle size={18} className="comparison-icon-bad" /> <span>Guests complain about scrolling through thousands of photos.</span></li>
                <li><XCircle size={18} className="comparison-icon-bad" /> <span>Spend weeks answering DMs: &quot;Can you find the photo of my grandmother?&quot;</span></li>
                <li><XCircle size={18} className="comparison-icon-bad" /> <span>Zero brand visibility when photos are shared on social media.</span></li>
              </ul>
            </div>

            <div className="comparison-card comparison-card-new">
              <span className="comparison-card-tag comparison-tag-new">The PandaSpot Way</span>
              <h3 className="comparison-card-title">Professional, Fast & Automated</h3>
              <ul className="comparison-list">
                <li><CheckCircle2 size={18} className="comparison-icon-good" /> <span>Drag-and-drop entire event photo sets in one batch.</span></li>
                <li><CheckCircle2 size={18} className="comparison-icon-good" /> <span>Print table QR cards with your studio branding in one click.</span></li>
                <li><CheckCircle2 size={18} className="comparison-icon-good" /> <span>Guests snap a selfie at the table or home and get instant matches.</span></li>
                <li><CheckCircle2 size={18} className="comparison-icon-good" /> <span>Zero support messages — attendees self-serve their high-res downloads.</span></li>
                <li><CheckCircle2 size={18} className="comparison-icon-good" /> <span>Shared photos include watermarked studio attribution that drives new clients.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Photographer Pillars */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Studio Features</div>
            <h2 className="marketing-section-title">Built for Your Studio’s Reputation and Growth</h2>
            <p className="marketing-section-desc">
              Every feature is designed to elevate your client experience and streamline operations.
            </p>
          </div>

          <div className="marketing-grid-3">
            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <Camera size={22} />
              </div>
              <h3 className="benefit-title">Custom Studio Branding</h3>
              <p className="benefit-desc">
                Upload your studio logo, pick your primary brand hex color, and add your studio name. Every guest page, printable table QR card, and shared image prominently displays your brand.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap teal">
                <Users size={22} />
              </div>
              <h3 className="benefit-title">Second Shooter Access</h3>
              <p className="benefit-desc">
                Invite assistants or second shooters to specific events by email. They get scoped upload and management permissions without ever seeing your billing settings or other events.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <Share2 size={22} />
              </div>
              <h3 className="benefit-title">Viral Referral Loop</h3>
              <p className="benefit-desc">
                When guests share their watermarked photos to Instagram or WhatsApp, the footer includes a link directly back to the event gallery. Future clients see your work in action.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">Upgrade your event delivery experience</h2>
          <p className="final-cta-desc">Join photographers who are testing PandaSpot for their wedding and party clients.</p>
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
