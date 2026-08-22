import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Users, Target, Flag } from 'lucide-react'
import {
  cancelInvite,
  deleteEvent,
  deletePhoto,
  fileUrl,
  getEvent,
  getEventAnalytics,
  inviteCollaborator,
  listCollaborators,
  listPhotos,
  removeCollaborator,
  startPhotoUpload,
  subscribeToUploadProgress,
} from '../api.js'
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
  const cleanupRef = useRef(null)

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
      navigate('/')
    } catch (e) {
      setError(e.message)
      setDeletingEvent(false)
    }
  }

  const eta = progress ? formatEta(progress.eta_seconds) : null

  return (
    <div>
      <Link className="back-link" to="/">&larr; All events</Link>
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
        <Dropzone
          onFiles={handleFiles}
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          hint="JPG, PNG, or WebP — drop multiple photos at once"
        />

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
            {lastResult.skipped.length > 0 && (
              <span className="skipped-list">
                Skipped: {lastResult.skipped.join(', ')}
              </span>
            )}
          </p>
        )}
      </Modal>

      {error && !uploadModalOpen && <p className="error">{error}</p>}

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
