import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Share2, Download, X } from 'lucide-react'
import { downloadMatches, fileUrl, getPublicEvent, searchBySelfies, sendMatchFeedback } from '../api.js'
import { getGuestClientId } from '../guestId.js'
import { createWatermarkedShareImage, shareOrDownload } from '../shareImage.js'

const MAX_SELFIES = 3

export default function GuestEvent() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [selfies, setSelfies] = useState([])
  const [previews, setPreviews] = useState([])
  const [selfieHint, setSelfieHint] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')
  const feedbackTimer = useRef(null)
  const [sharingId, setSharingId] = useState(null)
  const [shareNote, setShareNote] = useState('')
  const shareTimer = useRef(null)

  useEffect(() => {
    getPublicEvent(slug)
      .then(setEvent)
      .catch((e) => setLoadError(e.message))
  }, [slug])

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      if (shareTimer.current) clearTimeout(shareTimer.current)
    }
  }, [])

  // Swap the page's manifest to one scoped to this event so a guest who
  // installs from this specific event's page gets an icon that reopens
  // straight into this event, not the photographer dashboard.
  useEffect(() => {
    if (!event) return
    const manifest = {
      name: event.studio_name ? `${event.studio_name} — PandaSpot` : 'PandaSpot',
      short_name: event.name?.slice(0, 12) || 'PandaSpot',
      description: `Spot yourself at ${event.name}`,
      start_url: `/e/${slug}`,
      scope: '/e/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: event.brand_color || '#aa3bff',
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
      ],
    }
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const url = URL.createObjectURL(blob)
    const link = document.getElementById('app-manifest')
    const previousHref = link?.getAttribute('href')
    if (link) link.setAttribute('href', url)

    return () => {
      URL.revokeObjectURL(url)
      if (link && previousHref) link.setAttribute('href', previousHref)
    }
  }, [event, slug])

  const handleSelfies = (e) => {
    const files = Array.from(e.target.files || [])
    const capped = files.slice(0, MAX_SELFIES)
    setSelfieHint(files.length > MAX_SELFIES ? `Using the first ${MAX_SELFIES} selfies` : '')
    setSelfies(capped)
    setPreviews(capped.map((file) => URL.createObjectURL(file)))
    setResult(null)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (selfies.length === 0) return
    setSearching(true)
    setError('')
    setResult(null)
    try {
      const data = await searchBySelfies(slug, selfies, getGuestClientId())
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!result?.matches?.length) return
    setDownloading(true)
    setError('')
    try {
      await downloadMatches(slug, result.matches.map((m) => m.photo_id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleNotMe = async (photoId) => {
    setError('')
    try {
      await sendMatchFeedback(slug, result.search_id, photoId)
      setResult((prev) => ({
        ...prev,
        matches: prev.matches.filter((m) => m.photo_id !== photoId),
      }))
      setFeedbackNote("Thanks — we'll fine-tune matching for this event.")
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setFeedbackNote(''), 2500)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleShare = async (match) => {
    if (!event) return
    setSharingId(match.photo_id)
    setError('')
    try {
      const guestUrl = `${window.location.origin}/e/${slug}`
      const blob = await createWatermarkedShareImage({
        photoUrl: fileUrl(match.url),
        eventName: event.name,
        guestUrl,
        studioName: event.studio_name,
        brandColor: event.brand_color,
      })
      const outcome = await shareOrDownload(blob, 'pandaspot-photo.png', {
        title: event.studio_name || 'PandaSpot',
        text: `Spot yourself at ${event.name} — ${guestUrl}`,
      })
      if (outcome === 'shared') setShareNote('Shared!')
      else if (outcome === 'downloaded') setShareNote('Saved — share it anywhere!')
      if (outcome !== 'cancelled') {
        if (shareTimer.current) clearTimeout(shareTimer.current)
        shareTimer.current = setTimeout(() => setShareNote(''), 2500)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSharingId(null)
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
        <h1 className="guest-tagline">Spot yourself. Get your photos.</h1>
        {loadError ? (
          <p className="error">{loadError}</p>
        ) : (
          <p className="subtle">{event ? event.name : 'Loading event…'}</p>
        )}
        {event?.logo_url && <p className="guest-powered-by">Powered by PandaSpot</p>}
      </div>

      {event?.expired ? (
        <div className="card">
          <p className="subtle">This event's search window has closed. Contact the photographer if you still need help finding your photos.</p>
        </div>
      ) : (
        <form className="card" onSubmit={handleSearch}>
          <p className="subtle">Upload up to {MAX_SELFIES} selfies — we'll find every photo you're in.</p>
          <div className="file-drop">
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleSelfies} />
            {selfieHint && <p className="hint">{selfieHint}</p>}
            {previews.length > 0 && (
              <div className="selfie-preview-row">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`Selfie preview ${i + 1}`} className="selfie-preview-thumb" />
                ))}
              </div>
            )}
          </div>
          <button className="btn" type="submit" disabled={searching || selfies.length === 0 || !event} style={{ marginTop: 16 }}>
            {searching ? 'Searching…' : 'Find My Photos'}
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {feedbackNote && <p className="hint feedback-note">{feedbackNote}</p>}
      {shareNote && <p className="hint feedback-note">{shareNote}</p>}

      {result && (
        <>
          <div className="row match-summary">
            <p className="hint">
              Detected {result.faces_detected_in_selfie} face(s) in your selfie(s) — found {result.matches.length} matching photo(s).
            </p>
            {result.matches.length > 0 && (
              <button className="btn secondary" type="button" onClick={handleDownloadAll} disabled={downloading}>
                <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {downloading ? 'Preparing zip…' : 'Download all'}
              </button>
            )}
          </div>
          <div className="match-grid">
            {result.matches.map((m) => (
              <div className="photo-card match-card" key={m.photo_id}>
                <img src={fileUrl(m.thumbnail_url || m.url)} alt={m.filename} />
                <div className="meta">
                  <span>Match</span>
                  <span>{Math.round(m.similarity * 100)}%</span>
                </div>
                <div className="match-card-actions">
                  <button
                    className="share-btn"
                    type="button"
                    onClick={() => handleShare(m)}
                    disabled={sharingId === m.photo_id}
                  >
                    <Share2 size={13} />
                    {sharingId === m.photo_id ? 'Preparing…' : 'Share'}
                  </button>
                  <button
                    className="dismiss-btn"
                    type="button"
                    onClick={() => handleNotMe(m.photo_id)}
                  >
                    <X size={13} />
                    Not me
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
