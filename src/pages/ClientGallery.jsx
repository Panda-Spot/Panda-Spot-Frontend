import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { fileUrl, getClientEvent, listClientPhotos, submitClientSelection, toggleClientFavourite } from '../api.js'

// MERGE (Studio-Verse Photo Selection): a client's own gallery for one
// event — browse, favourite (up to the studio's cap), and submit their
// final pick (one-way lock, matches Studio-Verse's behavior exactly).
export default function ClientGallery() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    getClientEvent(eventId).then(setEvent).catch((e) => setError(e.message))
    listClientPhotos(eventId).then(setPhotos).catch((e) => setError(e.message))
  }

  useEffect(load, [eventId])

  const handleToggleFavourite = async (photoId, currentlyFavourite) => {
    setTogglingId(photoId)
    setError('')
    try {
      await toggleClientFavourite(eventId, photoId, !currentlyFavourite)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, is_favourite: !currentlyFavourite } : p)))
      getClientEvent(eventId).then(setEvent).catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await submitClientSelection(eventId)
      setEvent((prev) => ({ ...prev, submitted_at: res.submitted_at }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !event) return <p className="error">{error}</p>
  if (!event || !photos) return <p className="hint">Loading…</p>

  const favouriteCount = photos.filter((p) => p.is_favourite).length
  const locked = !!event.submitted_at
  const watermarkText = event.watermark_text || event.event_name || 'PandaSpot'
  const watermarkIntensity = Number.isFinite(Number(event.watermark_intensity)) ? Number(event.watermark_intensity) : 0.75

  return (
    <div
      className="protected-gallery"
      style={{ '--watermark-opacity': watermarkIntensity }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="section-title">{event.event_name}</h1>
      <p className="subtle">
        {event.favourite_cap ? `${favouriteCount} / ${event.favourite_cap} favourited` : `${favouriteCount} favourited`}
        {locked && ' — submitted, your selection is final'}
      </p>
      {error && <p className="error">{error}</p>}

      {!locked && (
        <button className="btn" type="button" onClick={handleSubmit} disabled={submitting || favouriteCount === 0}>
          {submitting ? 'Submitting…' : 'Submit my selection'}
        </button>
      )}

      <div className="photo-grid">
        {photos.map((p) => (
          <div className="photo-card" key={p.photo_id}>
            <div className="protected-photo-frame" data-watermark={watermarkText}>
              <img
                src={fileUrl(p.protected_thumbnail_url || p.protected_url)}
                alt={p.filename}
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            <button
              className="dismiss-btn"
              type="button"
              onClick={() => handleToggleFavourite(p.photo_id, p.is_favourite)}
              disabled={locked || togglingId === p.photo_id}
              title={p.is_favourite ? 'Remove favourite' : 'Favourite'}
              style={{ color: p.is_favourite ? '#e0245e' : undefined }}
            >
              <Heart fill={p.is_favourite ? 'currentColor' : 'none'} size={18} />
            </button>
          </div>
        ))}
        {photos.length === 0 && <p className="hint">No photos here yet — check back soon.</p>}
      </div>
    </div>
  )
}
