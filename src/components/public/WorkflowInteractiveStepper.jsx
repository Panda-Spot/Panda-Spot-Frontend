import { useState } from 'react'
import {
  CalendarPlus,
  UploadCloud,
  Cpu,
  QrCode,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Camera,
  Share2
} from 'lucide-react'

const STAGES = [
  {
    num: '01',
    title: 'Create Event',
    owner: 'Photographer / Organizer',
    badge: 'Step 1 of 6',
    heading: 'Configure the event delivery workspace',
    desc: 'Set up an event with a name, date, and unique guest link in seconds. Apply your studio branding (logo, brand colors, studio name) so every guest touchpoint represents your business.',
    checklist: [
      'Automatic unique guest link generation (/e/:slug)',
      'Custom studio logo and brand color customization',
      'Invite assistant shooters / second shooters with scoped access'
    ],
    visualType: 'create'
  },
  {
    num: '02',
    title: 'Bulk Upload',
    owner: 'Photographer',
    badge: 'Step 2 of 6',
    heading: 'Drag and drop event photo batches',
    desc: 'Upload hundreds or thousands of high-resolution photos straight from your memory card. The asynchronous queue processes files in the background while streaming live progress.',
    checklist: [
      'Asynchronous upload queue with live Server-Sent Events progress',
      'Magic-byte file validation to prevent corrupt or invalid files',
      'Automatic generation of 480px fast thumbnails for quick mobile viewing'
    ],
    visualType: 'upload'
  },
  {
    num: '03',
    title: 'AI Indexing',
    owner: 'PandaSpot Platform',
    badge: 'Step 3 of 6',
    heading: 'Automatic facial detection & vector indexing',
    desc: 'Every photo is scanned using deep-learning models (InsightFace RetinaFace + ArcFace) to extract 512-dimension mathematical embeddings stored in PostgreSQL via pgvector with HNSW indexing.',
    checklist: [
      'Sub-second facial detection with multi-face group shot indexing',
      '512-dimensional unit embeddings stored directly in database vectors',
      'Completely isolated per-event indexing — vectors never cross events'
    ],
    visualType: 'index'
  },
  {
    num: '04',
    title: 'Share QR',
    owner: 'Organizer / Venue',
    badge: 'Step 4 of 6',
    heading: 'Provide attendees with a frictionless entry point',
    desc: 'Print high-resolution table QR cards directly from the dashboard or send the event link via messaging apps. Guests simply tap or scan to enter.',
    checklist: [
      'One-click printable guest table cards generated on client canvas',
      'Direct mobile link (no app download, no account required)',
      'Installable PWA support with event-specific manifest'
    ],
    visualType: 'share'
  },
  {
    num: '05',
    title: 'Selfie Search',
    owner: 'Guest',
    badge: 'Step 5 of 6',
    heading: 'Guests discover their moments in 1 selfie',
    desc: 'Guests snap or upload up to 3 selfies. The engine averages and normalizes the facial vectors, running a cosine-similarity query against the event photos in milliseconds.',
    checklist: [
      'Multi-selfie unit vector averaging for higher accuracy in various angles',
      'Instant cosine similarity ranking (1 - cosine distance)',
      'Self-tuning threshold: "Not Me" feedback nudges matching accuracy'
    ],
    visualType: 'discover'
  },
  {
    num: '06',
    title: 'Instant Delivery',
    owner: 'Guest / Organizer',
    badge: 'Step 6 of 6',
    heading: 'Download full-res originals or share with branding',
    desc: 'Guests view their personal matches, download single images or complete zip archives, and create watermarked branded photos to share across social media.',
    checklist: [
      'Instant direct streaming zip or background emailed zip for large batches',
      'Client-side watermarked share image with studio branding & link',
      'Automatic 90-day soft close: guest access expires cleanly with zero deletion'
    ],
    visualType: 'deliver'
  }
]

