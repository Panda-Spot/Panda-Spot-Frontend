import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  UploadCloud,
  Cpu,
  QrCode,
  Camera,
  Download,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Share2,
  ShieldCheck
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function HowItWorks() {
  const [modalOpen, setModalOpen] = useState(false)
  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  const steps = [
    {
      step: '01',
      title: 'Create Event Workspace',
      owner: 'Photographer / Event Lead',
      headline: 'Set up an isolated event in seconds',
      description: 'Enter your event name, apply your custom studio branding (logo, brand colors, studio name), and receive a dedicated guest link (/e/:slug) and printable table QR card automatically.',
      details: [
        'Isolated event storage and isolated face vector boundaries',
        'Studio-wide logo & accent color customization',
        'Assistant & second shooter access management'
      ],
      previewContent: (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Event Configuration</div>
          <div style={{ background: 'var(--bg-soft)', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 12 }}>
            <strong>Event:</strong> Annual Tech Summit 2026
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Slug: <code>/e/tech-summit-26</code></span>
            <span style={{ color: 'var(--accent-teal-dark)', fontWeight: 600 }}>• Active</span>
          </div>
        </div>
      )
    },
    {
      step: '02',
      title: 'Bulk Ingest Photos',
      owner: 'Photographer',
      headline: 'Drag and drop high-resolution batches',
      description: 'Drop hundreds of photos straight into the browser. PandaSpot processes them in the background with an asynchronous queue, streaming live photo counts, speed, and remaining time.',
      details: [
        'Server-Sent Events (SSE) live progress stream with photos/sec metrics',
        'Magic-byte sniffing prevents invalid or corrupted image uploads',
        'Automatic Sharp generation of 480px previews for instant grid loading'
      ],
      previewContent: (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            <span>Ingesting Batch (600 photos)</span>
            <span style={{ color: 'var(--primary-blue)' }}>78%</span>
          </div>
          <div style={{ height: 10, background: 'var(--border-light)', borderRadius: 9999, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: '78%', height: '100%', background: 'var(--gradient-brand)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Now processing: IMG_8204.JPG</span>
            <span>~6s remaining</span>
          </div>
        </div>
      )
    },
    {
      step: '03',
      title: 'InsightFace Vector Indexing',
      owner: 'Inference Engine (Server-to-Server)',
      headline: 'Extract 512-dimension mathematical embeddings',
      description: 'The internal Python microservice runs RetinaFace to detect facial bounding boxes and ArcFace to produce 512-float unit vectors stored directly in PostgreSQL using pgvector with HNSW indexing.',
      details: [
        'Stateless, secure internal inference microservice (bound to 127.0.0.1)',
        'Sub-second multi-face detection in crowded banquet or group shots',
        'HNSW vector indexing for instant nearest-neighbor similarity lookups'
      ],
      previewContent: (
        <div style={{ background: '#0f172a', color: '#f8fafc', padding: 20, borderRadius: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ color: '#38bdf8' }}>// PostgreSQL pgvector Cosine Query</div>
          <div>SELECT photo_id, MAX(1 - (embedding &lt;=&gt; $query_vector))</div>
          <div>FROM &quot;Face&quot; WHERE event_id = $1</div>
          <div>GROUP BY photo_id HAVING similarity &gt;= 0.36;</div>
        </div>
      )
    },
    {
      step: '04',
      title: 'Distribute via QR & Link',
      owner: 'Event Organizer / Venue',
      headline: 'Give attendees one simple, frictionless entry point',
      description: 'Display generated QR codes on tables, reception desks, or presentation screens. Guests scan with their standard smartphone camera — zero app download or account creation required.',
      details: [
        'Printable high-resolution QR table cards composed on HTML5 canvas',
        'Custom web manifest turns the event page into an installable mobile PWA',
        'No guest credentials, passwords, or personal account signups'
      ],
      previewContent: (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid var(--border-light)', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 10px', background: 'var(--bg-soft)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
            <QrCode size={56} color="#0f172a" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Scan to Spot Yourself</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>pandaspot.com/e/tech-summit-26</div>
        </div>
      )
    },
    {
      step: '05',
      title: 'Guest Selfie Discovery',
      owner: 'Guest',
      headline: 'Selfie upload to personal photo set',
      description: 'Guests take or upload 1–3 front-facing selfies. The engine averages and normalizes the facial vectors, matching them against thousands of event photos in milliseconds.',
      details: [
        'Multi-selfie averaging ensures high accuracy across various angles',
        'Dynamic self-tuning: "Not Me" feedback nudges similarity thresholds up',
        'Guests only see photos where they are identified'
      ],
      previewContent: (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--accent-teal-bg)', color: 'var(--accent-teal-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Selfie Query Analyzed</div>
              <div style={{ fontSize: 11, color: 'var(--accent-teal-dark)', fontWeight: 600 }}>12 High-Confidence Matches Found</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, height: 60, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', borderRadius: 6 }}></div>
            <div style={{ flex: 1, height: 60, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 6 }}></div>
            <div style={{ flex: 1, height: 60, background: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', borderRadius: 6 }}></div>
          </div>
        </div>
      )
    },
    {
      step: '06',
      title: 'High-Res Delivery & Sharing',
      owner: 'Guest & Photographer',
      headline: 'Download full originals or share with studio branding',
      description: 'Guests download their full-resolution original photos individually or as complete zip archives. They can also generate watermarked images that carry your studio logo straight to social media.',
      details: [
        'Instant streaming zip or background emailed zip for large batches',
        'Client-side HTML5 canvas watermark creates viral referral traffic',
        'Automatic 90-day guest soft close preserves archive for photographer'
      ],
      previewContent: (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button style={{ flex: 1, background: 'var(--primary-blue)', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Download size={14} /> Download All (12)
            </button>
            <button style={{ flex: 1, background: 'var(--accent-teal)', color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Share2 size={14} /> Story Share
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center' }}>
            Full-resolution originals directly from your storage.
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Sparkles size={14} />
              <span>Six-Stage Delivery Journey</span>
            </div>
            <h1 className="marketing-hero-title">
              How PandaSpot works <span>from camera to delivery.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              A comprehensive walkthrough of how photos are ingested, indexed, discovered, and delivered with speed and privacy.
            </p>
          </div>
        </div>
      </section>

      {/* Alternating 6-Stage Narrative */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
            {steps.map((st, i) => {
              const isEven = i % 2 === 1
              return (
                <div
                  key={st.step}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isEven ? '1.1fr 1fr' : '1fr 1.1fr',
                    gap: 48,
                    alignItems: 'center'
                  }}
                >
                  <div style={{ order: isEven ? 2 : 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary-blue-bg)', color: 'var(--primary-blue)', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                      <span>Stage {st.step}</span>
                      <span>•</span>
                      <span>{st.owner}</span>
                    </div>

                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 30, color: 'var(--text-main)', margin: '0 0 14px', lineHeight: 1.25 }}>
                      {st.headline}
                    </h2>

                    <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, margin: '0 0 20px' }}>
                      {st.description}
                    </p>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {st.details.map((d, dIdx) => (
                        <li key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-muted)' }}>
                          <CheckCircle2 size={16} color="#14B8A6" style={{ flexShrink: 0 }} />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ order: isEven ? 1 : 2 }}>
                    {st.previewContent}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">See PandaSpot in action for your events</h2>
          <p className="final-cta-desc">Book a 15-minute walkthrough or request private preview access.</p>
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
