import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Share2, Download, X } from 'lucide-react'
import {
  downloadMatches,
  fileUrl,
  getPublicEvent,
  reactToPhoto,
  searchBySelfies,
  searchGroupBySelfies,
  sendGalleryLinkViaWhatsApp,
  sendMatchFeedback,
  subscribeToMatchAlerts,
} from '../api.js'
import { getGuestClientId } from '../guestId.js'
import { createWatermarkedShareImage, shareOrDownload } from '../shareImage.js'
import Lightbox from '../components/Lightbox.jsx'
import ReactionBar from '../components/ReactionBar.jsx'
import CameraShutter from '../components/CameraShutter.jsx'

const MAX_SELFIES = 3
const MAX_GROUP_SELFIES = 8

export default function GuestEvent() {
  const { slug } = useParams()
  const navigate = useNavigate()
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
  const [alertChannel, setAlertChannel] = useState('email')
  const [alertContact, setAlertContact] = useState('')
  const [subscribingAlert, setSubscribingAlert] = useState(false)
  const [alertSubscribed, setAlertSubscribed] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [sendingLink, setSendingLink] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [groupMode, setGroupMode] = useState(false)
  // Holds { key, promise } for a search already kicked off the instant the
  // guest finished picking selfies — before they've even tapped "Find My
  // Photos". By the time they do tap it, the upload + face-detect + match
  // work is often already done, so the button click just reveals a result
  // that's already sitting there instead of starting the whole round trip
  // fresh. Never shown in the UI directly — from the guest's perspective
  // nothing happens until they tap the button.
  const prefetchRef = useRef(null)
  // MERGE (Studio-Verse merge, Phase 16 — new design system): the camera-
  // iris shutter plays once on first paint, then this flips true and the
  // overlay unmounts — "the shutter opens, welcome" (see D4/CameraShutter.jsx).
  const [shutterOpened, setShutterOpened] = useState(false)

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
      theme_color: event.brand_color || '#0e8a8a',
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

  // A stable fingerprint for one selfie selection (+ which mode it was
  // taken in) — lets handleSearch recognize "this is the exact same
  // selection a prefetch already started for" without keeping the actual
  // File objects around as the comparison key.
  const selfiesKey = (files, isGroup) =>
    `${isGroup ? 'group' : 'solo'}:${files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|')}`

  const startSearch = (files, isGroup) =>
    isGroup ? searchGroupBySelfies(slug, files, getGuestClientId()) : searchBySelfies(slug, files, getGuestClientId())

  const handleSelfies = (e) => {
    const files = Array.from(e.target.files || [])
    const max = groupMode ? MAX_GROUP_SELFIES : MAX_SELFIES
    const capped = files.slice(0, max)
    setSelfieHint(files.length > max ? `Using the first ${max} selfies` : '')
    setSelfies(capped)
    setPreviews(capped.map((file) => URL.createObjectURL(file)))
    setResult(null)

    // Already have enough selfies to run a real search — start it now in
    // the background rather than waiting for the button tap. If the
    // selection isn't search-ready yet (e.g. group mode with only 1
    // selfie so far), there's nothing valid to prefetch.
    const ready = capped.length > 0 && (!groupMode || capped.length >= 2)
    if (ready) {
      const key = selfiesKey(capped, groupMode)
      const promise = startSearch(capped, groupMode)
      promise.catch(() => {}) // Surfaced by handleSearch instead, not here.
      prefetchRef.current = { key, promise }
    } else {
      prefetchRef.current = null
    }
  }

  const handleToggleGroupMode = () => {
    setGroupMode((v) => !v)
    setSelfies([])
    setPreviews([])
    setSelfieHint('')
    setResult(null)
    prefetchRef.current = null
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (groupMode && selfies.length < 2) {
      setError('Group search needs at least 2 selfies — one per person.')
      return
    }
    if (!groupMode && selfies.length === 0) return
    setSearching(true)
    setError('')
    setResult(null)
    try {
      const key = selfiesKey(selfies, groupMode)
      // If the background prefetch from handleSelfies already covers this
      // exact selection, just wait on it (often already resolved) instead
      // of firing a second, redundant request.
      const data =
        prefetchRef.current?.key === key ? await prefetchRef.current.promise : await startSearch(selfies, groupMode)
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

  const handleReact = async (match, reaction) => {
    try {
      const { reactions, my_reaction: myReaction } = await reactToPhoto(slug, match.photo_id, getGuestClientId(), reaction)
      setResult((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.photo_id === match.photo_id ? { ...m, reactions, my_reaction: myReaction } : m
        ),
      }))
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

  const handleSubscribeAlert = async (e) => {
    e.preventDefault()
    if (!alertContact.trim()) return
    setSubscribingAlert(true)
    setAlertMessage('')
    try {
      await subscribeToMatchAlerts(slug, getGuestClientId(), alertChannel, alertContact.trim())
      setAlertSubscribed(true)
      setAlertMessage("You're set — we'll let you know if more photos of you show up.")
    } catch (e) {
      setAlertMessage(e.message)
    } finally {
      setSubscribingAlert(false)
    }
  }

  const handleSendLinkNow = async () => {
    if (!alertContact.trim()) return
    setSendingLink(true)
    setAlertMessage('')
    try {
      await sendGalleryLinkViaWhatsApp(slug, alertContact.trim())
      setAlertMessage('Sent! Check WhatsApp for your gallery link.')
    } catch (e) {
      setAlertMessage(e.message)
    } finally {
      setSendingLink(false)
    }
  }

  const accentStyle = event?.brand_color ? { '--accent': event.brand_color } : undefined
  const heroStyle = event?.brand_color
    ? { background: `linear-gradient(135deg, ${event.brand_color}, var(--accent-2))` }
    : undefined

  return (
    <div className="guest-shell" style={accentStyle}>
      {!shutterOpened && (
        <div className="guest-shutter-overlay" style={{ background: heroStyle?.background || 'var(--bg)' }}>
          <CameraShutter size="lg" reveal onOpened={() => setShutterOpened(true)} />
        </div>
      )}
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

      {event?.sub_galleries?.length > 0 ? (
        <div className="card">
          <p className="subtle">This event has separate galleries — pick one to search:</p>
          <div className="sub-gallery-picker">
            {event.sub_galleries.map((g) => (
              <button
                key={g.slug}
                type="button"
                className="btn secondary sub-gallery-btn"
                onClick={() => navigate(`/e/${g.slug}`)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      ) : event?.expired ? (
        <div className="card">
          <p className="subtle">This event's search window has closed. Contact the photographer if you still need help finding your photos.</p>
        </div>
      ) : event && !event.face_search_enabled ? (
        <div className="card">
          <p className="subtle">
            {event.photo_selection_enabled
              ? 'Selfie search isn’t turned on for this event — ask your photographer for your Photo Selection login instead.'
              : 'Selfie search isn’t turned on for this event yet. Check back soon or contact your photographer.'}
          </p>
        </div>
      ) : (
        <form className="card" onSubmit={handleSearch}>
          <p className="subtle">
            {groupMode
              ? `Upload one selfie per person, up to ${MAX_GROUP_SELFIES} — we'll find every photo with any of you in it.`
              : `Upload up to ${MAX_SELFIES} selfies — we'll find every photo you're in.`}
          </p>
          <button type="button" className="group-mode-toggle" onClick={handleToggleGroupMode}>
            {groupMode ? '← Search for just me instead' : 'Searching with friends? Search as a group →'}
          </button>
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
          <button
            className="btn"
            type="submit"
            disabled={searching || selfies.length === 0 || (groupMode && selfies.length < 2) || !event}
            style={{ marginTop: 16 }}
          >
            {searching ? 'Searching…' : groupMode ? 'Find Our Photos' : 'Find My Photos'}
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
              {result.people_detected != null
                ? `Detected ${result.people_detected} people in your selfies — found ${result.matches.length} matching photo(s).`
                : `Detected ${result.faces_detected_in_selfie} face(s) in your selfie(s) — found ${result.matches.length} matching photo(s).`}
            </p>
            {result.matches.length > 0 && (
              <button className="btn secondary" type="button" onClick={handleDownloadAll} disabled={downloading}>
                <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {downloading ? 'Preparing zip…' : 'Download all'}
              </button>
            )}
          </div>
          <div className="match-grid">
            {result.matches.map((m, i) => (
              <div className="photo-card match-card" key={m.photo_id}>
                <button className="match-thumb-btn" type="button" onClick={() => setLightboxIndex(i)} aria-label={`View ${m.filename} full screen`}>
                  <img src={fileUrl(m.thumbnail_url || m.url)} alt={m.filename} />
                </button>
                <div className="meta">
                  <span>{m.people_matched != null ? `${m.people_matched} of your group` : 'Match'}</span>
                  <span>{Math.round(m.similarity * 100)}%</span>
                </div>
                {m.match_via_group && (
                  <p className="hint" style={{ margin: '2px 0 0', fontSize: 11 }}>
                    Found via face group — same person as a strong match
                  </p>
                )}
                <ReactionBar
                  reactions={m.reactions}
                  myReaction={m.my_reaction}
                  onReact={(reaction) => handleReact(m, reaction)}
                />
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

          <div className="card guest-alert-card">
            {alertSubscribed ? (
              <p className="hint">You're set — we'll let you know if more photos of you show up at this event.</p>
            ) : (
              <>
                <p className="subtle">More photos might still come in during the event — want us to let you know?</p>
                <form onSubmit={handleSubscribeAlert}>
                  <div className="guest-alert-tabs">
                    <button
                      type="button"
                      className={alertChannel === 'email' ? 'upload-tab active' : 'upload-tab'}
                      onClick={() => { setAlertChannel('email'); setAlertContact('') }}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      className={alertChannel === 'whatsapp' ? 'upload-tab active' : 'upload-tab'}
                      onClick={() => { setAlertChannel('whatsapp'); setAlertContact('') }}
                    >
                      WhatsApp
                    </button>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <input
                      className="text-input"
                      type={alertChannel === 'email' ? 'email' : 'tel'}
                      placeholder={alertChannel === 'email' ? 'you@example.com' : '+919876543210'}
                      value={alertContact}
                      onChange={(e) => setAlertContact(e.target.value)}
                    />
                    <button className="btn" type="submit" disabled={subscribingAlert || !alertContact.trim()}>
                      {subscribingAlert ? 'Saving…' : 'Notify me'}
                    </button>
                  </div>
                  {alertChannel === 'whatsapp' && (
                    <button
                      className="btn secondary"
                      type="button"
                      style={{ marginTop: 8 }}
                      onClick={handleSendLinkNow}
                      disabled={sendingLink || !alertContact.trim()}
                    >
                      {sendingLink ? 'Sending…' : 'Just text me this link now'}
                    </button>
                  )}
                </form>
              </>
            )}
            {alertMessage && <p className="hint feedback-note">{alertMessage}</p>}
          </div>
        </>
      )}

      {lightboxIndex != null && result?.matches?.length > 0 && (
        <Lightbox
          slug={slug}
          matches={result.matches}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onShare={handleShare}
          sharingId={sharingId}
          onReact={handleReact}
        />
      )}
    </div>
  )
}
