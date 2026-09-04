import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { KeyRound, Lock, Maximize } from 'lucide-react'
import {
  fileUrl,
  getGalleryKey,
  getTvFeed,
  subscribeToPublicLiveEvents,
  unlockGallery,
} from '../api.js'

// Live TV wall (Phase 8): the venue projector screen. Runs off the public
// on-air feed (branding + settings + moderated photos), advances on the
// studio's transition setting, and absorbs new arrivals instantly over
// SSE — with a 30s polling fallback so a dropped stream (or a locked
// venue, where EventSource can't send the unlock header) still refreshes.
// Layout keeps chrome in fixed bars so text never overlaps the photo:
// brand bar top, info bar bottom (event + sponsor + QR corner).
export default function GuestSlideshow() {
  const { slug } = useParams()
  const [feed, setFeed] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [locked, setLocked] = useState(false)
  const [photos, setPhotos] = useState([])
  const [index, setIndex] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const intervalRef = useRef(null)
  const pollRef = useRef(null)
  const shellRef = useRef(null)

  const loadFeed = useCallback(async (silent) => {
    try {
      const data = await getTvFeed(slug)
      setFeed(data)
      setPhotos(data.photos || [])
      setLocked(false)
      if (!silent) setLoadError('')
      return data
    } catch (e) {
      if (e.code === 'locked') {
        setLocked(true)
        setLoadError('')
      } else if (!silent) {
        setLoadError(e.message)
      }
      return null
    }
  }, [slug])

  useEffect(() => {
    setFeed(null)
    setPhotos([])
    setIndex(0)
    setLocked(false)
    setLoadError('')
    loadFeed(false)
  }, [slug, loadFeed])

  // Rotation on the studio's transition setting — restarts whenever the
  // photo set or setting changes so arrivals get a full dwell time.
  const transitionMs = feed?.settings?.tv_transition_ms || 5000
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (photos.length <= 1) return undefined
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, transitionMs)
    return () => clearInterval(intervalRef.current)
  }, [photos.length, transitionMs])

  // Live arrivals jump straight to the front and onto screen immediately.
  useEffect(() => {
    if (locked) return undefined
    return subscribeToPublicLiveEvents(slug, {
      onPhotoAdded: (data) => {
        setPhotos((prev) => (prev.some((p) => p.photo_id === data.photo_id) ? prev : [data, ...prev]))
        setIndex(0)
      },
    })
  }, [slug, locked])

  // Polling fallback: catches anything SSE missed (reconnect gaps, locked
  // venues where EventSource carries no unlock header). Silent — never
  // flashes errors over the wall.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => { loadFeed(true) }, 30000)
    return () => clearInterval(pollRef.current)
  }, [loadFeed])

  // Preload the next photo so turns never show an empty frame.
  useEffect(() => {
    if (photos.length < 2) return
    const next = photos[(index + 1) % photos.length]
    const img = new Image()
    img.src = fileUrl(next.thumbnail_url || next.url)
  }, [photos, index])

  // QR always points at the guest search page for this event.
  useEffect(() => {
    if (!feed?.settings?.tv_show_qr || !feed?.qr_target) {
      setQrDataUrl('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(`${window.location.origin}${feed.qr_target}`, { margin: 1, width: 160 })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => { if (!cancelled) setQrDataUrl('') })
    return () => { cancelled = true }
  }, [feed])

  const toggleFullscreen = () => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen?.().catch(() => {})
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!accessKey.trim()) return
    setUnlocking(true)
    setUnlockError('')
    try {
      await unlockGallery(slug, accessKey.trim())
      setAccessKey('')
      await loadFeed(false)
    } catch (err) {
      setUnlockError(err.message)
    } finally {
      setUnlocking(false)
    }
  }

  const current = photos[index]
  const event = feed?.event || null
  const settings = feed?.settings || {}
  const showQr = settings.tv_show_qr !== false && !!qrDataUrl
  const hasKey = !!getGalleryKey(slug)

  return (
    <div ref={shellRef} className="slideshow-shell tv-wall">
      {loadError ? (
        <div className="slideshow-waiting">
          <p className="error">{loadError}</p>
        </div>
      ) : locked && !hasKey ? (
        <div className="slideshow-waiting">
          <Lock size={34} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
          <h1>Locked gallery</h1>
          <p>Enter the venue access key to start the wall.</p>
          <form className="row" style={{ justifyContent: 'center', marginTop: 12, gap: 8 }} onSubmit={handleUnlock}>
            <input
              className="text-input"
              type="password"
              autoComplete="off"
              placeholder="Access key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <button className="btn" type="submit" disabled={unlocking || !accessKey.trim()}>
              {unlocking ? 'Unlocking…' : 'Unlock'}
            </button>
          </form>
          {unlockError && <p className="error" style={{ marginTop: 8 }}>{unlockError}</p>}
        </div>
      ) : !current ? (
        <div className="slideshow-waiting">
          {event?.logo_url && <img className="slideshow-logo" src={fileUrl(event.logo_url)} alt="" />}
          <h1>{event?.name || 'Waiting for photos…'}</h1>
          <p>
            {feed?.highlights_only
              ? 'The studio hasn’t starred any highlights yet — photos appear here once they do.'
              : 'Photos will appear here live as they come in.'}
          </p>
          {showQr && <img className="tv-qr-large" src={qrDataUrl} alt="Scan to find your photos" />}
        </div>
      ) : (
        <img
          key={current.photo_id}
          className="slideshow-image"
          src={fileUrl(current.thumbnail_url || current.url)}
          alt=""
        />
      )}

      {/* Fixed top brand bar — never overlaps the photo body. */}
      {event && (
        <div className="slideshow-overlay tv-topbar">
          <span className="tv-brand">
            {event.logo_url && <img className="slideshow-overlay-logo" src={fileUrl(event.logo_url)} alt="" />}
            <span>{event.studio_name ? `${event.studio_name} · ` : ''}{event.name}</span>
          </span>
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            {settings.sponsor_name && <span className="hint">Sponsored by {settings.sponsor_name}</span>}
            <button type="button" className="btn secondary" onClick={toggleFullscreen} title="Fullscreen TV mode">
              <Maximize size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Fixed bottom info bar: sponsor frame + QR corner. */}
      {event && (current || showQr || settings.sponsor_logo_url) && (
        <div className="slideshow-overlay tv-bottombar">
          <span className="tv-sponsor">
            {settings.sponsor_logo_url && (
              <img className="tv-sponsor-logo" src={fileUrl(settings.sponsor_logo_url)} alt={settings.sponsor_name || 'Sponsor'} />
            )}
          </span>
          <span className="tv-qr-corner">
            {showQr && (
              <>
                <img src={qrDataUrl} alt="Scan to find your photos" />
                <span className="hint">Scan to find your photos</span>
              </>
            )}
          </span>
        </div>
      )}

      {/* Hidden unlock affordance for locked venues that already hold a key. */}
      {locked && hasKey && (
        <div className="slideshow-overlay tv-bottombar" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn secondary" onClick={() => loadFeed(false)} title="Retry with saved key">
            <KeyRound size={14} /> Reconnect wall
          </button>
        </div>
      )}
    </div>
  )
}
