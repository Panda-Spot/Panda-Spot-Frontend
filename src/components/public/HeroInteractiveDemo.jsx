import { useState } from 'react'
import {
  Camera,
  CheckCircle2,
  QrCode,
  Search,
  Download,
  Share2,
  Users,
  HardDrive,
  Sparkles,
  ArrowRight,
  ImageIcon
} from 'lucide-react'

export default function HeroInteractiveDemo() {
  const [activeTab, setActiveTab] = useState('match') // 'upload' | 'match' | 'share'

  return (
    <div className="marketing-showcase-container">
      {/* Left: Photographer Management Studio */}
      <div className="marketing-showcase-left">
        <div className="mockup-app-header">
          <div className="mockup-dots">
            <span className="mockup-dot mockup-dot-red"></span>
            <span className="mockup-dot mockup-dot-yellow"></span>
            <span className="mockup-dot mockup-dot-green"></span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>app.pandaspot.com/events/smith-wedding</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-teal-dark)', background: 'var(--accent-teal-bg)', padding: '2px 8px', borderRadius: 9999 }}>
            STUDIO WORKSPACE
          </span>
        </div>

        {/* Event Header Banner */}
        <div className="mockup-event-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                Sarah & David Wedding 2026
              </h4>
              <span style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                Active Event
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-subtle)' }}>
              Public Guest URL: <span style={{ color: 'var(--primary-blue)', fontWeight: 500 }}>pandaspot.com/e/sd-2026</span>
            </p>
          </div>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            background: 'var(--bg-soft)'
          }}>
            <QrCode size={20} />
          </div>
        </div>

        {/* Status Metrics */}
        <div className="mockup-stats-row">
          <div className="mockup-stat-card">
            <div className="mockup-stat-val">1,480</div>
            <div className="mockup-stat-lbl">Photos Indexed</div>
          </div>
          <div className="mockup-stat-card">
            <div className="mockup-stat-val">3,892</div>
            <div className="mockup-stat-lbl">Faces Detected</div>
          </div>
          <div className="mockup-stat-card">
            <div className="mockup-stat-val" style={{ color: 'var(--accent-teal-dark)' }}>100%</div>
            <div className="mockup-stat-lbl">Search Ready</div>
          </div>
        </div>

        {/* Studio Photo Batch Strip */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>Recent Batch Ingest</span>
            <span style={{ fontSize: 11, color: 'var(--accent-teal-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> pgvector Indexed
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { id: 1, label: 'IMG_4801.JPG', faces: 3, bg: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)' },
              { id: 2, label: 'IMG_4802.JPG', faces: 1, bg: 'linear-gradient(135deg, #99f6e4 0%, #14b8a6 100%)' },
              { id: 3, label: 'IMG_4803.JPG', faces: 4, bg: 'linear-gradient(135deg, #fed7aa 0%, #f97316 100%)' },
              { id: 4, label: 'IMG_4804.JPG', faces: 2, bg: 'linear-gradient(135deg, #fbcfe8 0%, #ec4899 100%)' },
            ].map((p) => (
              <div key={p.id} style={{
                background: p.bg,
                borderRadius: 8,
                height: 64,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 6,
                color: '#fff',
                fontSize: 10,
                boxShadow: 'inset 0 -15px 20px rgba(0,0,0,0.3)'
              }}>
                <span style={{ fontWeight: 600 }}>{p.faces} faces</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Simulation Toggles */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
            Interactive Demo Mode:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: activeTab === 'match' ? 'var(--primary-blue)' : 'var(--border-light)',
                background: activeTab === 'match' ? 'var(--primary-blue-bg)' : 'transparent',
                color: activeTab === 'match' ? 'var(--primary-blue)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Selfie Match
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('share')}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: activeTab === 'share' ? 'var(--accent-teal)' : 'var(--border-light)',
                background: activeTab === 'share' ? 'var(--accent-teal-bg)' : 'transparent',
                color: activeTab === 'share' ? 'var(--accent-teal-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Guest Share
            </button>
          </div>
        </div>
      </div>

      {/* Right: Guest Mobile Discovery Simulation */}
      <div className="marketing-showcase-right">
        <div className="mockup-phone-frame">
          <div className="mockup-phone-screen">
            <div className="mockup-phone-pill"></div>

            {/* Mobile Guest Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #14B8A6 100%)',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                Aurora Photography
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Sarah & David Wedding
              </div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>
                Spot yourself. Get your photos.
              </div>
            </div>

            {activeTab === 'match' ? (
              <>
                {/* Guest Selfie Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--bg-soft)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Camera size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)' }}>Guest Selfie Analyzed</div>
                    <div style={{ fontSize: 10, color: 'var(--accent-teal-dark)', fontWeight: 600 }}>4 matching photos found</div>
                  </div>
                </div>

                {/* Personal Results Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflow: 'hidden' }}>
                  {[
                    { id: 1, score: '98%', bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
                    { id: 2, score: '95%', bg: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)' },
                    { id: 3, score: '92%', bg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' },
                    { id: 4, score: '89%', bg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' },
                  ].map((m) => (
                    <div key={m.id} style={{
                      height: 80,
                      background: m.bg,
                      borderRadius: 8,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: 6,
                      color: '#fff'
                    }}>
                      <span style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 700
                      }}>
                        {m.score} match
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <span style={{ background: 'rgba(255,255,255,0.85)', color: '#0f172a', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 600 }}>
                          Save
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                  <button style={{
                    flex: 1,
                    background: 'var(--primary-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}>
                    <Download size={12} /> Download 4
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('share')}
                    style={{
                      background: 'var(--accent-teal-bg)',
                      color: 'var(--accent-teal-dark)',
                      border: '1px solid rgba(20,184,166,0.3)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <Share2 size={12} /> Share
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Watermarked Share Image Preview */}
                <div style={{
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    height: 140,
                    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <ImageIcon size={32} opacity={0.6} />
                  </div>
                  {/* Watermark Banner */}
                  <div style={{
                    background: '#1E40AF',
                    color: '#fff',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700 }}>Aurora Photography · via PandaSpot</div>
                      <div style={{ fontSize: 8, opacity: 0.85 }}>Spot yourself at pandaspot.com/e/sd-2026</div>
                    </div>
                    <QrCode size={18} color="#fff" />
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0' }}>
                  Viral sharing footer automatically generated for social media.
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('match')}
                    style={{
                      flex: 1,
                      background: 'var(--bg-soft)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      padding: '8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Back to Grid
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'var(--accent-teal)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer'
                  }}>
                    <Share2 size={12} /> Post to Story
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
