import React, { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import GalleryMedia from './GalleryMedia.jsx'
import MergeReview from './MergeReview.jsx'
import Modal from './Modal.jsx'
import { fileUrl, setFacePersonName } from '../api.js'
import { useToast } from '../toast.jsx'

function Closeup({ photoId, bbox, dims, thumbnailUrl, eventId, size = 88, circle = false }) {
  // Preferred: the server-stored face closeup (extracted at index time,
  // exact pixels, no math). Fallbacks in order: crop math from stored dims,
  // whole photo thumbnail, skeleton. Originals are never loaded here.
  const [failed, setFailed] = useState(false)
  // A re-index swaps the representative face id (new thumbnail URL) while
  // React reuses this tile by position — drop the old failure so the new
  // closeup gets a fresh load instead of a stuck fallback.
  useEffect(() => { setFailed(false) }, [thumbnailUrl, photoId])
  const thumbSrc = fileUrl(`/files/events/${eventId}/photos/${photoId}/thumb`)
  const radius = circle ? '50%' : 12

  if (thumbnailUrl && !failed) {
    return (
      <img
        src={fileUrl(thumbnailUrl)}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }

  if (!Array.isArray(bbox) || bbox.length < 4) {
    return (
      <img
        src={thumbSrc}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }

  if (!dims?.width || !dims?.height) {
    return (
      <img
        src={thumbSrc}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }

  const [x1, y1, x2, y2] = bbox.map(Number)
  const fw = Math.max(0, Math.min(x2 / dims.width, 1) - Math.max(0, Math.min(x1 / dims.width, 1)))
  const fh = Math.max(0, Math.min(y2 / dims.height, 1) - Math.max(0, Math.min(y1 / dims.height, 1)))
  const cx = (Math.max(0, Math.min(x1 / dims.width, 1)) + Math.max(0, Math.min(x2 / dims.width, 1))) / 2
  const cy = (Math.max(0, Math.min(y1 / dims.height, 1)) + Math.max(0, Math.min(y2 / dims.height, 1))) / 2
  // Pixel-square crop (see PhotoFaceViewer): fraction squares drift on
  // non-square photos, so run the padding in pixel space (height = 1,
  // width = aspect) and size the tile img per axis.
  const aspect = dims.width / dims.height || 1
  let side = Math.max(fw * aspect, fh) * 1.7
  side = Math.min(side, aspect, 1)
  if (!(side > 0)) return <div className="skeleton" style={{ width: size, height: size, borderRadius: radius }} />
  const x0 = Math.min(Math.max(cx * aspect - side / 2, 0), Math.max(0, aspect - side))
  const y0 = Math.min(Math.max(cy - side / 2, 0), Math.max(0, 1 - side))
  const sqLeft = x0 / aspect
  const sqTop = y0
  const sqSizeW = side / aspect
  const sqSizeH = side

  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'relative', background: '#000', flexShrink: 0 }}>
      <img
        src={thumbSrc}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          left: `${-(sqLeft / sqSizeW) * 100}%`,
          top: `${-(sqTop / sqSizeH) * 100}%`,
          width: `${100 / sqSizeW}%`,
          height: `${100 / sqSizeH}%`,
          maxWidth: 'none',
          maxHeight: 'none',
        }}
      />
    </div>
  )
}

/**
 * Auto face-groups browser for the AI Faces sub-tab: one card per
 * person-group (representative closeup, photo/face counts), expanding to
 * the member photos, each opening the fullscreen face viewer.
 */
