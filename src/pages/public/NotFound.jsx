import { Link } from 'react-router-dom'
import { Camera, ArrowLeft, Home, Search } from 'lucide-react'
import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'

export default function NotFound() {
  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={() => {}} />

      <section className="marketing-section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="marketing-container" style={{ textAlign: 'center', maxWidth: 560 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'var(--primary-blue-bg)',
            color: 'var(--primary-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <Camera size={36} />
          </div>

          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-teal-dark)', display: 'block', marginBottom: 8 }}>
            404 Error
          </span>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 36, color: 'var(--text-main)', margin: '0 0 16px' }}>
            This page is not in the gallery.
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
            The link you followed may have expired, changed, or does not exist. Let&apos;s get you back to the main site.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/" className="marketing-btn marketing-btn-primary">
              <Home size={16} />
              <span>Back to PandaSpot</span>
            </Link>
            <Link to="/product" className="marketing-btn marketing-btn-secondary">
              <Search size={16} />
              <span>Explore Product</span>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={() => {}} />
    </div>
  )
}
