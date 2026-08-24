import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'What is PandaSpot?',
    a: 'PandaSpot is an event photo delivery and discovery platform for photographers, studios, and event organizers. It transforms bulk photo sets into an organized, branded gallery where attendees discover their personal photos using a selfie search.'
  },
  {
    q: 'Who is PandaSpot built for?',
    a: 'PandaSpot is built for wedding photographers, portrait studios, event organizers, conference planners, and brand activation teams who need a professional, automated way to distribute large photo collections without manual sorting.'
  },
  {
    q: 'How do guests find their photos?',
    a: 'Guests open the event link or scan the event QR code, upload up to three front-facing selfies, and the system instantly matches them against the event gallery using facial recognition embeddings. They can then view, download, or share their photos.'
  },
  {
    q: 'Does a guest need to install an app or create an account?',
    a: 'No. Guests never need to download an app or register an account. The guest experience runs entirely in standard mobile and desktop web browsers and can optionally be installed as an event-specific web shortcut (PWA).'
  },
  {
    q: 'How does the event link or QR experience work?',
    a: 'Every event created by a photographer gets a unique, public URL (e.g. /e/event-name) and a printable table card QR code generated directly in the dashboard. Guests simply scan the QR code with their native phone camera to land on the branded event page.'
  },
  {
    q: 'What happens to uploaded event photos?',
    a: 'Photos are stored securely in event-isolated directories. For fast gallery browsing, lightweight 480px previews are generated, while full-resolution originals are preserved for single-image and zip archive downloads.'
  },
  {
    q: 'How does PandaSpot handle guest privacy?',
    a: 'Facial embeddings are mathematically isolated per event and are never cross-referenced across unrelated events or used for global profiling. Guest selfie queries are processed solely to match photos within that specific event.'
  },
  {
    q: 'Can photographers control downloads and branding?',
    a: 'Yes. Photographers customize their studio name, logo, and brand color, which automatically display across guest pages, printable QR cards, and watermarked social share images. Events also feature an automatic 90-day guest window soft-close.'
  },
  {
    q: 'Can I use PandaSpot for corporate events, colleges, and festivals?',
    a: 'Yes. PandaSpot supports events of all sizes, from 50-person private gatherings to multi-thousand attendee conferences, college galas, and festivals.'
  },
  {
    q: 'How will pricing work and is PandaSpot available?',
    a: 'PandaSpot is currently in private preview. Pricing plans and commercial launch details will be announced when public access opens. Photographers and event teams can request early access today.'
  }
]

export default function FAQAccordion({ limit }) {
  const [openIdx, setOpenIdx] = useState(0)

  const items = limit ? FAQ_ITEMS.slice(0, limit) : FAQ_ITEMS

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <div className="faq-list">
      {items.map((item, idx) => {
        const isOpen = openIdx === idx
        return (
          <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="faq-trigger"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown size={18} className="faq-icon" />
            </button>
            {isOpen && (
              <div className="faq-body">
                {item.a}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
