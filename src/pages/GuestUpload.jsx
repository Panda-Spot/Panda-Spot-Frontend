import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fileUrl, getPublicEvent, uploadGuestPhotos } from '../api.js'
import { getGuestClientId } from '../guestId.js'
import Dropzone from '../components/Dropzone.jsx'

export default function GuestUpload() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    getPublicEvent(slug)
      .then(setEvent)
      .catch((e) => setLoadError(e.message))
  }, [slug])

  const handleFiles = async (files) => {
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const data = await uploadGuestPhotos(slug, files, getGuestClientId())
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const accentStyle = event?.brand_color ? { '--accent': event.brand_color } : undefined
  const heroStyle = event?.brand_color
    ? { background: `linear-gradient(135deg, ${event.brand_color}, var(--accent-2))` }
    : undefined

  return (
    <div className="guest-shell" style={accentStyle}>
      <div className="guest-hero" style={heroStyle}>
        {event?.logo_url ? (
          <img className="guest-logo" src={fileUrl(event.logo_url)} alt={event.studio_name || 'Studio logo'} />
        ) : (
          <div className="guest-brand">PandaSpot</div>
        )}
        {event?.studio_name && <p className="guest-studio-name">{event.studio_name}</p>}
        <h1 className="guest-tagline">Share your photos</h1>
        {loadError ? (
          <p className="error">{loadError}</p>
        ) : (
          <p className="subtle">{event ? event.name : 'Loading event…'}</p>
        )}
      </div>

      {loadError ? null : event && !event.guest_upload_enabled ? (
        <div className="card">
          <p className="subtle">Guest uploads aren't open for this event.</p>
        </div>
      ) : event?.expired ? (
        <div className="card">
          <p className="subtle">This event's guest access has closed.</p>
        </div>
      ) : (
        <div className="card">
          <p className="subtle">
            Got a great shot from the event? Add it here — it'll be reviewed by the photographer before it
            joins the gallery, so others can find themselves in it too.
          </p>
          <Dropzone
            onFiles={handleFiles}
            accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mkv,.mov,.m4v,.avi"
            disabled={uploading || !event}
            hint="Photos or video (MP4/MOV/WebM/MKV/AVI) — up to 10 at a time"
          />
          {uploading && <p className="hint" style={{ marginTop: 12 }}>Uploading…</p>}
          {error && <p className="error">{error}</p>}
          {result && (
            <div className="hint feedback-note" style={{ marginTop: 12 }}>
              {result.uploaded > 0 && (
                <p>
                  {result.uploaded} photo{result.uploaded === 1 ? '' : 's'} submitted — thanks! They'll appear
                  once the photographer approves them.
                </p>
              )}
              {result.skipped?.length > 0 && (
                <>
                  <p>Couldn't add {result.skipped.length} file(s):</p>
                  <ul className="notice-list">
                    {result.skipped.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
