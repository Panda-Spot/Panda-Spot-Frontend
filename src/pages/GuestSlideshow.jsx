import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fileUrl, getPublicEvent, getPublicGallery, subscribeToPublicLiveEvents } from '../api.js'

const ADVANCE_MS = 5000

export default function GuestSlideshow() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [photos, setPhotos] = useState([])
  const [index, setIndex] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    getPublicEvent(slug)
      .then(setEvent)
      .catch((e) => setLoadError(e.message))
  }, [slug])

  useEffect(() => {
    getPublicGallery(slug)
      .then((data) => setPhotos(data.photos || []))
      .catch(() => setPhotos([]))
  }, [slug])

  // Auto-advance through whatever's currently loaded — restarts its own
  // timer whenever the photo set changes so a newly-arrived photo (below)
  // gets a full dwell time before moving on.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (photos.length <= 1) return undefined
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, ADVANCE_MS)
    return () => clearInterval(intervalRef.current)
  }, [photos.length])

  // A "TV-facing" live mosaic: any photo landing during the event (from any
  // source — direct upload, PandaShoots, Drive import, or an approved guest
  // upload) jumps straight to the front and onto screen immediately, rather
  // than waiting its turn in the rotation.
  useEffect(() => {
    return subscribeToPublicLiveEvents(slug, {
      onPhotoAdded: (data) => {
        setPhotos((prev) => (prev.some((p) => p.photo_id === data.photo_id) ? prev : [data, ...prev]))
        setIndex(0)
      },
    })
  }, [slug])

  const current = photos[index]

  return (
    <div className="slideshow-shell">
      {loadError ? (
        <p className="error">{loadError}</p>
      ) : !current ? (
        <div className="slideshow-waiting">
          {event?.logo_url && <img className="slideshow-logo" src={fileUrl(event.logo_url)} alt="" />}
          <h1>{event?.name || 'Waiting for photos…'}</h1>
          <p>Photos will appear here live as they come in.</p>
        </div>
      ) : (
        <img
          key={current.photo_id}
          className="slideshow-image"
          src={fileUrl(current.thumbnail_url || current.url)}
          alt=""
        />
      )}

      {event && (
        <div className="slideshow-overlay">
          {event.logo_url && <img className="slideshow-overlay-logo" src={fileUrl(event.logo_url)} alt="" />}
          <span>{event.studio_name ? `${event.studio_name} · ` : ''}{event.name}</span>
        </div>
      )}
    </div>
  )
}
