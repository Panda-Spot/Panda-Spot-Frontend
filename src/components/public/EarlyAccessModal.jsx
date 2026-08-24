import { useState } from 'react'
import { X, CheckCircle, Sparkles, Send, Building, User, Mail, Calendar, MessageSquare } from 'lucide-react'

export default function EarlyAccessModal({ open, onClose }) {
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

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    // Simulate submission / store locally
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  const resetForm = () => {
    setSubmitted(false)
    setFormData({
      name: '',
      email: '',
      company: '',
      role: 'photographer',
      eventType: 'weddings',
      message: ''
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#1E40AF" />
            <h3 className="modal-title">Request Early Access / Book Demo</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {submitted ? (
            <div className="form-success-state">
              <div className="form-success-icon">
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 8px', fontSize: 22, color: 'var(--text-main)' }}>
                Request Received!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: '0 0 24px', lineHeight: 1.5 }}>
                Thank you for your interest in PandaSpot. We will review your submission and reach out regarding early access slots and live demonstration sessions.
              </p>
              <button type="button" className="marketing-btn marketing-btn-primary" onClick={resetForm}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                Join our private preview program for photographers, studios, and event teams.
              </p>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-name">Full Name *</label>
                  <input
                    id="modal-name"
                    required
                    className="form-input"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-email">Work Email *</label>
                  <input
                    id="modal-email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="jane@studio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-company">Studio / Company Name</label>
                  <input
                    id="modal-company"
                    className="form-input"
                    placeholder="Aurora Photography"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-role">Your Role</label>
                  <select
                    id="modal-role"
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="photographer">Solo Photographer</option>
                    <option value="studio_owner">Studio Owner / Lead</option>
                    <option value="event_organizer">Event Planner / Organizer</option>
                    <option value="corporate">Corporate Brand Team</option>
                    <option value="venue">Venue Manager</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-event-type">Primary Event Use Case</label>
                <select
                  id="modal-event-type"
                  className="form-select"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                >
                  <option value="weddings">Weddings & Private Celebrations</option>
                  <option value="conferences">Conferences & Summits</option>
                  <option value="brand_activations">Brand Activations & PR Events</option>
                  <option value="festivals">Festivals & Concerts</option>
                  <option value="college">College / University Events</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-message">Any specific workflow requirements?</label>
                <textarea
                  id="modal-message"
                  rows={2}
                  className="form-textarea"
                  placeholder="e.g. typical event photo count, assistant shooters..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="marketing-btn marketing-btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Early Access Request'}
                <Send size={15} />
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)', margin: '12px 0 0' }}>
                We respect your privacy. No spam or unverified claims.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