export default function WorkflowInteractiveStepper() {
  const [activeIdx, setActiveIdx] = useState(0)
  const current = STAGES[activeIdx]

  return (
    <div className="workflow-stepper-wrap">
      {/* Navigation tabs */}
      <div className="workflow-tabs-nav">
        {STAGES.map((st, i) => (
          <button
            key={st.num}
            type="button"
            className={`workflow-tab-btn ${activeIdx === i ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            <span className="workflow-tab-num">{st.num}</span>
            <span className="workflow-tab-title">{st.title}</span>
          </button>
        ))}
      </div>

      {/* Content Split */}
      <div className="workflow-content-split">
        {/* Left: Explanatory copy */}
        <div>
          <div className="workflow-info-badge">
            <span>{current.badge}</span>
            <span>•</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{current.owner}</span>
          </div>
          <h3 className="workflow-info-title">{current.heading}</h3>
          <p className="workflow-info-desc">{current.desc}</p>
          <ul className="workflow-checklist">
            {current.checklist.map((item, idx) => (
              <li key={idx}>
                <CheckCircle2 size={16} color="#14B8A6" style={{ flexShrink: 0 }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Dynamic Visual Panel */}
        <div className="workflow-visual-panel">
          {current.visualType === 'create' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' }}>Create Event Workspace</div>
              <div style={{ background: 'var(--bg-soft)', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13 }}>
                Event Name: <strong style={{ color: 'var(--primary-blue)' }}>St. Mary Gala 2026</strong>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Brand Accent:</span>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: '#1E40AF', display: 'inline-block' }}></span>
                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>#1E40AF (Custom)</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent-teal-dark)', background: 'var(--accent-teal-bg)', padding: '6px 10px', borderRadius: 6, fontWeight: 600 }}>
                ✓ Generated Public Slug: /e/st-mary-gala-2026
              </div>
            </div>
          )}

          {current.visualType === 'upload' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Processing Batch: 420 photos</span>
                <span style={{ color: 'var(--primary-blue)', fontWeight: 700 }}>68%</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #1E40AF, #14B8A6)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Speed: ~14.2 photos/sec</span>
                <span>ETA: ~10s remaining</span>
              </div>
            </div>
          )}

          {current.visualType === 'index' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-blue-bg)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>InsightFace + pgvector</div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>512-d normalized face vectors</div>
                </div>
              </div>
              <div style={{ background: '#0f172a', color: '#38bdf8', padding: 10, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 }}>
                SELECT photo_id, MAX(1 - (embedding &lt;=&gt; query_vector)) as similarity FROM "Face" WHERE event_id = $1 GROUP BY photo_id;
              </div>
            </div>
          )}

          {current.visualType === 'share' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', textAlign: 'center', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ width: 90, height: 90, margin: '0 auto 12px', border: '1px solid var(--border-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-soft)' }}>
                <QrCode size={64} color="#0F172A" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Printable Table QR Card</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Scan with phone camera to find photos</div>
            </div>
          )}

          {current.visualType === 'discover' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Camera size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Selfie Query Vector</div>
                  <div style={{ fontSize: 11, color: 'var(--accent-teal-dark)', fontWeight: 600 }}>Averaged & unit normalized (3 photos)</div>
                </div>
              </div>
              <div style={{ background: 'var(--accent-teal-bg)', border: '1px solid rgba(20,184,166,0.2)', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: 'var(--accent-teal-dark)', fontWeight: 600 }}>
                ✓ 8 High-Confidence Matches Found (&gt; 0.36 threshold)
              </div>
            </div>
          )}

          {current.visualType === 'deliver' && (
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, padding: 12, background: 'var(--bg-soft)', borderRadius: 8, textAlign: 'center' }}>
                  <DownloadCloud size={20} color="#1E40AF" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Full-Res Zip</div>
                  <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Direct or Email</div>
                </div>
                <div style={{ flex: 1, padding: 12, background: 'var(--bg-soft)', borderRadius: 8, textAlign: 'center' }}>
                  <Share2 size={20} color="#14B8A6" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Watermarked</div>
                  <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>Branded Story</div>
                </div>
              </div>
              <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-muted)' }}>
                Closes automatically after 90 days with zero data loss.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
