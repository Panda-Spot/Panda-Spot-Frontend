import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react'
import { useEvent } from './EventContext.jsx'

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
          <div className={`card ${event?.archived_at ? 'danger-zone' : ''}`}>
            <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete event
            </div>
            {event?.archived_at ? (
              <>
                <p className="hint">
                  Permanently deletes this event, every photo, and the guest link. This cannot be undone.
                </p>
                <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
                  {deletingEvent ? 'Deleting…' : 'Delete permanently'}
                </button>
              </>
            ) : (
              <>
                <p className="hint">
                  Archive this event first, then come back here to permanently delete it. Or delete directly — the event
                  will be archived and immediately deleted in one step.
                </p>
                <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
                  {deletingEvent ? 'Deleting…' : 'Archive & delete'}
                </button>
              </>
            )}
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
