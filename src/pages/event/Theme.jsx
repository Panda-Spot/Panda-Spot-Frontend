import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEvent } from './EventContext.jsx'
import EventThemePicker from '../../components/EventThemePicker.jsx'

export default function Theme() {
  const { eventId, event, load, setActiveTab } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  return (
    <div>
      <div className="event-stack">
        {event && (event.role === 'owner' || event.role === 'collaborator') && (
          <EventThemePicker eventId={eventId} currentThemeId={event.gallery_theme_id} onSaved={load} />
        )}
        <div className="card">
          <div className="guest-link-label">Studio-wide themes &amp; domains</div>
          <p className="hint">Manage shared themes, subdomains and custom domains for the whole studio.</p>
          <Link className="btn secondary" to="/themes">
            Open Gallery Themes
          </Link>
        </div>
      </div>
    </div>
  )
}
