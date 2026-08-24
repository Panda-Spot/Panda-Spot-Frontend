import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, ArrowRight, Sparkles, Search } from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'
import FAQAccordion from '../../components/public/FAQAccordion.jsx'

export default function FAQ() {
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
              <HelpCircle size={14} />
              <span>Support & Questions</span>
            </div>
            <h1 className="marketing-hero-title">
              Frequently Asked <span>Questions</span>
            </h1>
            <p className="marketing-hero-subtitle">
              Everything you need to know about setting up events, guest selfie discovery, pricing plans, and data privacy.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <FAQAccordion />

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 16 }}>
              Have a specific question not covered here?
            </p>
            <Link to="/contact" className="marketing-btn marketing-btn-primary">
              <span>Contact Us / Book Demo</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={openEarlyAccess} />
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
