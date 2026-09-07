import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { Archive, ArchiveRestore, CalendarDays, MapPin, Pencil } from 'lucide-react'
import { updateEvent } from '../../api.js'
import { useToast } from '../../toast.jsx'
import { useEvent } from './EventContext.jsx'
import AccessSettingsCard from '../../components/AccessSettingsCard.jsx'
import PrivacySettingsCard from '../../components/PrivacySettingsCard.jsx'
import EventThemePicker from '../../components/EventThemePicker.jsx'
import Modal from '../../components/Modal.jsx'

export default function Overview() {
  const { showToast } = useToast()
  const {
    eventId, event, load,
    archiving, handleArchive, handleRestore, handleDeleteEvent, deletingEvent,
    openEditDetails, showEditDetails, setShowEditDetails,
    editName, setEditName, editDate, setEditDate, editVenue, setEditVenue,
    editDesc, setEditDesc, savingDetails, handleSaveDetails,
    handleCoverFile, handleSaveCover, handleRemoveCover,
    showCoverModal, setShowCoverModal, coverSrc, setCoverSrc,
    coverCrop, setCoverCrop, coverZoom, setCoverZoom, coverPixels, setCoverPixels, uploadingCover,
    handleToggleFeature, togglingFeature,
    accessDraft, setAccessDraft,
    privacyDraft, setPrivacyDraft,
    subGalleryName, setSubGalleryName, creatingSubGallery, handleCreateSubGallery,
    setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('manager') }, [setActiveTab])

  const [savingLeadMode, setSavingLeadMode] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

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
    setSavingAccess(true)
    try {
      await updateEvent(eventId, body)
      setAccessDraft(null)
      showToast('Access settings saved')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setSavingAccess(false)
    }
  }

  const handlePrivacySave = async () => {
    if (!privacyDraft) return
    setSavingPrivacy(true)
    try {
      const days = privacyDraft.guest_data_retention_days
      await updateEvent(eventId, {
        require_face_search_consent: !!privacyDraft.require_face_search_consent,
        privacy_notice_text: privacyDraft.privacy_notice_text?.trim() ? privacyDraft.privacy_notice_text.trim() : null,
        selfie_retention_mode: privacyDraft.selfie_retention_mode,
        guest_data_retention_days: days === '' || days == null ? null : Number(days),
        allow_guest_data_delete_request: !!privacyDraft.allow_guest_data_delete_request,
      })
      setPrivacyDraft(null)
      showToast('Privacy settings saved')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setSavingPrivacy(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {event?.name || 'Event'}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Settings, access, features and danger zone for this event.
        </p>
      </div>

      <div className="event-stack">
        {event?.archived_at && (
          <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
            <div className="guest-link-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Archive size={14} /> Archived — hidden from guests and clients
            </div>
            <p className="hint">
              Archived {new Date(event.archived_at).toLocaleDateString()}. Nothing is deleted; restore to bring guests and clients back.
            </p>
            <button className="btn secondary" type="button" onClick={handleRestore} disabled={archiving}>
              <ArchiveRestore size={14} /> {archiving ? 'Restoring…' : 'Restore event'}
            </button>
          </div>
        )}

        {event && (
          <div className="card">
            <div className="guest-link-label">Event settings</div>
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
            {event.archived_at && (
              <p className="hint">Archived — hidden from guests and clients until restored.</p>
            )}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn secondary" type="button" onClick={openEditDetails}>
                <Pencil size={14} /> Edit details
              </button>
              {!event.archived_at && (
                <button className="btn secondary" type="button" onClick={handleArchive} disabled={archiving}>
                  <Archive size={14} /> {archiving ? 'Archiving…' : 'Archive'}
                </button>
              )}
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

        {event && (
          <AccessSettingsCard
            event={event}
            draft={accessDraft}
            setDraft={setAccessDraft}
            saving={savingAccess}
            guestLinkUrl={`${window.location.origin}/e/${event.guestSlug}`}
            copied={false}
            onCopyLink={() => {}}
            onSave={handleAccessSave}
          />
        )}

        {event && (
          <div className="card">
            <div className="guest-link-label">Features</div>
            <p className="hint">
              Turn on either or both — they run independently on this same event and gallery.
            </p>
            <p className="hint">
              AI indexed photos: {event.ai_indexed_photo_count ?? 0}. Currently searchable: {event.face_search_searchable_photo_count ?? 0}.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!event.face_search_enabled}
                disabled={togglingFeature === 'faceSearch'}
                onChange={(e) => handleToggleFeature('faceSearch', e.target.checked)}
              />
              Face Search — guests find their own photos with a selfie
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!event.photo_selection_enabled}
                disabled={togglingFeature === 'photoSelection'}
                onChange={(e) => handleToggleFeature('photoSelection', e.target.checked)}
              />
              Photo Selection — clients log in to browse, favourite, and submit picks
            </label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
              <div>
                <label className="field-label" htmlFor="lead-mode">Guest lead capture</label>
                <select
                  id="lead-mode"
                  className="text-input"
                  value={event.lead_capture_mode || 'disabled'}
                  disabled={savingLeadMode}
                  onChange={(e) => handleLeadMode(e.target.value)}
                  style={{ maxWidth: 240 }}
                >
                  <option value="disabled">Disabled</option>
                  <option value="optional">Optional form</option>
                  <option value="required_search">Required before search</option>
                  <option value="required_download">Required before download</option>
                </select>
              </div>
              <Link className="btn secondary" to={`/events/${eventId}/attendees`}>
                Attendee dashboard
              </Link>
            </div>
          </div>
        )}

        {event && (event.role === 'owner' || event.role === 'collaborator') && (
          <PrivacySettingsCard
            event={event}
            draft={privacyDraft}
            setDraft={setPrivacyDraft}
            saving={savingPrivacy}
            onSave={handlePrivacySave}
          />
        )}

        {event && (event.role === 'owner' || event.role === 'collaborator') && (
          <EventThemePicker eventId={eventId} currentThemeId={event.gallery_theme_id} onSaved={load} />
        )}

        {event && !event.is_sub_gallery && (
          <div className="card">
            <div className="guest-link-label">Sub-galleries</div>
            <p className="hint">
              Split this event into separate galleries (e.g. "Ceremony" / "Reception") — guests scan the one shared
              link, then pick a sub-gallery before searching or uploading.
            </p>
            {event.sub_galleries?.length > 0 && (
              <ul className="team-list">
                {event.sub_galleries.map((g) => (
                  <li key={g.id} className="team-list-item">
                    <span>{g.name} <span className="hint">({g.photo_count} photos)</span></span>
                    <Link className="btn secondary" to={`/events/${g.id}`}>Open</Link>
                  </li>
                ))}
              </ul>
            )}
            <form className="row" onSubmit={handleCreateSubGallery} style={{ marginTop: 10 }}>
              <input
                className="text-input"
                type="text"
                placeholder="e.g. Ceremony"
                value={subGalleryName}
                onChange={(e) => setSubGalleryName(e.target.value)}
              />
              <button className="btn" type="submit" disabled={creatingSubGallery || !subGalleryName.trim()}>
                {creatingSubGallery ? 'Adding…' : 'Add sub-gallery'}
              </button>
            </form>
          </div>
        )}

        {event?.role === 'owner' && (
          <div className="card danger-zone">
            <div className="guest-link-label">Danger zone</div>
            <p className="hint">Permanently deletes this event, every photo, and the guest link. Guests will no longer be able to search this event.</p>
            <button className="btn danger-btn" type="button" onClick={handleDeleteEvent} disabled={deletingEvent}>
              {deletingEvent ? 'Deleting.' : 'Delete event'}
            </button>
          </div>
        )}
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
