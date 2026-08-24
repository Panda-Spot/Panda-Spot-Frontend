import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Globe,
  ShieldCheck
} from 'lucide-react'

import PublicNavbar from '../../components/public/PublicNavbar.jsx'
import PublicFooter from '../../components/public/PublicFooter.jsx'
import EarlyAccessModal from '../../components/public/EarlyAccessModal.jsx'

export default function ForEventTeams() {
  const [modalOpen, setModalOpen] = useState(false)
  const openEarlyAccess = () => setModalOpen(true)
  const closeEarlyAccess = () => setModalOpen(false)

  const useCases = [
    {
      title: 'Conferences & Industry Summits',
      desc: 'Deliver keynotes, panel discussions, and networking photos directly to attendees without forcing them to hunt through multi-gigabyte albums.',
      icon: Globe
    },
    {
      title: 'Brand Activations & PR Events',
      desc: 'Give VIP guests and influencers branded, watermarked photos ready for immediate social distribution to amplify event hashtag reach.',
      icon: Award
    },
    {
      title: 'College & University Galas',
      desc: 'Simplify photo distribution across graduating classes, alumni reunions, and campus festivals with self-service discovery.',
      icon: Users
    },
    {
      title: 'Venues & Hospitality Spaces',
      desc: 'Offer an elevated photography amenity for ballroom events, private parties, and corporate retreats with custom venue branding.',
      icon: Building
    }
  ]

  return (
    <div className="marketing-root">
      <PublicNavbar onOpenEarlyAccess={openEarlyAccess} />

      <section className="marketing-hero" style={{ paddingBottom: 48 }}>
        <div className="marketing-container">
          <div className="marketing-hero-header">
            <div className="marketing-pill-label">
              <Building size={14} />
              <span>For Event Teams & Organizers</span>
            </div>
            <h1 className="marketing-hero-title">
              Give attendees a better way <span>to discover event photos.</span>
            </h1>
            <p className="marketing-hero-subtitle">
              A centralized event destination that connects photo collections, brand presentation, and attendee discovery across corporate summits, galas, and venues.
            </p>
            <div className="marketing-hero-ctas">
              <button type="button" className="marketing-btn marketing-btn-primary marketing-btn-lg" onClick={openEarlyAccess}>
                Talk to Us / Request Demo
              </button>
              <Link to="/product" className="marketing-btn marketing-btn-secondary marketing-btn-lg">
                View System Architecture
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Challenges & Solutions */}
      <section className="marketing-section marketing-section-alt">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Event Scale</div>
            <h2 className="marketing-section-title">Solve Large-Scale Distribution Bottlenecks</h2>
            <p className="marketing-section-desc">
              When thousands of attendees attend an event, traditional delivery methods fail.
            </p>
          </div>

          <div className="marketing-grid-3">
            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <Users size={22} />
              </div>
              <h3 className="benefit-title">Large Attendee Lists</h3>
              <p className="benefit-desc">
                PandaSpot scales effortlessly to thousands of guests. Attendees find only their photos without needing custom pre-registered attendee credentials.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap teal">
                <Layers size={22} />
              </div>
              <h3 className="benefit-title">Multi-Stakeholder Delivery</h3>
              <p className="benefit-desc">
                Organizers, sponsors, and photographers collaborate seamlessly. Scoped assistant roles allow multiple photographers to upload to one unified gallery.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-wrap">
                <ShieldCheck size={22} />
              </div>
              <h3 className="benefit-title">Brand Consistency</h3>
              <p className="benefit-desc">
                Ensure all attendee downloads, QR displays, and social shares strictly reflect event or sponsor visual guidelines with custom color and logo theming.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-header">
            <div className="marketing-section-tag">Versatile Use Cases</div>
            <h2 className="marketing-section-title">Built for Diverse Event Experiences</h2>
            <p className="marketing-section-desc">
              From corporate brand launches to university graduations, PandaSpot delivers.
            </p>
          </div>

          <div className="marketing-grid-4">
            {useCases.map((uc, i) => {
              const IconComp = uc.icon
              return (
                <div key={i} className="benefit-card">
                  <div className="benefit-icon-wrap teal">
                    <IconComp size={22} />
                  </div>
                  <h3 className="benefit-title" style={{ fontSize: 17 }}>{uc.title}</h3>
                  <p className="benefit-desc">{uc.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="marketing-container">
          <h2 className="final-cta-title">Plan your next event with PandaSpot</h2>
          <p className="final-cta-desc">Speak with our team to discuss attendee volume, custom branding, or enterprise needs.</p>
          <button type="button" className="marketing-btn marketing-btn-teal marketing-btn-lg" onClick={openEarlyAccess}>
            Schedule a Demo
          </button>
        </div>
      </section>

      <PublicFooter onOpenEarlyAccess={openEarlyAccess} />
      <EarlyAccessModal open={modalOpen} onClose={closeEarlyAccess} />
    </div>
  )
}
