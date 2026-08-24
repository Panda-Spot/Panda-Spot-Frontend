import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  ArrowRight,
  Sparkles,
  Calendar,
  UploadCloud,
  Cpu,
  Search,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Server,
  Zap,
  HardDrive
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function Product() {
  const [modalOpen, setModalOpen] = useState(false)
  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  const modules = [
    {
      step: '01',
      title: 'Event Workspace Setup',
      owner: 'Photographer / Studio',
      desc: 'Create an isolated event workspace with an automatically generated guest link and unique slug. Apply custom studio branding (logo, colors, name) to all guest-facing surfaces.',
      inputs: 'Event Name, Date, Studio Branding Assets',
      outputs: 'Public Guest URL (/e/:slug), Printable QR Card, Event Database Record',
      icon: Calendar
    },
    {
      step: '02',
      title: 'Asynchronous Ingestion',
      owner: 'Photographer / Assistants',
      desc: 'Bulk-upload full-resolution JPG, PNG, and WebP files. The server enqueues the batch, validates magic-bytes against spoofing, and streams real-time progress via Server-Sent Events (SSE).',
      inputs: 'Multipart Photo Batches (10GB event storage cap)',
      outputs: 'Asynchronous Job ID, Live SSE Stream (photos/sec, ETA), Original Files on Disk',
      icon: UploadCloud
    },
    {
      step: '03',
      title: 'AI Facial Embedding Engine',
      owner: 'Inference Microservice (InsightFace)',
      desc: 'Each photo is sent server-to-server to the internal Python face-engine microservice. RetinaFace detects bounding boxes and ArcFace calculates 512-dimension mathematical embeddings.',
      inputs: 'Decoded Image Pixels (in-memory buffer)',
      outputs: '512-d Face Vectors, Bounding Boxes, Fast 480px JPEG Thumbnails (Sharp)',
      icon: Cpu
    },
    {
      step: '04',
      title: 'Vector Cosine Discovery',
      owner: 'PostgreSQL + pgvector',
      desc: 'Guest selfie embeddings are averaged and unit-normalized. The database executes high-speed cosine distance queries (<=>) with an HNSW index, bounded by an auto-tuning threshold.',
      inputs: '1–3 Front-Facing Guest Selfies',
      outputs: 'Ranked Matching Photos (Similarity >= 0.36 threshold)',
      icon: Search
    },
    {
      step: '05',
      title: 'Multi-Format Delivery Layer',
      owner: 'Guest Mobile / Desktop',
      desc: 'Guests view personal matches on a branded mobile gallery. They can download individual images, stream direct zip archives, receive asynchronous email zip links, or generate watermarked social shares.',
      inputs: 'Selected Photo IDs',
      outputs: 'High-Res Downloads, Archiver Zip Files, Client-Canvas Watermarked PNGs',
      icon: Download
    }
  ]

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Layers size={14} />
              <span>Architecture & System Overview</span>
            </div>
            <h1 className="marketing-hero-title">
              A better delivery system <span>for event photos.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              PandaSpot connects high-capacity photo ingestion, deep-learning face embeddings, and instant guest discovery into one seamless SaaS pipeline.
            </p>
            <div className="marketing-hero-ctas">
              <button type="button" className="marketing-btn marketing-btn-primary" onClick={openEarlyAccess}>
                Request Early Access
              </button>
              <Link to="/how-it-works" className="marketing-btn marketing-btn-secondary">
                View 6-Stage Narrative
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 System Modules */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">End-to-End Pipeline</div>
            <h2 className="marketing-section-title">The Five Core Modules of PandaSpot</h2>
            <p className="marketing-section-desc">
              Every stage has explicit inputs, outputs, and system ownership.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
            {modules.map((m) => {
              const IconComp = m.icon
              return (
                <div key={m.step} className="card" style={{ padding: 32, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'var(--primary-blue-bg)',
                    color: 'var(--primary-blue)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2
                  }}>
                    <IconComp size={24} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{m.step}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text-main)' }}>
                        {m.title}
                      </h3>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-teal-dark)', background: 'var(--accent-teal-bg)', padding: '3px 10px', borderRadius: 9999 }}>
                        {m.owner}
                      </span>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' }}>
                      {m.desc}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: 'var(--bg-soft)', padding: 14, borderRadius: 8, fontSize: 13 }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 2 }}>Inputs:</strong>
                        <span style={{ color: 'var(--text-subtle)' }}>{m.inputs}</span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 2 }}>Outputs:</strong>
                        <span style={{ color: 'var(--primary-blue)', fontWeight: 500 }}>{m.outputs}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Control Layer */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Platform Controls</div>
            <h2 className="marketing-section-title">Built-In Management & Operational Governance</h2>
            <p className="marketing-section-desc">
              Comprehensive controls designed for high-trust professional delivery.
            </p>
          </div>

          <div className="marketing-grid-3">
            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <ShieldCheck size={22} />
              </div>
              <h3 className="benefit-title">Collaborator Roles</h3>
              <p className="benefit-desc">
                Invite second shooters and assistants with scoped upload permissions. They manage event photos without accessing your billing credentials or other client galleries.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap teal">
                <Zap size={22} />
              </div>
              <h3 className="benefit-title">Dynamic Self-Tuning</h3>
              <p className="benefit-desc">
                When a guest clicks "Not Me" on a false positive, PandaSpot automatically nudges the event's similarity threshold up by +0.01 to adapt to tricky lighting or group shots.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <HardDrive size={22} />
              </div>
              <h3 className="benefit-title">90-Day Soft Close</h3>
              <p className="benefit-desc">
                Guest access automatically soft-closes 90 days post-creation. Photographers maintain permanent access to original archives and analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">Ready to modernize your delivery workflow?</h2>
          <p className="final-cta-desc">Join our private preview program and test PandaSpot on upcoming events.</p>
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
