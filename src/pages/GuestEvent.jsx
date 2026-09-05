import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Share2, Download, X, Lock, KeyRound } from 'lucide-react'
import {
  downloadMatches,
  fileUrl,
  getGalleryKey,
  getGuestDataRequestStatus,
  getLeadStatus,
  getPublicEvent,
  reactToPhoto,
  searchBySelfies,
  searchGroupBySelfies,
  sendGalleryLinkViaWhatsApp,
  sendMatchFeedback,
  submitGuestDataRequest,
  subscribeToMatchAlerts,
  unlockGallery,
} from '../api.js'
import { getGuestClientId } from '../guestId.js'
import { createWatermarkedShareImage, shareOrDownload } from '../shareImage.js'
import LeadCaptureForm from '../components/LeadCaptureForm.jsx'
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
  // Phase 2 (consent-first Face Search): checkbox state, notice modal,
  // and the guest data-request form.
  const [consented, setConsented] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [drContact, setDrContact] = useState('')
  const [drType, setDrType] = useState('delete')
  const [drMessage, setDrMessage] = useState('')
  const [drRequests, setDrRequests] = useState([])
  const [drBusy, setDrBusy] = useState(false)
  // Phase 10 (lead capture): capture state drives the search/download
  // gates below; optional mode shows a dismissible form instead.
  const [leadCaptured, setLeadCaptured] = useState(null)
  const [leadDismissed, setLeadDismissed] = useState(false)
  const [showLeadForDownload, setShowLeadForDownload] = useState(false)
  // Phase 3 (gallery access upgrade): private-key prompt state. Unlock
  // tokens persist per slug, so a reload stays unlocked.
  const [accessKey, setAccessKey] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
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
      .then((ev) => {
        setEvent(ev)
        setUnlocked(!!getGalleryKey(slug))
      })
      .catch((e) => setLoadError(e.message))
    getGuestDataRequestStatus(slug, getGuestClientId())
      .then(setDrRequests)
      .catch(() => setDrRequests([]))
    getLeadStatus(slug, getGuestClientId())
      .then((res) => setLeadCaptured(!!res.captured))
      .catch(() => setLeadCaptured(false))
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

  const startSearch = (files, isGroup, withConsent) =>
    isGroup
      ? searchGroupBySelfies(slug, files, getGuestClientId(), withConsent)
      : searchBySelfies(slug, files, getGuestClientId(), withConsent)

  const needsConsent = !!event?.require_face_search_consent

  const handleSelfies = (e) => {
    const files = Array.from(e.target.files || [])
    const max = groupMode ? MAX_GROUP_SELFIES : MAX_SELFIES
    const capped = files.slice(0, max)
    setSelfieHint(files.length > max ? `Using the first ${max} selfies` : '')
    setSelfies(capped)
    setPreviews(capped.map((file) => URL.createObjectURL(file)))
    setResult(null)

    // Already have enough selfies to run a real search — start it now in
    // the background rather than waiting for the button tap. Never
    // prefetches past the consent gate — or the lead gate in
    // required_search mode: with either required, nothing uploads until
    // the guest completes that step.
    const ready = capped.length > 0 && (!groupMode || capped.length >= 2)
    if (ready && (!event?.require_face_search_consent || consented) && !(event?.lead_capture_mode === 'required_search' && !leadCaptured)) {
      const key = selfiesKey(capped, groupMode)
      const promise = startSearch(capped, groupMode, consented)
      promise.catch(() => {}) // Surfaced by handleSearch instead, not here.
      // Remember the consent state: unticking after a consented prefetch
      // must not reuse it.
      prefetchRef.current = { key, promise, consented }
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

  const needsLeadForSearch = event?.lead_capture_mode === 'required_search' && !leadCaptured
  const needsLeadForDownload = event?.lead_capture_mode === 'required_download' && !leadCaptured

  const handleSearch = async (e) => {
    e.preventDefault()
    if (groupMode && selfies.length < 2) {
      setError('Group search needs at least 2 selfies — one per person.')
      return
    }
    if (!groupMode && selfies.length === 0) return
    if (needsLeadForSearch) {
      setError('Please introduce yourself first — this event needs your details before a face search can run.')
      return
    }
    if (event?.require_face_search_consent && !consented) {
      setError('Please tick the consent box first — this event needs your permission before a face search can run.')
      return
    }
    setSearching(true)
    setError('')
    setResult(null)
    try {
      const key = selfiesKey(selfies, groupMode)
      // If the background prefetch from handleSelfies already covers this
      // exact selection (with the same consent state), just wait on it
      // (often already resolved) instead of firing a second request.
      const data =
        prefetchRef.current?.key === key && prefetchRef.current?.consented === consented
          ? await prefetchRef.current.promise
          : await startSearch(selfies, groupMode, consented)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!accessKey.trim()) return
    setUnlocking(true)
    setUnlockError('')
    try {
      await unlockGallery(slug, accessKey.trim())
      setAccessKey('')
      setUnlocked(true)
      setError('')
    } catch (err) {
      setUnlockError(err.message)
    } finally {
      setUnlocking(false)
    }
  }

  const handleDataRequest = async (e) => {    e.preventDefault()
    setDrBusy(true)
    setDrMessage('')
    try {
      const res = await submitGuestDataRequest(slug, { guestClientId: getGuestClientId(), contact: drContact.trim(), type: drType })
      setDrMessage(res.status === 'pending' ? 'Request received — the studio will review it shortly.' : `Request ${res.status}.`)
      const list = await getGuestDataRequestStatus(slug, getGuestClientId()).catch(() => [])
      setDrRequests(list)
    } catch (err) {
      setDrMessage(err.message)
    } finally {
      setDrBusy(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!result?.matches?.length) return
    // Phase 10: required_download mode re-checks capture live (the guest
    // may have completed it in another tab) and prompts inline if needed.
    if (event?.lead_capture_mode === 'required_download') {
      try {
        const status = await getLeadStatus(slug, getGuestClientId())
        setLeadCaptured(!!status.captured)
        if (!status.captured) {
          setShowLeadForDownload(true)
          setError('Please introduce yourself first — this event needs your details before downloads.')
          return
        }
      } catch {
        setShowLeadForDownload(true)
        setError('Please introduce yourself first — this event needs your details before downloads.')
        return
      }
    }
    setDownloading(true)
    setError('')
    try {
      await downloadMatches(slug, result.matches.map((m) => m.photo_id), getGuestClientId())
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
      await sendGalleryLinkViaWhatsApp(slug, alertContact.trim(), getGuestClientId())
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
          <p className="subtle" style={{ fontWeight: 700 }}>
            {event?.studio_name ? `${event.studio_name} — ` : ''}This gallery has closed.
          </p>
          <p className="subtle">This event&apos;s guest access window has ended. Contact {event?.studio_name || 'your photographer'} if you still need help finding your photos.</p>
        </div>
      ) : event?.login_required ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Lock size={30} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
          <p className="subtle" style={{ fontWeight: 700 }}>
            {event?.studio_name ? `${event.studio_name} — ` : ''}Private gallery
          </p>
          <p className="subtle">This gallery is open to invited clients only. Log in with your client account to continue.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <Link className="btn" to="/login">Log in</Link>
          </div>
        </div>
      ) : event?.locked && !unlocked ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <KeyRound size={30} style={{ color: 'var(--text-tertiary)', marginBottom: 10 }} />
          <p className="subtle" style={{ fontWeight: 700 }}>
            {event?.studio_name ? `${event.studio_name} — ` : ''}Locked gallery
          </p>
          <p className="subtle">Enter the access key from your photographer to open {event?.name || 'this gallery'}.</p>
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
      ) : event?.lead_capture_mode === 'optional' && !leadCaptured && !leadDismissed ? (
        <LeadCaptureForm
          slug={slug}
          source="gallery"
          blocking={false}
          onCaptured={() => setLeadCaptured(true)}
          onDismiss={() => setLeadDismissed(true)}
        />
      ) : event && !event.face_search_enabled ? (
        <div className="card">
          <p className="subtle">
            {event.photo_selection_enabled
              ? 'Selfie search isn’t turned on for this event — ask your photographer for your Photo Selection login instead.'
              : 'Selfie search isn’t turned on for this event yet. Check back soon or contact your photographer.'}
          </p>
        </div>
      ) : needsLeadForSearch ? (
        <LeadCaptureForm
          slug={slug}
          source="search"
          blocking
          onCaptured={() => { setLeadCaptured(true); setError('') }}
        />
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
            disabled={searching || selfies.length === 0 || (groupMode && selfies.length < 2) || !event || (needsConsent && !consented)}
            style={{ marginTop: 16 }}
          >
            {searching ? 'Searching…' : groupMode ? 'Find Our Photos' : 'Find My Photos'}
          </button>
          <p className="hint" style={{ marginTop: 8 }}>
            Your selfie is only used to find your photos — it is never saved or shared.
            {event?.selfie_retention_mode === 'retain'
              ? ' The studio keeps search records longer for this event.'
              : ' Search records are deleted automatically after the studio’s retention period.'}{' '}
            <button type="button" className="dismiss-btn" style={{ display: 'inline', textDecoration: 'underline' }} onClick={() => setShowNotice(true)}>
              Privacy notice
            </button>
          </p>
          {needsConsent && (
            <label className="row" style={{ marginTop: 8, gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => {
                  const checked = e.target.checked
                  setConsented(checked)
                  setError('')
                  // Ticking after picking selfies kicks off the same
                  // background prefetch picking files would have started.
                  if (checked && selfies.length > 0 && (!groupMode || selfies.length >= 2) && !prefetchRef.current) {
                    const promise = startSearch(selfies, groupMode, true)
                    promise.catch(() => {})
                    prefetchRef.current = { key: selfiesKey(selfies, groupMode), promise, consented: true }
                  }
                  if (!checked) prefetchRef.current = null
                }}
                style={{ marginTop: 3 }}
              />
              <span className="subtle">
                I agree to a face search on my selfie for this event. I understand my selfie is used only to find
                my photos and is never stored.
              </span>
            </label>
          )}
        </form>
      )}

      {showNotice && event && (
        <div className="modal-backdrop" onClick={() => setShowNotice(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>Privacy notice</h3>
            <p className="subtle" style={{ whiteSpace: 'pre-wrap' }}>{event.privacy_notice_text}</p>
            <p className="hint">
              Your selfie is processed in memory only to find your photos — the file itself is never saved.
              What stays behind is a search record (not your photo), which is deleted automatically after the
              studio’s retention period, or sooner if you ask below.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setShowNotice(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {event && !event.expired && !event.login_required && (!event.locked || unlocked) && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="guest-link-label">Your data</div>
          <p className="hint">Ask for a copy of your Face Search data, or ask the studio to delete it.</p>
          <form className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }} onSubmit={handleDataRequest}>
            <div>
              <label className="field-label" htmlFor="dr-contact">Contact (optional)</label>
              <input
                id="dr-contact"
                className="text-input"
                placeholder="email or phone"
                value={drContact}
                onChange={(e) => setDrContact(e.target.value)}
                maxLength={200}
                style={{ maxWidth: 220 }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="dr-type">Request</label>
              <select id="dr-type" className="text-input" value={drType} onChange={(e) => setDrType(e.target.value)}>
                <option value="export">Export my data</option>
                {event.allow_guest_data_delete_request && <option value="delete">Delete my data</option>}
              </select>
            </div>
            <button className="btn secondary" type="submit" disabled={drBusy}>
              {drBusy ? 'Sending…' : 'Send request'}
            </button>
          </form>
          {drMessage && <p className="hint" style={{ marginTop: 6 }}>{drMessage}</p>}
          {drRequests.length > 0 && (
            <ul className="team-list" style={{ marginTop: 8 }}>
              {drRequests.map((r) => (
                <li key={r.request_id} className="team-list-item">
                  <span style={{ flex: 1 }}>
                    {r.type === 'export' ? 'Data export' : 'Data deletion'}
                    <span className="hint"> · {r.status}{r.resolved_at ? ` · resolved ${new Date(r.resolved_at).toLocaleDateString()}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showLeadForDownload && !leadCaptured && (
        <div style={{ marginTop: 12 }}>
          <LeadCaptureForm
            slug={slug}
            source="download"
            blocking
            onCaptured={() => {
              setLeadCaptured(true)
              setShowLeadForDownload(false)
              setError('')
            }}
          />
        </div>
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
