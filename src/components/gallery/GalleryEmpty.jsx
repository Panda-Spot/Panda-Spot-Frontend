import { ImageOff } from 'lucide-react'

// Icon empty-state for studio galleries — never a bare text line. `action`
// is an optional { label, onClick } for contextual recovery (e.g. clearing
// filters, opening the Tools scan).
export default function GalleryEmpty({ icon: Icon = ImageOff, title, hint, action }) {
  return (
    <div className="gallery-empty">
      <div className="gallery-empty-icon">
        <Icon size={26} />
      </div>
      <div className="gallery-empty-title">{title}</div>
      {hint && <p className="hint gallery-empty-hint">{hint}</p>}
      {action && (
        <button className="btn secondary" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