export default function FaceGroupsView({ eventId, groupsState, openGroupId, onOpenGroup, onOpenPhoto, onRenamed }) {
  const { loading, error, data } = groupsState || {}
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  // Photo viewer modal: which group's photos are open (scrolls inside
  // the modal — never expands below the grid).
  const [viewing, setViewing] = useState(null)

  if (loading) {
    return <p className="hint">Grouping faces — comparing every detected face in this event…</p>
  }
  if (error) {
    return <p className="error">{error}</p>
  }
  const groups = data?.groups || []
  if (groups.length === 0) {
    return (
      <p className="hint">
        No face groups yet — groups appear once photos with detected faces are added to AI Search.
      </p>
    )
  }
  const q = query.trim().toLowerCase()
  const shown = q
    ? groups.filter((g) => (g.person_name || '').toLowerCase().includes(q) || `person ${g.group_index + 1}`.includes(q))
    : groups
  // Default order: most photos first.
  const sorted = [...shown].sort((a, b) =>
    (b.photo_ids.length - a.photo_ids.length) || (b.face_count - a.face_count))

  const saveName = async (g) => {
    setSaving(true)
    try {
      await setFacePersonName(eventId, g.face_ids || [], draft.trim())
      setEditing(null)
      showToast(draft.trim() ? `Named “${draft.trim()}”.` : 'Name cleared.')
      onRenamed?.()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="hint" style={{ marginBottom: 12 }}>
        {data.group_count} unique face{data.group_count === 1 ? '' : 's'} across {data.face_count} detected face{data.face_count === 1 ? '' : 's'}.
        Guest searches check these unique faces, so the same person is found once no matter how many photos they appear in.
      </p>
      <input
        className="text-input gallery-search"
        type="search"
        placeholder="Search by person name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <MergeReview eventId={eventId} onChanged={onRenamed} />
      {shown.length === 0 && (
        <p className="hint">No people match “{query.trim()}”.</p>
      )}
      <div className="face-circle-grid">
        {sorted.map((g) => {
          const isEditing = editing === g.group_index
          const name = g.person_name || `Person ${g.group_index + 1}`
          return (
            <div className="face-circle-card" key={g.group_index}>
              <div
                style={{ position: 'relative', width: 96, height: 96, cursor: 'pointer' }}
                onClick={() => setViewing(g)}
                title={`${name} — view ${g.photo_ids.length} photo${g.photo_ids.length === 1 ? '' : 's'}`}
              >
                <Closeup photoId={g.representative.photo_id} bbox={g.representative.bbox} dims={{ width: g.representative.width, height: g.representative.height }} thumbnailUrl={g.representative.thumbnail_url} eventId={eventId} size={96} circle />
                <span className="face-count-badge" title={`${g.photo_ids.length} photo${g.photo_ids.length === 1 ? '' : 's'}`}>
                  {g.photo_ids.length}
                </span>
              </div>
              {isEditing ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 8, width: '100%' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    className="text-input"
                    value={draft}
                    autoFocus
                    maxLength={60}
                    placeholder="Name (blank clears)"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(g); if (e.key === 'Escape') setEditing(null) }}
                    style={{ fontSize: 12, padding: '5px 8px', minWidth: 0 }}
                  />
                  <button className="btn secondary" type="button" disabled={saving} onClick={() => saveName(g)} style={{ padding: '5px 8px', fontSize: 12, flexShrink: 0 }}>
                    {saving ? '…' : 'OK'}
                  </button>
                </div>
              ) : (
                <p className="subtle face-circle-name" title={name}>
                  <strong>{name}</strong>
                  <button
                    type="button" className="icon-btn" title={g.person_name ? 'Rename' : 'Name this person'}
                    style={{ width: 22, height: 22, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); setDraft(g.person_name || ''); setEditing(g.group_index) }}
                  >
                    <Pencil size={11} />
                  </button>
                </p>
              )}
            </div>
          )
        })}
      </div>
      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          title={`${viewing.person_name || `Person ${viewing.group_index + 1}`} — ${viewing.photo_ids.length} photo${viewing.photo_ids.length === 1 ? '' : 's'}`}
        >
          <div className="photo-grid">
            {(viewing.photos || viewing.photo_ids.map((photoId) => ({ photo_id: photoId, filename: `${photoId}.jpg` }))).map((p) => (
              <div
                key={p.photo_id}
                style={{ cursor: 'zoom-in' }}
                onClick={() => {
                  const list = (viewing.photos || viewing.photo_ids.map((photoId) => ({ photo_id: photoId, filename: `${photoId}.jpg` }))).map((qq) => ({
                    photo_id: qq.photo_id,
                    filename: qq.filename,
                    ...(qq.width && qq.height ? { width: qq.width, height: qq.height } : {}),
                    url: `/files/events/${eventId}/photos/${qq.photo_id}`,
                    thumbnail_url: `/files/events/${eventId}/photos/${qq.photo_id}/thumb`,
                  }))
                  onOpenPhoto(
                    list[Math.max(0, list.findIndex((qq) => qq.photo_id === p.photo_id))],
                    list,
                    { personName: viewing.person_name || null, faceIds: viewing.face_ids || [] },
                  )
                }}
                title="Open fullscreen + face closeups"
              >
                <GalleryMedia
                  src={fileUrl(`/files/events/${eventId}/photos/${p.photo_id}/thumb`)}
                  filename={p.filename}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
