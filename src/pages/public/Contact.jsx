import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Send,
  CheckCircle2,
  Sparkles,
  Building,
  Calendar,
  MessageSquare,
  ShieldCheck
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: 'photographer',
    eventType: 'weddings',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={() => window.scrollTo({ top: 300, behavior: 'smooth' })} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Mail size={14} />
              <span>Get in Touch</span>
            </div>
            <h1 className="marketing-hero-title">
              Request Early Access <span>or Book a Demo.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              Connect with our product team to test PandaSpot on upcoming events or see a live walkthrough.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="early-access-form-card" style={{ maxWidth: 720 }}>
            {submitted ? (
              <div className="form-success-state">
                <div className="form-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 8px', fontSize: 24, color: 'var(--text-main)' }}>
                  Thanks! We received your request.
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: '0 0 20px', lineHeight: 1.5 }}>
                  Our team reviews all early-access applications and will reach out shortly regarding private preview access and live demonstration slots.
                </p>
                <button
                  type="button"
                  className="marketing-btn marketing-btn-secondary"
                  onClick={() => setSubmitted(false)}
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-name">Full Name *</label>
                    <input
                      id="contact-name"
                      required
                      className="form-input"
                      placeholder="Alex Taylor"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-email">Work Email *</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      className="form-input"
                      placeholder="alex@studio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-company">Studio / Organization</label>
                    <input
                      id="contact-company"
                      className="form-input"
                      placeholder="Aurora Media"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-role">Your Role</label>
                    <select
                      id="contact-role"
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="photographer">Solo Photographer</option>
                      <option value="studio_lead">Studio Lead / Owner</option>
                      <option value="event_planner">Event Planner / Coordinator</option>
                      <option value="corporate">Corporate Brand Team</option>
                      <option value="venue">Venue Manager</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-event-type">Primary Event Use Case</label>
                  <select
                    id="contact-event-type"
                    className="form-select"
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  >
                    <option value="weddings">Weddings & Private Celebrations</option>
                    <option value="conferences">Conferences & Industry Summits</option>
                    <option value="brand_activations">Brand Activations & PR Events</option>
                    <option value="festivals">Festivals & Concerts</option>
                    <option value="college">College / University Events</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-message">Message / Workflow Needs</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    className="form-textarea"
                    placeholder="Tell us about your photo delivery volume, assistant shooters, or upcoming events..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="marketing-btn marketing-btn-primary marketing-btn-lg"
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request / Book Demo'}
                  <Send size={16} />
                </button>

                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-subtle)', margin: '14px 0 0' }}>
                  Read our <Link to="/privacy" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>. We respect your inbox.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={() => window.scrollTo({ top: 300, behavior: 'smooth' })} />
    </div>
  )
}
