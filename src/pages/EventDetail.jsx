import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Users, Target, Flag } from 'lucide-react'
import {
  cancelInvite,
  connectDriveFolder,
  deleteEvent,
  deletePhoto,
  disconnectBeam,
  fileUrl,
  generateBeamCredentials,
  getBeamCredentials,
  getEvent,
  getEventAnalytics,
  inviteCollaborator,
  listCollaborators,
  listPhotos,
  removeCollaborator,
  setDriveAutoSync,
  startPhotoUpload,
  subscribeToLiveEvents,
  setEventDriveBackup,
  subscribeToUploadProgress,
  syncDriveFolder,
} from '../api.js'
import { useAuth } from '../auth.jsx'
import GuestCard from '../GuestCard.jsx'
import Modal from '../components/Modal.jsx'
import Dropzone from '../components/Dropzone.jsx'
import StatTile from '../components/StatTile.jsx'
import TrendChart from '../components/TrendChart.jsx'

function guestLink(slug) {
  return `${window.location.origin}/e/${slug}`
}

function formatEta(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return null
  const rounded = Math.round(seconds)
  if (rounded < 60) return `~${rounded}s remaining`
  const minutes = Math.round(rounded / 60)
  return `~${minutes}m remaining`
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showGuestCard, setShowGuestCard] = useState(false)
  const [collaborators, setCollaborators] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [teamError, setTeamError] = useState('')
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadTab, setUploadTab] = useState('files')
  const [driveUrl, setDriveUrl] = useState('')
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [togglingAutoSync, setTogglingAutoSync] = useState(false)
  const [togglingDriveBackup, setTogglingDriveBackup] = useState(false)
  const [beam, setBeam] = useState(null)
  const [settingUpBeam, setSettingUpBeam] = useState(false)
  const [regeneratingBeam, setRegeneratingBeam] = useState(false)
  const [disconnectingBeam, setDisconnectingBeam] = useState(false)
  const [liveNotice, setLiveNotice] = useState('')
  const cleanupRef = useRef(null)
  const liveStreamCleanupRef = useRef(null)

  const loadTeam = useCallback(() => {
    listCollaborators(eventId)
      .then((data) => {
        setCollaborators(data.collaborators)
        setPendingInvites(data.pending_invites)
      })
      .catch(() => {
        setCollaborators([])
        setPendingInvites([])
      })
  }, [eventId])

  const load = useCallback(() => {
    getEvent(eventId)
      .then((ev) => {
        setEvent(ev)
        if (ev.role === 'owner') loadTeam()
      })
      .catch((e) => setError(e.message))
    listPhotos(eventId).then(setPhotos).catch((e) => setError(e.message))
    getEventAnalytics(eventId).then(setAnalytics).catch(() => setAnalytics(null))
  }, [eventId, loadTeam])

  useEffect(load, [load])

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  // Keeps the gallery updating live while a camera is streaming photos in
  // via Beam — independent of whether the upload modal is open.
  useEffect(() => {
    if (liveStreamCleanupRef.current) {
      liveStreamCleanupRef.current()
      liveStreamCleanupRef.current = null
    }
    if (!event?.beam_connected) return undefined

    liveStreamCleanupRef.current = subscribeToLiveEvents(eventId, {
      onPhotoAdded: (data) => {
        setPhotos((prev) => (prev.some((p) => p.photo_id === data.photo_id) ? prev : [data, ...prev]))
        setLiveNotice(`New photo from your camera: ${data.filename}`)
        setTimeout(() => setLiveNotice(''), 4000)
      },
      onPhotoSkipped: (data) => {
        setLiveNotice(`Skipped a camera photo (${data.reason})`)
        setTimeout(() => setLiveNotice(''), 4000)
      },
    })
    return () => {
      if (liveStreamCleanupRef.current) {
        liveStreamCleanupRef.current()
        liveStreamCleanupRef.current = null
      }
    }
  }, [eventId, event?.beam_connected])

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setLastResult(null)
    setProgress(null)
    try {
      const { job_id: jobId } = await startPhotoUpload(eventId, files)
      cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
        onProgress: (data) => setProgress(data),
        onDone: (data) => {
          setUploading(false)
          setProgress(null)
          setLastResult(data)
          load()
        },
        onError: (data) => {
          setUploading(false)
          setProgress(null)
          setError(data.message || 'Upload failed')
        },
      })
    } catch (e) {
      setError(e.message)
      setUploading(false)
    }
  }

  const handleDriveConnect = async () => {
    if (!driveUrl.trim()) return
    const confirmed = window.confirm(
      "This scans the folder now and imports every photo currently inside it — could take a while for a large folder. " +
      "PandaSpot only keeps a thumbnail and face data for each photo; the originals stay in Drive and are fetched " +
      "live when a guest downloads or shares one. Continue?"
    )
    if (!confirmed) return

    setConnectingDrive(true)
    setUploading(true)
    setError('')
    setLastResult(null)
    setProgress(null)
    try {
      const { job_id: jobId } = await connectDriveFolder(eventId, driveUrl.trim())
      setDriveUrl('')
      cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
        onProgress: (data) => setProgress(data),
        onDone: (data) => {
          setUploading(false)
          setProgress(null)
          setLastResult(data)
          load()
        },
        onError: (data) => {
          setUploading(false)
          setProgress(null)
          setError(data.message || 'Import failed')
        },
      })
    } catch (e) {
      setError(e.message)
      setUploading(false)
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleDriveSync = async () => {
    setSyncingDrive(true)
    setUploading(true)
    setError('')
    setLastResult(null)
    setProgress(null)
    try {
      const { job_id: jobId } = await syncDriveFolder(eventId)
      cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
        onProgress: (data) => setProgress(data),
        onDone: (data) => {
          setUploading(false)
          setProgress(null)
          setLastResult(data)
          load()
        },
        onError: (data) => {
          setUploading(false)
          setProgress(null)
          setError(data.message || 'Sync failed')
        },
      })
    } catch (e) {
      setError(e.message)
      setUploading(false)
    } finally {
      setSyncingDrive(false)
    }
  }

  const handleToggleAutoSync = async (enabled) => {
    setTogglingAutoSync(true)
    setError('')
    try {
      await setDriveAutoSync(eventId, enabled)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingAutoSync(false)
    }
  }

  const handleSetupBeam = async () => {
    const confirmed = window.confirm(
      "This turns on live camera upload for this event: any photo your camera sends will be scanned for faces " +
      "and added to the gallery automatically, the same as a regular upload. You'll get a host/username/password " +
      "to enter into your camera's FTP transfer settings next. Continue?"
    )
    if (!confirmed) return
    setSettingUpBeam(true)
    setError('')
    try {
      const creds = await generateBeamCredentials(eventId)
      setBeam(creds)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSettingUpBeam(false)
    }
  }

  const handleShowBeamCredentials = async () => {
    setError('')
    try {
      const creds = await getBeamCredentials(eventId)
      setBeam(creds)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRegenerateBeam = async () => {
    if (!window.confirm("This invalidates the current username/password — you'll need to re-enter the new ones into your camera. Continue?")) return
    setRegeneratingBeam(true)
    setError('')
    try {
      const creds = await generateBeamCredentials(eventId)
      setBeam(creds)
    } catch (e) {
      setError(e.message)
    } finally {
      setRegeneratingBeam(false)
    }
  }

  const handleDisconnectBeam = async () => {
    if (!window.confirm('Turn off camera upload for this event? Your camera\'s saved settings will stop working.')) return
    setDisconnectingBeam(true)
    setError('')
    try {
      await disconnectBeam(eventId)
      setBeam(null)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setDisconnectingBeam(false)
    }
  }

  const handleToggleDriveBackup = async (enabled) => {
    setTogglingDriveBackup(true)
    setError('')
    try {
      await setEventDriveBackup(eventId, enabled)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingDriveBackup(false)
    }
  }

  const handleCopy = async () => {
    if (!event) return
    try {
      await navigator.clipboard.writeText(guestLink(event.guestSlug))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — ignore
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setTeamError('')
    setInviteMessage('')
    try {
      const res = await inviteCollaborator(eventId, inviteEmail.trim())
      setInviteMessage(
        res.status === 'added'
          ? 'Added — they can access this event immediately.'
          : "Invite sent — they'll get access once they sign up."
      )
      setInviteEmail('')
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveCollaborator = async (userId) => {
    setTeamError('')
    try {
      await removeCollaborator(eventId, userId)
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    }
  }

  const handleCancelInvite = async (inviteId) => {
    setTeamError('')
    try {
      await cancelInvite(eventId, inviteId)
      loadTeam()
    } catch (e) {
      setTeamError(e.message)
    }
  }

  const handleDeletePhoto = async (photoId, filename) => {
    if (!window.confirm(`Delete "${filename}"? This can't be undone.`)) return
    setDeletingPhotoId(photoId)
    setError('')
    try {
      await deletePhoto(eventId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photo_id !== photoId))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    if (!window.confirm(`Delete "${event.name}"? This permanently deletes every photo and the guest link. This can't be undone.`)) return
    setDeletingEvent(true)
    setError('')
    try {
      await deleteEvent(eventId)
      navigate('/events')
    } catch (e) {
      setError(e.message)
      setDeletingEvent(false)
    }
  }

  const eta = progress ? formatEta(progress.eta_seconds) : null

  return (
    <div>
      <Link className="back-link" to="/events">&larr; All events</Link>
      <h1 className="section-title">{event?.name || 'Event'}</h1>
      <p className="subtle">Bulk-upload the event photos here. Each photo is scanned for faces so guests can find themselves later.</p>

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
        </div>
      )}

      {analytics && (
        <div className="card analytics-card">
          <div className="guest-link-label">Analytics</div>
          <div className="stat-grid">
            <StatTile icon={Search} value={analytics.total_searches} label="searches" />
            <StatTile icon={Users} value={analytics.unique_guests} label="unique guests" />
            <StatTile icon={Target} value={`${Math.round(analytics.match_rate * 100)}%`} label="match rate" />
            <StatTile icon={Flag} value={analytics.feedback_count} label="flagged as wrong" />
          </div>
          {analytics.daily_searches && (
            <TrendChart
              series={[
                { key: 'searches', name: 'Searches', data: analytics.daily_searches },
                { key: 'matches', name: 'Matches', data: analytics.daily_matches },
              ]}
            />
          )}
        </div>
      )}

      {event && (
        <div className="card guest-card-section">
          <button className="btn secondary" type="button" onClick={() => setShowGuestCard((v) => !v)}>
            {showGuestCard ? 'Hide guest card' : 'Generate guest card'}
          </button>
          {showGuestCard && (
            <GuestCard eventName={event.name} guestSlug={event.guestSlug} />
          )}
        </div>
      )}

      {event?.role === 'owner' && (
        <div className="card team-card">
          <div className="guest-link-label">Team</div>
          <p className="hint">Invite a second shooter to help with this event — they'll get their own login, scoped to this event only.</p>

          <form className="row" onSubmit={handleInvite}>
            <input
              className="text-input"
              type="email"
              placeholder="assistant@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button className="btn" type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
          </form>

          {inviteMessage && <p className="hint">{inviteMessage}</p>}
          {teamError && <p className="error">{teamError}</p>}

          <ul className="team-list">
            {collaborators.map((c) => (
              <li key={c.user_id} className="team-list-item">
                <span>{c.name} <span className="hint">({c.email})</span></span>
                <button className="btn secondary" type="button" onClick={() => handleRemoveCollaborator(c.user_id)}>
                  Remove
                </button>
              </li>
            ))}
            {pendingInvites.map((inv) => (
              <li key={inv.invite_id} className="team-list-item team-list-item-pending">
                <span>{inv.email} <span className="hint">(pending)</span></span>
                <button className="btn secondary" type="button" onClick={() => handleCancelInvite(inv.invite_id)}>
                  Cancel
                </button>
              </li>
            ))}
            {collaborators.length === 0 && pendingInvites.length === 0 && (
              <li className="hint">No collaborators yet — invite someone above.</li>
            )}
          </ul>
        </div>
      )}

      <button className="btn upload-trigger-btn" type="button" onClick={() => setUploadModalOpen(true)}>
        Upload Photos
      </button>

      <Modal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload photos">
        <div className="upload-tabs">
          <button
            type="button"
            className={uploadTab === 'files' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('files')}
          >
            Upload files
          </button>
          <button
            type="button"
            className={uploadTab === 'drive' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('drive')}
          >
            Import from Google Drive
          </button>
          <button
            type="button"
            className={uploadTab === 'beam' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('beam')}
          >
            Live from camera
          </button>
        </div>

        {uploadTab === 'files' ? (
          <Dropzone
            onFiles={handleFiles}
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            hint="JPG, PNG, or WebP — drop multiple photos at once"
          />
        ) : uploadTab === 'beam' ? (
          <div className="drive-import">
            {!event?.beam_connected ? (
              <>
                <p className="hint drive-import-notice">
                  Connect your camera's own WiFi/FTP transfer so photos land in this gallery — scanned for faces
                  and thumbnailed — while the shoot is still happening. This needs a camera with built-in FTP
                  transfer (most professional mirrorless/DSLR bodies have it), or an add-on WiFi transmitter grip.
                </p>
                <button className="btn" type="button" onClick={handleSetupBeam} disabled={settingUpBeam}>
                  {settingUpBeam ? 'Setting up…' : 'Set up camera upload'}
                </button>
              </>
            ) : (
              <>
                <p className="hint">Camera upload is on for this event.</p>
                {!beam ? (
                  <button className="btn" type="button" onClick={handleShowBeamCredentials}>
                    Show camera setup details
                  </button>
                ) : (
                  <div className="beam-credentials">
                    <div className="beam-field"><span>Host</span><code>{beam.ftp_host}</code></div>
                    <div className="beam-field"><span>Port</span><code>{beam.ftp_port}</code></div>
                    <div className="beam-field"><span>Username</span><code>{beam.ftp_username}</code></div>
                    <div className="beam-field"><span>Password</span><code>{beam.ftp_password}</code></div>
                    <p className="hint">
                      Enter these into your camera's FTP transfer settings menu, and set it to upload on capture.
                    </p>
                  </div>
                )}
                <div className="row">
                  <button className="btn secondary" type="button" onClick={handleRegenerateBeam} disabled={regeneratingBeam}>
                    {regeneratingBeam ? 'Regenerating…' : 'Regenerate credentials'}
                  </button>
                  <button className="btn danger-btn" type="button" onClick={handleDisconnectBeam} disabled={disconnectingBeam}>
                    {disconnectingBeam ? 'Turning off…' : 'Turn off camera upload'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : event?.drive_folder_url ? (
          <div className="drive-import">
            <p className="hint">
              Connected to{' '}
              <a href={event.drive_folder_url} target="_blank" rel="noreferrer">this Drive folder</a>.
              {' '}
              {event.last_drive_sync_at
                ? `Last synced ${new Date(event.last_drive_sync_at).toLocaleString()}.`
                : 'Not synced yet.'}
            </p>
            <p className="hint drive-import-notice">
              Syncing checks for photos added or removed in the folder since the last sync — new ones are
              imported, and ones deleted from Drive are removed from PandaSpot too.
            </p>
            <div className="row">
              <button className="btn" type="button" onClick={handleDriveSync} disabled={uploading}>
                {syncingDrive ? 'Syncing…' : 'Sync now'}
              </button>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!!event.drive_sync_enabled}
                  disabled={togglingAutoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                />
                Auto-sync once a day
              </label>
            </div>
            {user?.drive_backup_beta && (
              <div className="row" style={{ marginTop: 10 }}>
                <label
                  className="checkbox-row"
                  title={!event.drive_backup_available ? 'Connect Drive backup for your account first (Branding page)' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={!!event.drive_backup_enabled}
                    disabled={togglingDriveBackup || !event.drive_backup_available}
                    onChange={(e) => handleToggleDriveBackup(e.target.checked)}
                  />
                  Back up camera captures to this Drive folder <span className="hint">(advanced, beta)</span>
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="drive-import">
            <p className="hint drive-import-notice">
              Imported photos aren&apos;t stored on PandaSpot&apos;s server — only thumbnails and face-search data are kept.
              Downloads and shares fetch the original from your Drive folder live, so keep it shared as
              &quot;Anyone with the link can view&quot; — if you later restrict or delete files there, those specific
              photos can no longer be downloaded through PandaSpot (search still works fine). Connecting scans and
              imports every photo currently in the folder, so it can take a while for a large one.
            </p>
            <div className="row">
              <input
                className="text-input"
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                disabled={uploading}
              />
              <button className="btn" type="button" onClick={handleDriveConnect} disabled={uploading || !driveUrl.trim()}>
                {connectingDrive ? 'Connecting…' : 'Connect folder'}
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="card upload-progress-card">
            {progress ? (
              <>
                <p className="hint">
                  Processing {progress.completed} of {progress.total} photos…
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%` }}
                  />
                </div>
                {progress.current_file && <p className="hint">Now processing: {progress.current_file}</p>}
                <p className="hint">
                  {progress.photos_per_second != null && `${progress.photos_per_second.toFixed(1)} photos/sec`}
                  {eta && ` · ${eta}`}
                </p>
                <p className="hint">
                  Faces found so far: {progress.faces_found_so_far ?? 0} · Skipped: {progress.skipped_so_far?.length ?? 0}
                </p>
              </>
            ) : (
              <p className="hint">Starting upload…</p>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {lastResult && (
          <p className="hint">
            Processed {lastResult.photos_processed} photo(s), found {lastResult.faces_found} face(s).
            {lastResult.removed_count > 0 && ` Removed ${lastResult.removed_count} photo(s) no longer in Drive.`}
            {lastResult.skipped.length > 0 && (
              <span className="skipped-list">
                Skipped: {lastResult.skipped.join(', ')}
              </span>
            )}
          </p>
        )}
      </Modal>

      {error && !uploadModalOpen && <p className="error">{error}</p>}

      {liveNotice && <p className="live-notice">{liveNotice}</p>}

      {photos.length === 0 ? (
        <p className="hint">No photos uploaded yet.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-card" key={p.photo_id}>
              <img src={fileUrl(p.thumbnail_url || p.url)} alt={p.filename} />
              <div className="meta">
                <span>{p.face_count} face{p.face_count === 1 ? '' : 's'}</span>
                <button
                  className="dismiss-btn"
                  type="button"
                  onClick={() => handleDeletePhoto(p.photo_id, p.filename)}
                  disabled={deletingPhotoId === p.photo_id}
                >
                  {deletingPhotoId === p.photo_id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {event?.role === 'owner' && (
        <div className="card danger-zone">
          <div className="guest-link-label">Danger zone</div>
          <p className="hint">Permanently deletes this event, every photo, and the guest link. Guests will no longer be able to search this event.</p>
          <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
            {deletingEvent ? 'Deleting…' : 'Delete event'}
          </button>
        </div>
      )}
    </div>
  )
}
