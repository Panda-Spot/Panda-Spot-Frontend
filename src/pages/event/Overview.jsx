import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { Archive, ArchiveRestore, CalendarDays, CheckCircle2, Circle, MapPin, Pencil } from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import Modal from '../../components/Modal.jsx'

export default function Overview() {
  const {
    eventId, event, photos, analytics, clients, collaborators,
    openEditDetails, showEditDetails, setShowEditDetails,
    editName, setEditName, editDate, setEditDate, editVenue, setEditVenue,
    editDesc, setEditDesc, savingDetails, handleSaveDetails,
    handleCoverFile, handleSaveCover, handleRemoveCover,
    showCoverModal, setShowCoverModal, coverSrc, setCoverSrc,
    coverCrop, setCoverCrop, coverZoom, setCoverZoom, coverPixels, setCoverPixels, uploadingCover,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const photoCount = photos.length
  const indexedCount = photos.filter((p) => p.face_indexed_at).length
  const searchableCount = photos.filter((p) => p.approval_status !== 'pending' && p.face_search_visible && !p.archived_at).length
  const pendingCount = photos.filter((p) => p.approval_status === 'pending').length

  const suggestions = []
  if (event && !event.started) {
    suggestions.push({ done: false, label: 'Start the event to unlock uploads', to: `/events/${eventId}/photos` })
  }
  if (photoCount === 0) {
    suggestions.push({ done: false, label: 'Upload your first photos', to: `/events/${eventId}/photos` })
  }
  if (event?.face_search_enabled && photoCount > 0 && searchableCount === 0) {
    suggestions.push({ done: false, label: 'Add photos to AI Search', to: `/events/${eventId}/photos` })
  }
  if (photoCount > 0) {
    suggestions.push({ done: true, label: 'Photos are in — share the guest link', to: `/events/${eventId}/guests` })
  } else {
    suggestions.push({ done: false, label: 'Share the guest link with guests', to: `/events/${eventId}/guests` })
  }
  if (event?.photo_selection_enabled && !event?.published_at) {
    suggestions.push({ done: false, label: 'Publish the gallery for clients', to: `/events/${eventId}/selection` })
  }
  if ((collaborators?.length || 0) === 0) {
    suggestions.push({ done: false, label: 'Invite a second shooter', to: `/events/${eventId}/team` })
  }

  return (
    <div>
      <div className="event-stack">
        {event?.archived_at && (
          <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
            <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Archive size={14} /> Archived — hidden from guests and clients
            </div>
            <p className="hint">
              Archived {new Date(event.archived_at).toLocaleDateString()}. Nothing is deleted; restore from the Danger section to bring guests and clients back.
            </p>
            <Link className="btn secondary" to={`/events/${eventId}/danger`}>
              <ArchiveRestore size={14} /> Open Danger section
            </Link>
          </div>
        )}

        {event && (
          <div className="card">
            <div className="guest-link-label">Event details</div>
            {event.cover_url && (
              <img
                src={event.cover_url}
                alt=""
                style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, marginBottom: 12 }}
                draggable={false}
              />
            )}
            {(event.event_date || event.event_venue || event.description) && (
              <p className="hint" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {event.event_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays size={13} /> {new Date(event.event_date).toLocaleDateString()}
                  </span>
                )}
                {event.event_venue && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> {event.event_venue}
                  </span>
                )}
                {event.description && <span>{event.description}</span>}
              </p>
            )}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn secondary" type="button" onClick={openEditDetails}>
                <Pencil size={14} /> Edit details
              </button>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
              <label className="btn secondary" style={{ cursor: 'pointer' }}>
                {event.cover_url ? 'Change cover' : 'Add cover (16:9)'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverFile} style={{ display: 'none' }} />
              </label>
              {event.cover_url && (
                <button className="btn secondary" type="button" onClick={handleRemoveCover}>
                  Remove cover
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="guest-link-label">Numbers</div>
          <div className="stat-grid">
            <div><div className="hint">Photos</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{photoCount}</div></div>
            <div><div className="hint">Face-indexed</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{indexedCount}</div></div>
            <div><div className="hint">Searchable</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{searchableCount}</div></div>
            <div><div className="hint">Pending uploads</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{pendingCount}</div></div>
            <div><div className="hint">Clients</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{clients?.length || 0}</div></div>
            <div><div className="hint">Guest searches</div><div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{analytics?.total_searches ?? '—'}</div></div>
          </div>
        </div>

        {event && (
          <div className="card">
            <div className="guest-link-label">Features enabled</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className={`status-pill ${event.face_search_enabled ? 'active' : 'off'}`}>
                Face Search {event.face_search_enabled ? 'on' : 'off'}
              </span>
              <span className={`status-pill ${event.photo_selection_enabled ? 'active' : 'off'}`}>
                Photo Selection {event.photo_selection_enabled ? 'on' : 'off'}
              </span>
              <span className={`status-pill ${event.guest_upload_enabled ? 'active' : 'off'}`}>
                Guest uploads {event.guest_upload_enabled ? 'on' : 'off'}
              </span>
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              Chosen at creation. Changing features, archiving or deleting lives in the Danger section.
            </p>
            <Link className="btn secondary" to={`/events/${eventId}/danger`}>
              Open Danger section
            </Link>
          </div>
        )}

        <div className="card">
          <div className="guest-link-label">Suggested next steps</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((s) => (
              <li key={s.label}>
                <Link
                  to={s.to}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13 }}
                >
                  {s.done
                    ? <CheckCircle2 size={16} style={{ color: '#22C55E', flexShrink: 0 }} />
                    : <Circle size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {event && (
        <Modal open={showEditDetails} onClose={() => setShowEditDetails(false)} title="Edit event details">
          <form onSubmit={handleSaveDetails}>
            <label className="field-label" htmlFor="ev-name">Event name</label>
            <input id="ev-name" className="text-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="field-label" htmlFor="ev-date">Event date</label>
            <input id="ev-date" className="text-input" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <label className="field-label" htmlFor="ev-venue">Venue</label>
            <input id="ev-venue" className="text-input" placeholder="e.g. Grand Palace Hall" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} />
            <label className="field-label" htmlFor="ev-desc">Description</label>
            <input id="ev-desc" className="text-input" placeholder="Short note for your own reference" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => setShowEditDetails(false)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingDetails || !editName.trim()}>
                {savingDetails ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {event && (
        <Modal open={showCoverModal} onClose={() => { setShowCoverModal(false); setCoverSrc('') }} title="Cover photo (16:9)">
          {coverSrc ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 320, background: '#111' }}>
                <Cropper
                  image={coverSrc}
                  crop={coverCrop}
                  zoom={coverZoom}
                  aspect={16 / 9}
                  onCropChange={setCoverCrop}
                  onZoomChange={setCoverZoom}
                  onCropComplete={(_, pixels) => setCoverPixels(pixels)}
                />
              </div>
              <label className="field-label" htmlFor="cover-zoom">Zoom</label>
              <input id="cover-zoom" type="range" min="1" max="3" step="0.1" value={coverZoom} onChange={(e) => setCoverZoom(Number(e.target.value))} style={{ width: '100%' }} />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn secondary" type="button" onClick={() => { setShowCoverModal(false); setCoverSrc('') }}>Cancel</button>
                <button className="btn" type="button" onClick={handleSaveCover} disabled={uploadingCover || !coverPixels}>
                  {uploadingCover ? 'Uploading…' : 'Set cover'}
                </button>
              </div>
            </>
          ) : (
            <p className="hint">Pick an image file to crop it to 16:9 for this event&apos;s cover.</p>
          )}
        </Modal>
      )}
    </div>
  )
}
