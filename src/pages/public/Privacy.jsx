import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Database,
  Clock,
  Trash2,
  HelpCircle,
  Mail,
  ArrowRight,
  Sparkles
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function Privacy() {
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
              <ShieldCheck size={14} />
              <span>Privacy & Security Policy</span>
            </div>
            <h1 className="marketing-hero-title">
              Event-scoped discovery. <span>Privacy by design.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              A clear, plain-language breakdown of how PandaSpot handles photos, mathematical face embeddings, guest inputs, and data retention.
            </p>
          </div>
        </div>
      </section>

      {/* Policy Details */}
      <section className="marketing-section">
        <div className="marketing-container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {/* 1. What Data is Collected */}
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="benefit-icon-wrap" style={{ marginBottom: 0 }}>
                  <Database size={20} />
                </div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-main)' }}>
                  1. What Data is Processed
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: '0 0 12px' }}>
                PandaSpot processes only the data strictly necessary to provide the photo delivery service:
              </p>
              <ul style={{ paddingLeft: 20, margin: '0 0 14px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>
                <li><strong>Event Photos:</strong> Uploaded by authenticated photographers to specific event storage folders.</li>
                <li><strong>Facial Embeddings:</strong> 512-dimension floating point vectors representing detected facial geometry. Embeddings are one-way mathematical arrays and cannot be reversed into original face images.</li>
                <li><strong>Guest Selfies:</strong> Temporary photos submitted by guests solely to calculate a query embedding for matching against that specific event.</li>
                <li><strong>Account Credentials:</strong> Email addresses and bcrypt password hashes (or Google OAuth IDs) for photographers and studio collaborators.</li>
              </ul>
            </div>

            {/* 2. Event-Scoped Isolation */}
            <div id="event-scoped" className="card" style={{ padding: 32, borderLeft: '4px solid var(--accent-teal)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="benefit-icon-wrap teal" style={{ marginBottom: 0 }}>
                  <Lock size={20} />
                </div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-main)' }}>
                  2. Strict Event-Scoped Isolation
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                Every vector search query is mathematically bounded by the unique <code>eventId</code>. When a guest uploads a selfie to search for their photos at a wedding, the system executes a scoped database query strictly within that event. <strong>Embeddings are never cross-referenced across different events, studios, or platforms.</strong>
              </p>
            </div>

            {/* 3. No Guest Account / Surveillance Guarantee */}
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="benefit-icon-wrap" style={{ marginBottom: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-main)' }}>
                  3. Zero Guest Account Requirements
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                Guests are never asked to provide legal names, create passwords, download software, or agree to invasive third-party ad tracking. We treat the guest photo discovery process as an ephemeral utility.
              </p>
            </div>

            {/* 4. Retention & 90-Day Soft Close */}
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="benefit-icon-wrap teal" style={{ marginBottom: 0 }}>
                  <Clock size={20} />
                </div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-main)' }}>
                  4. Retention & Expiry Policies
                </h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: '0 0 12px' }}>
                Every event created stamped with a 90-day guest window. Once past this date:
              </p>
              <ul style={{ paddingLeft: 20, margin: 0, color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6 }}>
                <li>Public guest search, download, and feedback endpoints automatically close with a <code>410 Gone</code> status.</li>
                <li>The photographer retains full private ownership and control to archive or delete photos from the dashboard at any time.</li>
                <li>When an event is deleted by its owner, all associated photos, thumbnails, embeddings, zip files, and guest feedback records are permanently deleted from disk and database.</li>
              </ul>
            </div>

            {/* 5. Contact / Legal Questions */}
            <div className="card" style={{ padding: 32, background: 'var(--bg-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Mail size={20} color="#1E40AF" />
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-main)' }}>
                  Privacy & Data Questions
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 14px' }}>
                For data deletion requests, privacy questions, or security inquiries, please contact our team directly.
              </p>
              <Link to="/contact" className="marketing-btn marketing-btn-primary">
                Contact Privacy Team
              </Link>
            </div>

          </div>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={openEarlyAccess} />
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
