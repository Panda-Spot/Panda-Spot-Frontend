import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import {
  Archive, ArchiveRestore, BookOpen, CalendarDays, Camera, CheckCircle2, ChevronRight,
  Circle, Clock, Image, Layers, MapPin, Pencil, Rocket, Search, Send, Share2,
  SlidersHorizontal, Trash2, Upload, UserPlus, Users, Zap,
} from 'lucide-react'
import { useEvent } from './EventContext.jsx'
import { fileUrl } from '../../api.js'
import Modal from '../../components/Modal.jsx'
import StatCard from '../../components/ui/StatCard.jsx'

export default function Overview() {
  const {
    eventId, event, photos, analytics, clients, collaborators,
    openEditDetails, showEditDetails, setShowEditDetails,
    editName, setEditName, editDate, setEditDate, editVenue, setEditVenue,
    editDesc, setEditDesc, savingDetails, handleSaveDetails,
    handleCoverFile, handleSaveCover, handleRemoveCover,
    showCoverModal, setShowCoverModal, coverSrc, setCoverSrc,
    coverCrop, setCoverCrop, coverZoom, setCoverZoom, coverPixels, setCoverPixels, uploadingCover,
    setActiveTab, requestStartEvent,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const photoCount = photos.length
  const indexedCount = photos.filter((p) => p.face_indexed_at).length
  const searchableCount = photos.filter((p) => p.approval_status !== 'pending' && p.face_search_visible && !p.archived_at).length
  const pendingCount = photos.filter((p) => p.approval_status === 'pending').length
  const clientCount = clients?.length || 0
  const guestSearches = analytics?.total_searches ?? 0

  const notStarted = event && !event.started

  const suggestions = []
  if (notStarted) {
    suggestions.push({ icon: Rocket, label: 'Start the event', desc: 'Unlock uploads, imports and live features', to: null, action: 'start' })
  }
  if (photoCount === 0 && !notStarted) {
    suggestions.push({ icon: Upload, label: 'Upload your first photos', desc: 'Drag & drop JPG/PNG or import from Google Drive', to: `/events/${eventId}/photos` })
  }
  if (photoCount > 0) {
    suggestions.push({ icon: Share2, label: 'Share the guest link', desc: 'Let guests search, upload and browse photos', to: `/events/${eventId}/guests` })
  }
  if ((collaborators?.length || 0) === 0) {
    suggestions.push({ icon: UserPlus, label: 'Invite a second shooter', desc: 'Add a collaborator to help manage this event', to: `/events/${eventId}/team` })
  }
  if (event?.photo_selection_enabled && !event?.published_at) {
    suggestions.push({ icon: Send, label: 'Publish the gallery', desc: 'Make the selection view available to clients', to: `/events/${eventId}/selection` })
  }
  if (event?.face_search_enabled && photoCount > 0 && indexedCount === 0) {
    suggestions.push({ icon: Search, label: 'Index faces for AI search', desc: 'Run face detection so guests can find themselves', to: `/events/${eventId}/ai-search` })
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
              Archived {new Date(event.archived_at).toLocaleDateString()}. Nothing is deleted; restore from the Danger section.
            </p>
            <Link className="btn secondary" to={`/events/${eventId}/danger`}>
              <ArchiveRestore size={14} /> Open Danger section
            </Link>
          </div>
        )}

        {/* ── Start event hero (only when not started) ── */}
        {notStarted && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Rocket size={28} style={{ color: '#F59E0B' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Start this event</h3>
            <p className="hint" style={{ maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Uploading, Google Drive import, and PandaShoots camera upload all unlock once you start the event.
              Everything else — the guest link, analytics, and team — is ready already.
            </p>
            <button className="btn" onClick={requestStartEvent} style={{ fontSize: 15, padding: '10px 28px' }}>
              <Zap size={16} /> Start event
            </button>
          </div>
        )}

        {/* ── Cover + event details (medium banner; cover itself is managed
            inside Edit details, not via separate buttons) ── */}
        {event && (
          <div className="card">
            <div className="event-details-row">
              {event.cover_url && (
                <div className="event-details-cover">
                  <img
                    src={fileUrl(event.cover_url)}
                    alt=""
                    draggable={false}
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="guest-link-label">Event details</div>
                {(event.event_date || event.event_venue || event.description) ? (
                  <div className="event-details-list">
                    {event.event_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                        {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {event.event_venue && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                        {event.event_venue}
                      </span>
                    )}
                    {event.description && (
                      <span className="hint" style={{ lineHeight: 1.5 }}>{event.description}</span>
                    )}
                  </div>
                ) : (
                  <p className="hint" style={{ margin: '0 0 12px' }}>No date, venue, or notes yet — add them below.</p>
                )}
                <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button className="btn secondary" type="button" onClick={openEditDetails}>
                    <Pencil size={14} /> Edit details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats cards — only meaningful once the event is started ── */}
        {event?.started && (
          <div className="stat-grid-6">
            <StatCard label="Photos" value={photoCount} icon={Camera} />
            <StatCard label="Face-indexed" value={indexedCount} icon={Search} />
            <StatCard label="Searchable" value={searchableCount} icon={Zap} />
            <StatCard label="Pending" value={pendingCount} icon={Clock} />
            <StatCard label="Clients" value={clientCount} icon={Users} />
            <StatCard label="Guest searches" value={guestSearches} icon={Image} />
          </div>
        )}

        {/* ── Photo breakdown mini-bar ── */}
        {event?.started && photoCount > 0 && (
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="guest-link-label">Photo breakdown</div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
              {indexedCount > 0 && (
                <div style={{ width: `${(indexedCount / photoCount) * 100}%`, background: '#22C55E', transition: 'width 0.5s' }} />
              )}
              {pendingCount > 0 && (
                <div style={{ width: `${(pendingCount / photoCount) * 100}%`, background: '#F59E0B', transition: 'width 0.5s' }} />
              )}
              {photoCount - indexedCount - pendingCount > 0 && (
                <div style={{ width: `${((photoCount - indexedCount - pendingCount) / photoCount) * 100}%`, background: 'var(--border)', transition: 'width 0.5s' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#22C55E', display: 'inline-block' }} /> Indexed {indexedCount}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B', display: 'inline-block' }} /> Pending {pendingCount}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--border)', display: 'inline-block' }} /> Other {Math.max(0, photoCount - indexedCount - pendingCount)}</span>
            </div>
          </div>
        )}

        {/* ── Features enabled ── */}
        {event && (
          <div className="card">
            <div className="guest-link-label">Features enabled</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <FeaturePill label="AI Face Search" active={event.face_search_enabled} icon={Search} />
              <FeaturePill label="Photo Selection" active={event.photo_selection_enabled} icon={Image} />
              <FeaturePill label="PandaShoots" active={event.pandashoots_enabled} icon={Camera} />
              <FeaturePill label="Advanced tools" active={event.advanced_tools_enabled} icon={SlidersHorizontal} />
              <FeaturePill label="Sub-galleries" active={event.sub_galleries_enabled} icon={Layers} />
              <FeaturePill label="Albums" active={event.albums_enabled} icon={BookOpen} />
              <FeaturePill label="Guest Uploads" active={event.guest_upload_enabled} icon={Upload} />
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Features are set at creation. Change, archive or delete from the{' '}
              <Link to={`/events/${eventId}/danger`}>Danger section</Link>.
            </p>
          </div>
        )}

        {/* ── Suggested next steps ── */}
        {suggestions.length > 0 && (
          <div className="card">
            <div className="guest-link-label">Suggested next steps</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {suggestions.map((s) => {
                const Icon = s.icon
                const content = (
                  <>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} style={{ color: '#F59E0B' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{s.desc}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  </>
                )

                if (s.action === 'start') {
                  return (
                    <button
                      key={s.label}
                      onClick={requestStartEvent}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card-bg, #ffffff)',
                        cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F59E0B44'; e.currentTarget.style.boxShadow = '0 0 0 1px #F59E0B22' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {content}
                    </button>
                  )
                }

                return (
                  <Link
                    key={s.label}
                    to={s.to}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card-bg, #ffffff)',
                      textDecoration: 'none', color: 'var(--text-primary)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F59E0B44'; e.currentTarget.style.boxShadow = '0 0 0 1px #F59E0B22' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {content}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit details modal ── */}
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
            <label className="field-label">Cover photo <span className="hint">(16:9 crop)</span></label>
            {event.cover_url ? (
              <>
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <img
                    src={fileUrl(event.cover_url)}
                    alt=""
                    style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                    draggable={false}
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                  />
                  <div className="card-overlay-actions">
                    <div className="meta-actions" style={{ opacity: 1 }}>
                      <label className="icon-btn" style={{ cursor: 'pointer' }} title="Change cover">
                        <Camera size={15} />
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverFile} style={{ display: 'none' }} />
                      </label>
                      <button
                        className="icon-btn danger" type="button" title="Remove cover"
                        onClick={handleRemoveCover}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 4 }}>
                <label className="btn secondary" style={{ cursor: 'pointer' }}>
                  Add cover
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverFile} style={{ display: 'none' }} />
                </label>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={() => setShowEditDetails(false)}>Cancel</button>
              <button className="btn" type="submit" disabled={savingDetails || !editName.trim()}>
                {savingDetails ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Cover crop modal ── */}
      {event && (
        <Modal open={showCoverModal} onClose={() => { setShowCoverModal(false); setCoverSrc('') }} title="Cover photo (16:9)">
          {coverSrc ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 320, background: '#111', borderRadius: 10, overflow: 'hidden' }}>
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
              <label className="field-label" htmlFor="cover-zoom" style={{ marginTop: 14 }}>Zoom</label>
              <input id="cover-zoom" type="range" min="1" max="3" step="0.05" value={coverZoom} onChange={(e) => setCoverZoom(Number(e.target.value))} style={{ width: '100%' }} />
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

function FeaturePill({ label, active, icon: Icon }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      background: active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
      color: active ? '#22C55E' : '#EF4444',
      border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
    }}>
      <Icon size={14} />
      {label}
      <span style={{ fontSize: 11, opacity: 0.7 }}>{active ? 'ON' : 'OFF'}</span>
    </div>
  )
}
