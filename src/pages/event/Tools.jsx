import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Wrench } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import PhotoToolsCard from '../../components/PhotoToolsCard.jsx'

export default function Tools() {
  const {
    eventId, event, photos, load,
    dupIds, setDupIds, setMetaPhotoId,
    handleToggleFeature, togglingFeature,
    requestStartEvent, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  // Full analysis has run once at least one photo carries hash data —
  // the filters need that data to match anything.
  const analyzed = photos.some((p) => p.file_hash)

  if (event && !event.started) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Wrench size={28} style={{ color: '#F59E0B' }} />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
        <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
          Start the event to unlock Tools and all other features.
        </p>
        {event.role === 'owner' ? (
            <button className="btn" type="button" onClick={requestStartEvent}>
              Start event
            </button>
        ) : (
          <p className="hint">Only the event owner can start the event.</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="event-stack">
        <PhotoToolsCard
          eventId={eventId}
          photos={photos.filter((p) => p.approval_status !== 'pending')}
          onAnalyzed={load}
          dupIds={dupIds}
          setDupIds={setDupIds}
          onOpenMeta={(photoId) => setMetaPhotoId(photoId)}
        />
        <div className="card">
          <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SlidersHorizontal size={14} /> Advanced photographic tools
          </div>
          <p className="hint">
            {event?.advanced_tools_enabled
              ? 'On — Sharpness, Faces, Min rating, Color tag and Duplicates filters are live on Photos & Imports.'
              : 'Run the full analysis above first, then enable this to unlock Sharpness, Faces, Min rating, Color tag and Duplicates filters on Photos & Imports.'}
          </p>
          {!analyzed && !event?.advanced_tools_enabled && (
            <p className="hint">No analyzed photos yet — run an analysis so the filters have data to match.</p>
          )}
          <button
            className={event?.advanced_tools_enabled ? 'btn secondary' : 'btn'}
            type="button"
            disabled={togglingFeature === 'advancedTools' || !event}
            onClick={() => handleToggleFeature('advancedTools', !event?.advanced_tools_enabled)}
          >
            {togglingFeature === 'advancedTools'
              ? 'Saving…'
              : event?.advanced_tools_enabled
                ? 'Disable advanced tools'
                : 'Enable advanced tools'}
          </button>
          {event?.advanced_tools_enabled && (
            <p className="hint" style={{ marginTop: 8 }}>
              Filters live in <Link to={`/events/${eventId}/photos`} style={{ color: '#F59E0B' }}>Photos & Imports</Link>.
            </p>
          )}
        </div>
        <div className="card">
          <div className="guest-link-label">How to use the results</div>
          <p className="hint">
            Duplicates-only filtering, ratings and color tags live on the gallery — open Photos &amp; Imports and use
            the Tool filters above the grid after an analysis run.
          </p>
        </div>
      </div>
    </div>
  )
}
