import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvent } from './EventContext.jsx'
import { fileUrl, updateEvent } from '../../api.js'
import { useToast } from '../../toast.jsx'
import AccessSettingsCard from '../../components/AccessSettingsCard.jsx'
import GalleryMedia from '../../components/GalleryMedia.jsx'
import GuestCard from '../../GuestCard.jsx'
import TVSettingsForm from '../../components/TVSettingsForm.jsx'
import { isVideoFile } from '../../utils/media.js'

export default function Guests() {
  const { showToast } = useToast()
  const {
    eventId, event, photos, load, guestLink,
    copied, handleCopy, showGuestCard, setShowGuestCard,
    togglingGuestUploads, handleToggleGuestUploads,
    windowDaysInput, setWindowDaysInput, savingWindow, handleSaveWindowDays,
    approvingId, handleApprovePhoto, handleRejectPhoto,
    accessDraft, setAccessDraft, savingAccess,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const [savingLeadMode, setSavingLeadMode] = useState(false)

  const handleLeadMode = async (mode) => {
    setSavingLeadMode(true)
    try {
      await updateEvent(eventId, { lead_capture_mode: mode })
      showToast('Lead capture updated')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setSavingLeadMode(false)
    }
  }

  const handleAccessSave = async (patch) => {
    const body = { access_mode: patch.access_mode, expiry_preset: patch.expiry_preset }
    if (patch.access_key !== undefined) body.access_key = patch.access_key
    if (patch.expires_at) body.expires_at = patch.expires_at
    try {
      await updateEvent(eventId, body)
      setAccessDraft(null)
      showToast('Access settings saved')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Guests
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Guest link and QR cards, guest uploads moderation, live TV wall and attendees.
        </p>
      </div>

      <div className="event-stack">
        {event && (
          <div className="card guest-link-card">
            <div className="guest-link-label">Guest link — share this so guests can find their photos</div>
            <div className="row">
              <input className="text-input" readOnly value={guestLink(event.guestSlug)} onFocus={(e) => e.target.select()} />
              <button className="btn secondary" type="button" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            <p className="hint">
              Guest access {new Date(event.expires_at) < new Date() ? 'closed' : 'closes'} on {new Date(event.expires_at).toLocaleDateString()}
            </p>
            <div className="storage-usage">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.round((event.storage_used_bytes / event.storage_limit_bytes) * 100))}%` }}
                />
              </div>
              <p className="hint">
                {(event.storage_used_bytes / 1e9).toFixed(2)}GB / {(event.storage_limit_bytes / 1e9).toFixed(0)}GB storage used
              </p>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn secondary" type="button" onClick={() => setShowGuestCard((v) => !v)}>
                {showGuestCard ? 'Hide guest card' : 'Generate guest card'}
              </button>
            </div>
            {showGuestCard && (
              <GuestCard eventName={event.name} guestSlug={event.guestSlug} />
            )}
          </div>
        )}

        {event && (event.role === 'owner' || event.role === 'collaborator') && (
          <AccessSettingsCard
            event={event}
            draft={accessDraft}
            setDraft={setAccessDraft}
            saving={savingAccess}
            guestLinkUrl={guestLink(event.guestSlug)}
            copied={copied}
            onCopyLink={handleCopy}
            onSave={handleAccessSave}
          />
        )}

        {event?.started && (
          <div className="card">
            <div className="guest-link-label">Guest uploads</div>
            <p className="hint">
              Let guests add their own shots to the gallery via a separate link/QR. Face indexing runs after approval
              only when Face Search is enabled for this event.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!event.guest_upload_enabled}
                disabled={togglingGuestUploads}
                onChange={(e) => handleToggleGuestUploads(e.target.checked)}
              />
              Allow guests to upload photos
            </label>

            {event.guest_upload_enabled && (
              <>
                <form className="row" onSubmit={handleSaveWindowDays} style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  <div>
                    <label className="field-label" htmlFor="guest-upload-window">Upload window (days)</label>
                    <input
                      id="guest-upload-window"
                      className="text-input"
                      type="number"
                      min="1"
                      placeholder="Same as guest access (90 days)"
                      value={windowDaysInput}
                      onChange={(e) => setWindowDaysInput(e.target.value)}
                    />
                  </div>
                  <button className="btn secondary" type="submit" disabled={savingWindow}>
                    {savingWindow ? 'Saving…' : 'Save'}
                  </button>
                </form>
                <p className="hint">
                  How many days guests can keep uploading, separate from the event&apos;s main guest-access window. Leave
                  blank to use the same window as everything else.
                </p>

                <GuestCard
                  eventName={event.name}
                  guestSlug={event.guestSlug}
                  urlPath="/upload"
                  instruction="Scan to share your photos"
                  filenameSuffix="upload-card"
                />

                <div className="guest-link-label" style={{ marginTop: 20 }}>
                  Pending approval ({photos.filter((p) => p.approval_status === 'pending').length})
                </div>
                {photos.filter((p) => p.approval_status === 'pending').length === 0 ? (
                  <p className="hint">No guest uploads waiting for review.</p>
                ) : (
                  <div className="photo-grid">
                    {photos
                      .filter((p) => p.approval_status === 'pending')
                      .sort((a, b) => (b.moderation_flagged ? 1 : 0) - (a.moderation_flagged ? 1 : 0))
                      .map((p) => (
                        <div className={p.moderation_flagged ? 'photo-card flagged-card' : 'photo-card'} key={p.photo_id}>
                          <GalleryMedia src={fileUrl(p.thumbnail_url || p.url)} filename={p.filename} />
                          <div className="meta">
                            <span>{isVideoFile(p.filename) ? 'Video' : <>{p.face_count} face{p.face_count === 1 ? '' : 's'}</>}</span>
                            {p.moderation_flagged && <span className="flagged-label">Flagged — review first</span>}
                          </div>
                          <div className="match-card-actions">
                            <button
                              className="btn secondary"
                              type="button"
                              onClick={() => handleApprovePhoto(p.photo_id)}
                              disabled={approvingId === p.photo_id}
                            >
                              Approve
                            </button>
                            <button
                              className="dismiss-btn"
                              type="button"
                              onClick={() => handleRejectPhoto(p.photo_id, p.filename)}
                              disabled={approvingId === p.photo_id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {event?.started && (
          <div className="card">
            <div className="guest-link-label">Live TV wall</div>
            <p className="hint">
              A full-screen, auto-advancing wall for a venue TV/projector — moderated photos only, updates live as
              photos land from any source. No login needed to view it.
            </p>
            <TVSettingsForm event={event} onSaved={load} />
            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="text-input" readOnly
                value={`${window.location.origin}/e/${event.guestSlug}/slideshow`}
                onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 220 }}
              />
              <button
                className="btn secondary" type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/e/${event.guestSlug}/slideshow`).then(
                    () => showToast('TV wall link copied — open it in the TV browser'),
                    () => showToast('Copy failed — select the link manually', { type: 'error' })
                  )
                }}
              >
                Copy TV link
              </button>
              <Link className="btn secondary" to={`/e/${event.guestSlug}/slideshow`} target="_blank" rel="noreferrer">
                Open TV wall
              </Link>
            </div>
            <div style={{ marginTop: 10 }}>
              <GuestCard
                eventName={event.name}
                guestSlug={event.guestSlug}
                urlPath="/slideshow"
                instruction="Scan to open the live slideshow"
                filenameSuffix="slideshow-card"
              />
            </div>
          </div>
        )}

        {event && (
          <div className="card">
            <div className="guest-link-label">Attendees</div>
            <p className="hint">Who opened the gallery, searched, downloaded and shared — plus the lead-capture list and CSV export.</p>
            <div style={{ marginBottom: 10, maxWidth: 260 }}>
              <label className="field-label" htmlFor="lead-mode">Guest lead capture</label>
              <select
                id="lead-mode"
                className="text-input"
                value={event.lead_capture_mode || 'disabled'}
                disabled={savingLeadMode}
                onChange={(e) => handleLeadMode(e.target.value)}
              >
                <option value="disabled">Disabled</option>
                <option value="optional">Optional form</option>
                <option value="required_search">Required before search</option>
                <option value="required_download">Required before download</option>
              </select>
            </div>
            <Link className="btn secondary" to={`/events/${eventId}/attendees`}>
              Open attendee dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
