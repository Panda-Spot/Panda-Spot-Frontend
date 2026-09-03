import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useConfirm } from '../confirm.jsx'
import {
  deleteAdminEvent,
  disableAdminEventDriveBackup,
  disableAdminEventShoots,
  getAdminEvent,
  listAdminEventPhotos,
  fileUrl,
  setAdminEventExpiry,
} from '../api.js'
import Lightbox from '../components/Lightbox.jsx'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

function toDateInputValue(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}

export default function AdminEventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [error, setError] = useState('')
  const [expiryInput, setExpiryInput] = useState('')
  const [savingExpiry, setSavingExpiry] = useState(false)
  const [expiryMessage, setExpiryMessage] = useState('')
  const [disablingShoots, setDisablingShoots] = useState(false)
  const [disablingDriveBackup, setDisablingDriveBackup] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    getAdminEvent(eventId)
      .then((e) => {
        setEvent(e)
        setExpiryInput(toDateInputValue(e.expires_at))
      })
      .catch((e) => setError(e.message))

    setLoadingPhotos(true)
    listAdminEventPhotos(eventId)
      .then(setPhotos)
      .catch((e) => console.error('Failed to load event photos for admin:', e))
      .finally(() => setLoadingPhotos(false))
  }, [eventId])

  useEffect(load, [load])

  const handleSaveExpiry = async (e) => {
    e.preventDefault()
    setSavingExpiry(true)
    setError('')
    setExpiryMessage('')
    try {
      await setAdminEventExpiry(eventId, new Date(expiryInput).toISOString())
      setExpiryMessage('Expiry updated.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingExpiry(false)
    }
  }

  const handleDisableShoots = async () => {
    setDisablingShoots(true)
    setError('')
    try {
      await disableAdminEventShoots(eventId)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setDisablingShoots(false)
    }
  }

  const handleDisableDriveBackup = async () => {
    setDisablingDriveBackup(true)
    setError('')
    try {
      await disableAdminEventDriveBackup(eventId)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setDisablingDriveBackup(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm(
      `Delete "${event.name}"? This permanently deletes every photo and the guest link. This can't be undone.`,
      { title: 'Delete this event?', confirmLabel: 'Delete' }
    )
    if (!confirmed) return
    setDeleting(true)
    setError('')
    try {
      await deleteAdminEvent(eventId)
      navigate('/admin/events')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  if (error && !event) return <p className="error">{error}</p>
  if (!event) return <p className="hint">Loading…</p>

  return (
    <div>
      <Link className="back-link" to="/admin/events">&larr; All events</Link>

      <h1 style={{ marginTop: 10 }}>{event.name}</h1>
      <p className="hint">
        Owned by <Link to={`/admin/clients/${event.owner.id}`}>{event.owner.name}</Link> ({event.owner.email})
      </p>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="stat-grid">
          <div>
            <div className="hint">Photos</div>
            <div>{event.photo_count}</div>
          </div>
          <div>
            <div className="hint">Storage used</div>
            <div>{formatBytes(event.storage_used_bytes)}</div>
          </div>
          <div>
            <div className="hint">Created</div>
            <div>{new Date(event.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Guest slug: {event.guest_slug} · Drive import: {event.drive_folder_url ? 'connected' : 'not connected'}
          {event.drive_sync_enabled ? ' (auto-sync on)' : ''} · Shoots: {event.shoots_connected ? 'connected' : 'not connected'}
          {' '}· Drive backup: {event.drive_backup_enabled ? 'on' : 'off'} · Started: {event.started ? 'yes' : 'no'}
        </p>
        {event.photo_source_counts && (
          <p className="hint">
            {event.photo_source_counts.upload} uploaded · {event.photo_source_counts.shoots} PandaShoots ·{' '}
            {event.photo_source_counts.drive_import} Drive import
          </p>
        )}
        {event.collaborators.length > 0 && (
          <p className="hint">Collaborators: {event.collaborators.map((c) => c.email).join(', ')}</p>
        )}
      </div>

      <h2 className="section-title">Event Photos ({photos.length})</h2>
      {loadingPhotos ? (
        <p className="hint">Loading event photos…</p>
      ) : photos.length === 0 ? (
        <p className="hint">No photos in this event yet.</p>
      ) : (
        <>
          <div className="row source-filter-row" style={{ marginTop: 8 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'upload', label: 'Uploaded' },
              { key: 'shoots', label: 'PandaShoots' },
              { key: 'drive_import', label: 'Drive import' },
              { key: 'guest', label: 'Client / Guest uploads' },
            ].map((opt) => {
              const count = opt.key === 'all'
                ? photos.length
                : photos.filter((p) => (p.source || 'upload') === opt.key).length;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={sourceFilter === opt.key ? 'upload-tab active' : 'upload-tab'}
                  onClick={() => setSourceFilter(opt.key)}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const filtered = photos.filter((p) => sourceFilter === 'all' || (p.source || 'upload') === sourceFilter);
            if (filtered.length === 0) {
              return (
                <p className="hint" style={{ padding: '24px 12px', textAlign: 'center', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  No photos found under the selected filter.
                </p>
              );
            }
            return (
              <div className="photo-grid" style={{ marginTop: 12 }}>
                {filtered.map((p, idx) => (
                  <div className="photo-card" key={p.photo_id}>
                    <img
                      src={fileUrl(p.thumbnail_url || p.url)}
                      alt={p.filename}
                      style={{ cursor: 'pointer', height: 180, objectFit: 'cover' }}
                      onClick={() => setLightboxIndex(idx)}
                    />
                    <div className="meta">
                      <span style={{ fontSize: 11, fontWeight: 600 }}>
                        {p.source === 'guest' ? 'Client upload' : p.source === 'shoots' ? 'PandaShoots' : p.source === 'drive_import' ? 'Drive' : 'Upload'}
                      </span>
                      <span>{p.face_count} face{p.face_count === 1 ? '' : 's'}</span>
                    </div>
                    {(p.client_favourites_count > 0 || p.likes_count > 0) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #666)', padding: '2px 8px' }}>
                        {p.client_favourites_count > 0 && `★ ${p.client_favourites_count} client pick `}
                        {p.likes_count > 0 && `♥ ${p.likes_count}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {lightboxIndex !== null && (
            <Lightbox
              matches={photos
                .filter((p) => sourceFilter === 'all' || (p.source || 'upload') === sourceFilter)
                .map((p) => ({
                  photo_id: p.photo_id,
                  filename: p.filename,
                  url: p.url,
                  thumbnail_url: p.thumbnail_url,
                }))}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onIndexChange={setLightboxIndex}
            />
          )}
        </>
      )}

      <h2 className="section-title">Guest-access expiry</h2>
      <form className="card row" onSubmit={handleSaveExpiry}>
        <input
          className="text-input"
          type="date"
          value={expiryInput}
          onChange={(e) => setExpiryInput(e.target.value)}
        />
        <button className="btn" type="submit" disabled={savingExpiry}>
          {savingExpiry ? 'Saving…' : 'Save'}
        </button>
        {expiryMessage && <span className="hint">{expiryMessage}</span>}
      </form>

      {(event.shoots_connected || event.drive_backup_enabled) && (
        <>
          <h2 className="section-title">Feature kill switches</h2>
          <div className="card row">
            {event.shoots_connected && (
              <button className="btn danger-btn" type="button" onClick={handleDisableShoots} disabled={disablingShoots}>
                {disablingShoots ? 'Disabling…' : 'Disable Shoots'}
              </button>
            )}
            {event.drive_backup_enabled && (
              <button className="btn danger-btn" type="button" onClick={handleDisableDriveBackup} disabled={disablingDriveBackup}>
                {disablingDriveBackup ? 'Disabling…' : 'Disable Drive backup'}
              </button>
            )}
          </div>
        </>
      )}

      <div className="card danger-zone">
        <h2 className="section-title" style={{ marginTop: 0 }}>Danger zone</h2>
        <p className="subtle">Permanently deletes this event, every photo, and its guest link.</p>
        <button className="btn danger-btn" type="button" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete event'}
        </button>
      </div>
    </div>
  )
}
