import { useEffect } from 'react'
import { Wrench } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import PhotoToolsCard from '../../components/PhotoToolsCard.jsx'

export default function Tools() {
  const {
    eventId, event, photos, load,
    dupIds, setDupIds, setMetaPhotoId,
    handleStartEvent, startingEvent, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

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
          <button className="btn" type="button" onClick={handleStartEvent} disabled={startingEvent}>
            {startingEvent ? 'Starting…' : 'Start event'}
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
