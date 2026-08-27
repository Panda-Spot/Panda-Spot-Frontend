import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Users, Target, Flag } from 'lucide-react'
import {
  cancelInvite,
  connectDriveFolder,
  deleteEvent,
  deletePhoto,
  disconnectShoots,
  fileUrl,
  generateShootsCredentials,
  getShootsCredentials,
  getEvent,
  getEventAnalytics,
  inviteCollaborator,
  listCollaborators,
  listPhotos,
  removeCollaborator,
  setDriveAutoSync,
  startPhotoUpload,
  subscribeToLiveEvents,
  reclaimDriveBackupNow,
  setEventDriveBackup,
  subscribeToUploadProgress,
  syncDriveFolder,
} from '../api.js'
import { useAuth } from '../auth.jsx'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import { saveActiveJob, getActiveJob, clearActiveJob } from '../jobPersistence.js'
import GuestCard from '../GuestCard.jsx'
import Dropzone from '../components/Dropzone.jsx'
import StatTile from '../components/StatTile.jsx'
import TrendChart from '../components/TrendChart.jsx'
import JobProgressLog from '../components/JobProgressLog.jsx'

function guestLink(slug) {
  return `${window.location.origin}/e/${slug}`
}

function progressLine(data) {
  let line = `Processed ${data.completed} of ${data.total}`
  if (data.current_file) line += ` — ${data.current_file}`
  const eta = formatEta(data.eta_seconds)
  if (eta) line += ` (${eta})`
  return line
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
  const [uploadTab, setUploadTab] = useState('files')
  const [logLines, setLogLines] = useState([])
  const [driveUrl, setDriveUrl] = useState('')
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [togglingAutoSync, setTogglingAutoSync] = useState(false)
  const [togglingDriveBackup, setTogglingDriveBackup] = useState(false)
  const [reclaimingDriveBackup, setReclaimingDriveBackup] = useState(false)
  const [driveBackupMessage, setDriveBackupMessage] = useState('')
  const [shoots, setShoots] = useState(null)
  const [settingUpShoots, setSettingUpShoots] = useState(false)
  const [regeneratingShoots, setRegeneratingShoots] = useState(false)
  const [disconnectingShoots, setDisconnectingShoots] = useState(false)
  const [liveNotice, setLiveNotice] = useState('')
  const cleanupRef = useRef(null)
  const liveStreamCleanupRef = useRef(null)
  const confirm = useConfirm()
  const { showToast } = useToast()

  const appendLog = useCallback((line) => {
    setLogLines((prev) => [...prev, line])
  }, [])

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

  // A job (upload / Drive import / Drive sync) keeps running server-side
  // regardless of whether anyone's watching — see server's lib/jobQueue.js.
  // If one was left running when this page was last closed/reloaded,
  // reconnect to it now instead of showing a blank upload section.
  useEffect(() => {
    const jobId = getActiveJob(eventId)
    if (!jobId) return undefined

    setUploading(true)
    setLogLines(['Reconnected — checking status…'])
    cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
      onProgress: (data) => {
        setProgress(data)
        appendLog(progressLine(data))
      },
      onDone: (data) => {
        setUploading(false)
        setProgress(null)
        appendLog(`Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
        clearActiveJob(eventId)
        load()
      },
      onError: (data) => {
        setUploading(false)
        setProgress(null)
        appendLog(`Failed — ${data.message || 'unknown error'}`)
        clearActiveJob(eventId)
      },
    })
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Keeps the gallery updating live while a camera is streaming photos in
  // via Shoots — independent of whether the upload modal is open.
  useEffect(() => {
    if (liveStreamCleanupRef.current) {
      liveStreamCleanupRef.current()
      liveStreamCleanupRef.current = null
    }
    if (!event?.shoots_connected) return undefined

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
  }, [eventId, event?.shoots_connected])

  function watchJob(jobId, { failedLabel }) {
    saveActiveJob(eventId, jobId)
    cleanupRef.current = subscribeToUploadProgress(eventId, jobId, {
      onProgress: (data) => {
        setProgress(data)
        appendLog(progressLine(data))
      },
      onDone: (data) => {
        setUploading(false)
        setProgress(null)
        let summary = `Done — ${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`
        if (data.removed_count > 0) summary += ` ${data.removed_count} photo(s) removed (no longer in Drive).`
        if (data.skipped?.length > 0) summary += ` Skipped: ${data.skipped.join(', ')}`
        appendLog(summary)
        clearActiveJob(eventId)
        showToast(`${data.photos_processed} photo(s) processed, ${data.faces_found} face(s) found.`)
        load()
      },
      onError: (data) => {
        setUploading(false)
        setProgress(null)
        const message = data.message || failedLabel
        appendLog(`Failed — ${message}`)
        clearActiveJob(eventId)
        showToast(message, { type: 'error' })
      },
    })
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([`Starting upload — ${files.length} file(s)`])
    try {
      const { job_id: jobId } = await startPhotoUpload(eventId, files)
      watchJob(jobId, { failedLabel: 'Upload failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    }
  }

  const handleDriveConnect = async () => {
    if (!driveUrl.trim()) return
    const confirmed = await confirm(
      "This scans the folder now and imports every photo currently inside it — could take a while for a large folder. " +
      "PandaSpot only keeps a thumbnail and face data for each photo; the originals stay in Drive and are fetched " +
      "live when a guest downloads or shares one.",
      { title: 'Connect this Drive folder?', confirmLabel: 'Connect', danger: false }
    )
    if (!confirmed) return

    setConnectingDrive(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines([])
    try {
      const { job_id: jobId, files_found: filesFound } = await connectDriveFolder(eventId, driveUrl.trim())
      setDriveUrl('')
      setLogLines([`Connected — found ${filesFound} file(s) in the folder`])
      watchJob(jobId, { failedLabel: 'Import failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setUploading(false)
    } finally {
      setConnectingDrive(false)
    }
  }

  const handleDriveSync = async () => {
    setSyncingDrive(true)
    setUploading(true)
    setError('')
    setProgress(null)
    setLogLines(['Checking the Drive folder for changes…'])
    try {
      const { job_id: jobId } = await syncDriveFolder(eventId)
      watchJob(jobId, { failedLabel: 'Sync failed' })
    } catch (e) {
      showToast(e.message, { type: 'error' })
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

  const handleSetupShoots = async () => {
    const confirmed = await confirm(
      "Any photo your camera sends will be scanned for faces and added to the gallery automatically, the same as " +
      "a regular upload. You'll get a host/username/password to enter into your camera's FTP transfer settings next.",
      { title: 'Turn on camera upload?', confirmLabel: 'Turn on', danger: false }
    )
    if (!confirmed) return
    setSettingUpShoots(true)
    setError('')
    try {
      const creds = await generateShootsCredentials(eventId)
      setShoots(creds)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setSettingUpShoots(false)
    }
  }

  const handleShowShootsCredentials = async () => {
    setError('')
    try {
      const creds = await getShootsCredentials(eventId)
      setShoots(creds)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRegenerateShoots = async () => {
    const confirmed = await confirm(
      "This invalidates the current username/password — you'll need to re-enter the new ones into your camera.",
      { title: 'Regenerate camera credentials?', confirmLabel: 'Regenerate' }
    )
    if (!confirmed) return
    setRegeneratingShoots(true)
    setError('')
    try {
      const creds = await generateShootsCredentials(eventId)
      setShoots(creds)
      showToast('New credentials generated.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setRegeneratingShoots(false)
    }
  }

  const handleDisconnectShoots = async () => {
    const confirmed = await confirm(
      "Your camera's saved FTP settings will stop working.",
      { title: 'Turn off camera upload?', confirmLabel: 'Turn off' }
    )
    if (!confirmed) return
    setDisconnectingShoots(true)
    setError('')
    try {
      await disconnectShoots(eventId)
      setShoots(null)
      load()
      showToast('Camera upload turned off.')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setDisconnectingShoots(false)
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

  const handleReclaimDriveBackupNow = async () => {
    setReclaimingDriveBackup(true)
    setError('')
    setDriveBackupMessage('')
    try {
      const result = await reclaimDriveBackupNow(eventId)
      setDriveBackupMessage(`Reclaimed ${result.reclaimed_count} photo(s) from Drive.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setReclaimingDriveBackup(false)
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
    const confirmed = await confirm(`Delete "${filename}"? This can't be undone.`, { title: 'Delete photo?', confirmLabel: 'Delete' })
    if (!confirmed) return
    setDeletingPhotoId(photoId)
    setError('')
    try {
      await deletePhoto(eventId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photo_id !== photoId))
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    const confirmed = await confirm(
      `Delete "${event.name}"? This permanently deletes every photo and the guest link. This can't be undone.`,
      { title: 'Delete event?', confirmLabel: 'Delete' }
    )
    if (!confirmed) return
    setDeletingEvent(true)
    setError('')
    try {
      await deleteEvent(eventId)
      navigate('/events')
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setDeletingEvent(false)
    }
  }

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

      <div className="card upload-section">
        <div className="guest-link-label">Upload photos</div>
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
            className={uploadTab === 'shoots' ? 'upload-tab active' : 'upload-tab'}
            onClick={() => setUploadTab('shoots')}
          >
            PandaShoots
          </button>
        </div>

        {uploadTab === 'files' ? (
          <Dropzone
            onFiles={handleFiles}
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            hint="JPG, PNG, or WebP — drop multiple photos at once"
          />
        ) : uploadTab === 'shoots' ? (
          <div className="drive-import">
            {!event?.shoots_connected ? (
              <>
                <ul className="notice-list">
                  <li>Photos land in this gallery — scanned for faces and thumbnailed — while the shoot is still happening.</li>
                  <li>Needs a camera with built-in FTP transfer (most professional mirrorless/DSLR bodies have it), or an add-on WiFi transmitter grip.</li>
                </ul>
                <button className="btn" type="button" onClick={handleSetupShoots} disabled={settingUpShoots}>
                  {settingUpShoots ? 'Setting up…' : 'Set up camera upload'}
                </button>
              </>
            ) : (
              <>
                <p className="hint">Camera upload is on for this event.</p>
                {!shoots ? (
                  <button className="btn" type="button" onClick={handleShowShootsCredentials}>
                    Show camera setup details
                  </button>
                ) : (
                  <div className="shoots-credentials">
                    <div className="shoots-field"><span>Host</span><code>{shoots.ftp_host}</code></div>
                    <div className="shoots-field"><span>Port</span><code>{shoots.ftp_port}</code></div>
                    <div className="shoots-field"><span>Username</span><code>{shoots.ftp_username}</code></div>
                    <div className="shoots-field"><span>Password</span><code>{shoots.ftp_password}</code></div>
                    <p className="hint">
                      Enter these into your camera's FTP transfer settings menu, and set it to upload on capture.
                    </p>
                  </div>
                )}
                <div className="row">
                  <button className="btn secondary" type="button" onClick={handleRegenerateShoots} disabled={regeneratingShoots}>
                    {regeneratingShoots ? 'Regenerating…' : 'Regenerate credentials'}
                  </button>
                  <button className="btn danger-btn" type="button" onClick={handleDisconnectShoots} disabled={disconnectingShoots}>
                    {disconnectingShoots ? 'Turning off…' : 'Turn off camera upload'}
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
            <ul className="notice-list">
              <li>Syncing checks for photos added or removed in the folder since the last sync.</li>
              <li>New photos are imported; ones deleted from Drive are removed from PandaSpot too.</li>
            </ul>
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
              <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <label
                  className="checkbox-row"
                  title={!event.drive_backup_available ? 'Drive backup is not set up on this PandaSpot instance yet' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={!!event.drive_backup_enabled}
                    disabled={togglingDriveBackup || !event.drive_backup_available}
                    onChange={(e) => handleToggleDriveBackup(e.target.checked)}
                  />
                  Back up camera captures to this Drive folder <span className="hint">(advanced, beta)</span>
                </label>
                {event.drive_backup_enabled && (
                  <button className="btn secondary" type="button" onClick={handleReclaimDriveBackupNow} disabled={reclaimingDriveBackup}>
                    {reclaimingDriveBackup ? 'Reclaiming…' : "I've made my copies — free up space"}
                  </button>
                )}
              </div>
            )}
            {event.drive_backup_enabled && (
              <ul className="notice-list">
                <li>Backed-up captures live in this Drive folder for only 2 days before being pulled back to PandaSpot's server and removed from Drive.</li>
                <li>7 days total before permanent deletion everywhere.</li>
                <li>Make your own copy in Drive (select all, "Make a copy") well before then.</li>
              </ul>
            )}
            {driveBackupMessage && <p className="hint">{driveBackupMessage}</p>}
          </div>
        ) : (
          <div className="drive-import">
            <ul className="notice-list">
              <li>Imported photos aren't stored on PandaSpot's server — only thumbnails and face-search data are kept.</li>
              <li>Downloads and shares fetch the original from your Drive folder live.</li>
              <li>Keep the folder shared as "Anyone with the link can view" — if you later restrict or delete files there, those specific photos can no longer be downloaded through PandaSpot (search still works fine).</li>
              <li>Connecting scans and imports every photo currently in the folder, so it can take a while for a large one.</li>
            </ul>
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

        <JobProgressLog lines={logLines} progress={progress} />
      </div>

      {error && <p className="error">{error}</p>}

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
