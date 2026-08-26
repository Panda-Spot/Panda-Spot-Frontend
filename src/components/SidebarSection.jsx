import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * A collapsible nav group in the sidebar (e.g. "Studio", "Platform").
 * Local, non-persisted open/closed state — re-opens on reload, which is
 * fine since these aren't primary navigation memory. When the sidebar
 * itself is collapsed to an icon rail, the label/chevron are hidden by CSS
 * and every item stays visible (no double-collapsing).
 */
export default function SidebarSection({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="sidebar-section">
      <button
        type="button"
        className="sidebar-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="sidebar-section-label">{label}</span>
        <ChevronDown size={14} className={`sidebar-section-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <div className="sidebar-section-body">{children}</div>}
    </div>
  )
}
