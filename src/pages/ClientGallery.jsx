import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, Clock, Heart, Lock, Send } from 'lucide-react'
import {
  fileUrl,
  getClientEvent,
  listClientAlbums,
  listClientEvents,
  listClientPhotos,
  listStudioPickIds,
  submitClientSelection,
  toggleClientFavourite,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import useBrandColours from '../hooks/useBrandColours.js'
import GoldButton from '../components/ui/GoldButton.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'
import GalleryMedia from '../components/GalleryMedia.jsx'
import FavouritesDrawer from '../components/gallery/FavouritesDrawer.jsx'
import { formatDate } from '../utils/formatters.js'

// A client's gallery for one event — browse, favourite (up to the
// studio's cap), and submit the final pick (one-way lock). Sticky brand
// header with live counter, submitted/expiry/unpublished banners, studio
// pick badges, a favourites bottom-sheet with its own download, and an
// Access Expired screen for revoked/expired/archived grants.
export default function ClientGallery() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const containerRef = useRef(null)
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState(null) // Error object — may carry event_name + reason
  const [togglingId, setTogglingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [studioPicks, setStudioPicks] = useState([])
  const [albums, setAlbums] = useState([])
  const [eventCount, setEventCount] = useState(1)
  const [logoOk, setLogoOk] = useState(true)

  const load = (silent) => {
    if (!silent) {
      setError(null)
    }
    getClientEvent(eventId)
      .then((ev) => { setEvent(ev); setError(null) })
      .catch((e) => { if (!silent) setError(e); else setError((prev) => prev || e) })
    listClientPhotos(eventId)
      .then(setPhotos)
      .catch((e) => { if (!silent) setError(e) })
    listStudioPickIds(eventId)
      .then((data) => setStudioPicks(data.photo_ids || []))
      .catch(() => setStudioPicks([]))
    // Album proofing (Phase 23): albums the studio sent for review.
    listClientAlbums(eventId)
      .then(setAlbums)
      .catch(() => setAlbums([]))
  }

  useEffect(() => {
    setEvent(null)
    setPhotos(null)
    setError(null)
    setLogoOk(true)
    load(false)
    listClientEvents().then((evs) => setEventCount(evs.length)).catch(() => {})
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Protected media tokens are short-lived — silently refetch the photo
  // list ahead of expiry so images keep loading (never while a favourite
  // toggle is in flight, so optimistic state isn't clobbered).
  useEffect(() => {
    const timer = setInterval(() => {
      if (togglingId != null) return
      listClientPhotos(eventId).then(setPhotos).catch(() => {})
    }, 45000)
    return () => clearInterval(timer)
  }, [eventId, togglingId])

  // No copying on this page — matches the protected-gallery treatment.
  useEffect(() => {
    const handler = (e) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  useBrandColours(containerRef, event?.brand_color || null, null)

  const handleToggleFavourite = async (photoId, currentlyFavourite) => {
    setTogglingId(photoId)
    setError(null)
    try {
      await toggleClientFavourite(eventId, photoId, !currentlyFavourite)
      setPhotos((prev) => prev.map((p) => (p.photo_id === photoId ? { ...p, is_favourite: !currentlyFavourite } : p)))
      getClientEvent(eventId).then(setEvent).catch(() => {})
    } catch (e) {
      setError(e.message)
      showToast(e.message, { type: 'error' })
    } finally {
      setTogglingId(null)
    }
  }

  const handleSubmit = async () => {
    const count = (photos || []).filter((p) => p.is_favourite).length
    const ok = await confirm(
      count > 0
        ? `Submit your ${count} favourite${count === 1 ? '' : 's'}? Once submitted, you won't be able to change your selection unless your studio unlocks it.`
        : "Submit with no favourites selected? Once submitted, you won't be able to add any unless your studio unlocks it.",
      { title: 'Submit favourites?', confirmLabel: 'Submit', danger: false }
    )
    if (!ok) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitClientSelection(eventId)
      setEvent((prev) => ({ ...prev, submitted_at: res.submitted_at }))
      showToast('Favourites submitted!')
    } catch (e) {
      setError(e.message)
      showToast(e.message, { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Revoked / expired / archived grants land here with the event name and
  // reason attached by the API — a proper locked screen, not a bare 404.
  if (error && !event) {
    const reason = error.reason
    const eventName = error.event_name || 'this event'
    const headline = reason === 'expired' ? 'Access Expired' : reason === 'revoked' ? 'Access Revoked' : reason === 'archived' ? 'Event Archived' : 'No access'
    const detail = reason === 'expired'
      ? `Your access to "${eventName}" has expired. Contact your studio to renew it.`
      : reason === 'revoked'
        ? `Your access to "${eventName}" was revoked by the studio. Contact them if this looks wrong.`
        : reason === 'archived'
          ? `"${eventName}" is archived right now. Check back once the studio restores it.`
          : (error.message || "You don't have access to this event")
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
          <Lock size={34} style={{ color: '#F87171' }} />
        </div>
        <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>{headline}</h2>
        <p className="max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
        {eventCount > 1 && (
          <GoldButton onClick={() => navigate('/client')}>View Your Events</GoldButton>
        )}
      </div>
    )
  }

  if (!event || !photos) {
    return (
      <div className="space-y-4">
        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniLoader size={22} /> Opening gallery…
        </p>
        <SkeletonLoader type="photo-grid" count={6} />
      </div>
    )
  }

  const favouriteCount = photos.filter((p) => p.is_favourite).length
  const locked = !!event.submitted_at
  const watermarkText = event.watermark_text || event.event_name || 'PandaSpot'
  const watermarkIntensity = Number.isFinite(Number(event.watermark_intensity)) ? Number(event.watermark_intensity) : 0.75
  const pickSet = new Set(studioPicks)

  const expiresDate = event.access_expires ? new Date(event.access_expires) : null
  const daysLeft = expiresDate ? Math.ceil((expiresDate - new Date()) / 86400000) : null
  const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7

  return (
    <div ref={containerRef} className="grain">
      {/* Sticky brand header — sits under the shell topbar (60px) */}
      <header className="gallery-header sticky z-30 px-4 py-3 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ top: 'var(--topbar-h, 60px)', background: 'rgba(10,10,11,0.92)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {logoOk ? (
            <img
              src={fileUrl(event.logo_url)}
              alt=""
              className="h-7 object-contain opacity-80"
              draggable={false}
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              <span className="font-display text-sm text-gold-500">{watermarkText}</span>
            </span>
          )}
        </div>

        <div className="min-w-0 text-center">
          {eventCount > 1 ? (
            <button
              onClick={() => navigate('/client')}
              className="font-display italic text-lg text-gold-500 flex items-center gap-1.5 hover:text-gold-400 transition-colors whitespace-nowrap mx-auto"
              title="Back to all events"
            >
              <ArrowLeft size={14} />
              <span className="truncate max-w-[30vw]">{event.event_name}</span>
            </button>
          ) : (
            <h1 className="font-display italic text-lg text-gold-500 whitespace-nowrap truncate max-w-[40vw]">
              {event.event_name}
            </h1>
          )}
          {event.event_date && (
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatDate(event.event_date)}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {event.favourite_cap != null && (
            <Link
              to={`/client/${eventId}/favourites`}
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {favouriteCount} / {event.favourite_cap} selected
            </Link>
          )}
          {locked ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
              <CheckCircle2 size={12} /> Submitted
            </span>
          ) : (
            <GoldButton size="sm" icon={<Send size={12} />} loading={submitting} onClick={handleSubmit}>
              Submit
            </GoldButton>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative p-2 rounded-full hover:bg-[var(--accent-muted)] transition-colors"
            title="My favourites"
          >
            <Heart size={18} className="text-[var(--text-secondary)]" />
            {favouriteCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 text-obsidian-base text-xs rounded-full flex items-center justify-center font-bold">
                {favouriteCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Submitted banner — favourites are frozen */}
      {locked && (
        <div className="px-4 py-2.5 flex items-center gap-3 rounded-lg mb-4"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <CheckCircle2 size={14} style={{ color: '#34D399', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#34D399' }}>
            Your favourites have been submitted and are locked. Contact your studio if you need to make changes.
          </p>
        </div>
      )}

      {/* Expiry warning (soon but not yet expired) */}
      {expiringSoon && (
        <div className="px-4 py-2.5 flex items-center gap-3 rounded-lg mb-4"
          style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <Clock size={14} style={{ color: '#FBBF24', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#FBBF24' }}>
            Access expires in {daysLeft} day{daysLeft === 1 ? '' : 's'} — {formatDate(event.access_expires)}
          </p>
        </div>
      )}

      {/* Not-yet-published notice */}
      {!event.published_at && (
        <div className="px-4 py-2.5 rounded-lg mb-4"
          style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            The studio hasn&apos;t published this event yet — more photos may still be on the way.
          </p>
        </div>
      )}

      {event.cover_url && (
        <img
          src={fileUrl(event.cover_url)}
          alt=""
          className="w-full object-cover rounded-xl mb-4"
          style={{ aspectRatio: '16 / 9' }}
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      {albums.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="guest-link-label">Albums for review ({albums.length})</div>
          <p className="hint">Your studio shared these album designs — open one to flip through, pin feedback, and approve.</p>
          <ul className="team-list">
            {albums.map((a) => (
              <li key={a.id} className="team-list-item">
                <span style={{ flex: 1 }}>
                  <Link to={`/client/${eventId}/albums/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link>
                  <span className="hint">
                    {' '}· {a.status === 'APPROVED' ? 'approved' : a.status === 'CHANGES_REQUESTED' ? 'changes requested' : 'awaiting your review'}
                    {a.latest_version != null && ` · v${a.latest_version}`}
                    {a.open_pins > 0 && ` · ${a.open_pins} open pin${a.open_pins === 1 ? '' : 's'}`}
                  </span>
                </span>
                <Link className="btn secondary" to={`/client/${eventId}/albums/${a.id}`}>Review</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="protected-gallery"
        style={{ '--watermark-opacity': watermarkIntensity }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {typeof error === 'string' && error && <p className="error">{error}</p>}

        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-card no-select" key={p.photo_id}>
              <div className="protected-photo-frame" data-watermark={event.watermark_image_url ? '' : watermarkText} style={{ position: 'relative' }}>
                <GalleryMedia
                  src={fileUrl(p.protected_thumbnail_url || p.protected_url)}
                  filename={p.filename}
                  style={{ width: '100%', display: 'block' }}
                />
                {event.watermark_image_url && (
                  <img
                    src={fileUrl(event.watermark_image_url)}
                    alt=""
                    className="watermark-image-overlay"
                    draggable="false"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                {pickSet.has(p.photo_id) && (
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: 'rgba(245,158,11,0.92)', color: '#111113' }}
                  >
                    Studio Pick
                  </span>
                )}
              </div>
              <div className="meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="hint">{p.filename}</span>
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
            </div>
          ))}
          {photos.length === 0 && <p className="hint">No photos here yet — check back soon.</p>}
        </div>
      </div>

      <FavouritesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen((v) => !v)}
        photos={photos}
        eventId={eventId}
        eventName={event.event_name}
        allowDownload={event.allow_download !== false}
      />
    </div>
  )
}
