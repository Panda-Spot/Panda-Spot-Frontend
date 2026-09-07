import { useEffect } from 'react'
import { useEvent } from './EventContext.jsx'
import PhotoToolsCard from '../../components/PhotoToolsCard.jsx'

export default function Tools() {
  const {
    eventId, photos, load,
    dupIds, setDupIds, setMetaPhotoId,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

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
