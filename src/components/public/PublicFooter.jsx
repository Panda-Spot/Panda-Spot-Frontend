import { Link } from 'react-router-dom'
import { Camera, ShieldCheck, Lock, ExternalLink } from 'lucide-react'

export default function PublicFooter({ onOpenEarlyAccess }) {
  return (
    <footer className="marketing-footer">
      <div className="marketing-container">
        <div className="footer-grid">
          {/* Col 1: Brand info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1E40AF 0%, #14B8A6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Camera size={18} />
              </div>
              <span className="footer-brand-title" style={{ margin: 0 }}>PandaSpot</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 0 18px' }}>
              Turn large event photo collections into a discoverable, branded delivery experience.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 10px', borderRadius: 9999 }}>
              <ShieldCheck size={14} />
              <span>Event-Scoped Privacy by Design</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><Link to="/product">System Overview</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/features">Feature Catalog</Link></li>
              <li><Link to="/faq">Launch FAQ</Link></li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div>
            <div className="footer-col-title">Solutions</div>
            <ul className="footer-links">
              <li><Link to="/for-photographers">For Photographers & Studios</Link></li>
              <li><Link to="/for-event-teams">For Event Teams & Venues</Link></li>
              <li><button type="button" onClick={onOpenEarlyAccess} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Book a Product Demo</button></li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <div className="footer-col-title">Trust & Privacy</div>
            <ul className="footer-links">
              <li><Link to="/privacy">Data Handling Policy</Link></li>
              <li><Link to="/privacy#event-scoped">Event Isolation</Link></li>
              <li><Link to="/about">Mission & Principles</Link></li>
            </ul>
          </div>

          {/* Col 5: Access */}
          <div>
            <div className="footer-col-title">Access</div>
            <ul className="footer-links">
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/contact">Early Access Form</Link></li>
              <li><button type="button" onClick={onOpenEarlyAccess} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Request Demo</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} PandaSpot. Built for event photo delivery & discovery.
          </div>
          <div style={{ display: 'flex', gap: 20, color: '#64748b' }}>
            <span>No unverified claims</span>
            <span>•</span>
            <span>Pre-Launch SaaS Specification</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
