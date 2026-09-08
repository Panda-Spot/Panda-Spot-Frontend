import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Camera, Images, Search, Trash2 } from 'lucide-react'
import { useEvent } from './EventContext.jsx'

const FEATURE_CARDS = [
  {
    key: 'faceSearch',
    icon: Search,
    title: 'Face Search',
    desc: 'Guests find their own photos with a selfie',
  },
  {
    key: 'photoSelection',
    icon: Images,
    title: 'Photo Selection',
    desc: 'Clients log in to browse, favourite, and submit picks',
  },
  {
    key: 'pandashoots',
    icon: Camera,
    title: 'PandaShoots',
    desc: 'Camera-to-cloud capture over FTP while shooting',
  },
]

export default function Danger() {
  const {
    eventId, event,
    archiving, handleArchive, handleRestore,
    handleToggleFeature, togglingFeature,
    handleDeleteEvent, deletingEvent,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  return (
    <div>
      <div className="event-stack">
        <div className="card">
          <div className="guest-link-label">Features</div>
          <p className="hint">
            Turn features on or off — they run independently on this same event and gallery. Switching one off
            hides its workspace immediately (nothing is deleted).
          </p>
          <p className="hint">
            AI indexed photos: {event?.ai_indexed_photo_count ?? 0}. Currently searchable: {event?.face_search_searchable_photo_count ?? 0}.
          </p>
          <div className="feature-grid">
            {FEATURE_CARDS.map(({ key, icon: Icon, title, desc }) => {
              const on = key === 'faceSearch'
                ? !!event?.face_search_enabled
                : key === 'photoSelection'
                  ? !!event?.photo_selection_enabled
                  : !!event?.pandashoots_enabled
              const busy = togglingFeature === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`feature-card${on ? ' on' : ''}`}
                  disabled={busy || !event}
                  onClick={() => handleToggleFeature(key, !on)}
                  aria-pressed={on}
                >
                  <span className="feature-card-icon"><Icon size={20} /></span>
                  <span className="feature-card-text">
                    <span className="feature-card-title">{title}</span>
                    <span className="hint">{desc}</span>
                  </span>
                  <span className={`feature-card-pill${on ? ' on' : ''}`}>
                    {busy ? '…' : on ? 'ON' : 'OFF'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {event && (
          <div className={`card${event.archived_at ? ' danger-zone' : ''}`}>
            <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {event.archived_at ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {event.archived_at ? 'Archived' : 'Archive & delete'}
            </div>
            {event.archived_at ? (
              <p className="hint">
                Archived {new Date(event.archived_at).toLocaleDateString()} — hidden from guests and clients.
                Nothing is deleted. Restore it, or delete everything permanently below.
              </p>
            ) : (
              <p className="hint">
                Archiving hides the event from guests and clients without deleting anything. Deleting permanently
                removes the event, every photo, and the guest link — this cannot be undone.
              </p>
            )}
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {event.archived_at ? (
                <button className="btn secondary" type="button" onClick={handleRestore} disabled={archiving}>
                  <ArchiveRestore size={14} /> {archiving ? 'Restoring…' : 'Restore event'}
                </button>
              ) : (
                <button className="btn secondary" type="button" onClick={handleArchive} disabled={archiving}>
                  <Archive size={14} /> {archiving ? 'Archiving…' : 'Archive event'}
                </button>
              )}
              {event.role === 'owner' && (
                <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
                  <Trash2 size={14} /> {deletingEvent ? 'Deleting…' : event.archived_at ? 'Delete permanently' : 'Archive & delete'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="guest-link-label">Changed your mind?</div>
          <p className="hint">Back to the everyday pages — nothing here runs unless you click it.</p>
          <Link className="btn secondary" to={`/events/${eventId}`}>
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  )
}
