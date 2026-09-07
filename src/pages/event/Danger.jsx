import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Archive, ArchiveRestore } from 'lucide-react'
import { useEvent } from './EventContext.jsx'

// Locked-down controls: archiving, feature switches and deletion live only
// here — features are chosen at event creation and shouldn't be flipped
// casually from the everyday pages.
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <AlertTriangle size={22} style={{ color: '#FBBF24' }} /> Danger section
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Archiving, feature switches and deletion — think twice here. Features are picked at creation; this is the only place they change afterwards.
        </p>
      </div>

      <div className="event-stack">
        <div className="card">
          <div className="guest-link-label">Features</div>
          <p className="hint">
            Turn on either or both — they run independently on this same event and gallery. Switching a feature off
            hides its workspace immediately (nothing is deleted).
          </p>
          <p className="hint">
            AI indexed photos: {event?.ai_indexed_photo_count ?? 0}. Currently searchable: {event?.face_search_searchable_photo_count ?? 0}.
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!event?.face_search_enabled}
              disabled={togglingFeature === 'faceSearch'}
              onChange={(e) => handleToggleFeature('faceSearch', e.target.checked)}
            />
            Face Search — guests find their own photos with a selfie
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!event?.photo_selection_enabled}
              disabled={togglingFeature === 'photoSelection'}
              onChange={(e) => handleToggleFeature('photoSelection', e.target.checked)}
            />
            Photo Selection — clients log in to browse, favourite, and submit picks
          </label>
        </div>

        {event && (
          <div className="card">
            <div className="guest-link-label">Archive</div>
            {event.archived_at ? (
              <>
                <p className="hint">
                  Archived {new Date(event.archived_at).toLocaleDateString()} — hidden from guests and clients. Nothing is deleted.
                </p>
                <button className="btn secondary" type="button" onClick={handleRestore} disabled={archiving}>
                  <ArchiveRestore size={14} /> {archiving ? 'Restoring…' : 'Restore event'}
                </button>
              </>
            ) : (
              <>
                <p className="hint">Archiving hides the event from guests and clients without deleting anything.</p>
                <button className="btn secondary" type="button" onClick={handleArchive} disabled={archiving}>
                  <Archive size={14} /> {archiving ? 'Archiving…' : 'Archive event'}
                </button>
              </>
            )}
          </div>
        )}

        {event?.role === 'owner' && (
          <div className="card danger-zone">
            <div className="guest-link-label">Delete event</div>
            <p className="hint">Permanently deletes this event, every photo, and the guest link. Guests will no longer be able to search this event.</p>
            <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
              {deletingEvent ? 'Deleting.' : 'Delete event'}
            </button>
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
