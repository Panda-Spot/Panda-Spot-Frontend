import React, { useState } from 'react'
import GalleryMedia from './GalleryMedia.jsx'
import { fileUrl } from '../api.js'

function Closeup({ photoId, bbox, eventId, size = 88 }) {
  const [natural, setNatural] = useState(null)
  const [failed, setFailed] = useState(false)
  const src = fileUrl(`/files/events/${eventId}/photos/${photoId}/thumb`)

  if (!Array.isArray(bbox) || bbox.length < 4 || failed) {
    return (
      <div
        className="skeleton"
        style={{ width: size, height: size, borderRadius: 12 }}
      />
    )
  }

  const onLoad = (e) => {
    const w = e.currentTarget.naturalWidth
    const h = e.currentTarget.naturalHeight
    if (w > 0 && h > 0) setNatural({ width: w, height: h })
    else setFailed(true)
  }

  if (!natural) {
    // Hidden probe image: measures the thumbnail once, then the real
    // crop below uses percentages (bbox pixels are original-image
    // space, so measuring the served file keeps the math exact).
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onLoad={onLoad}
        onError={() => setFailed(true)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    )
  }

  const [x1, y1, x2, y2] = bbox.map(Number)
  const left = Math.max(0, Math.min(x1 / natural.width, 1))
  const top = Math.max(0, Math.min(y1 / natural.height, 1))
  const right = Math.max(0, Math.min(x2 / natural.width, 1))
  const bottom = Math.max(0, Math.min(y2 / natural.height, 1))
  // Padded square around the face, clamped inside the image.
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const half = Math.max(right - left, bottom - top) * 0.85
  let sqLeft = Math.max(0, cx - half)
  let sqTop = Math.max(0, cy - half)
  let sqSize = half * 2
  if (sqLeft + sqSize > 1) sqLeft = Math.max(0, 1 - sqSize)
  if (sqTop + sqSize > 1) sqTop = Math.max(0, 1 - sqSize)
  sqSize = Math.min(sqSize, 1 - sqLeft, 1 - sqTop)
  if (!(sqSize > 0)) return <div className="skeleton" style={{ width: size, height: size, borderRadius: 12 }} />

  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#000', flexShrink: 0 }}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: `${-(sqLeft / sqSize) * 100}%`,
          top: `${-(sqTop / sqSize) * 100}%`,
          width: `${100 / sqSize}%`,
          maxWidth: 'none',
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
export default function FaceGroupsView({ eventId, groupsState, openGroupId, onOpenGroup, onOpenPhoto }) {
  const { loading, error, data } = groupsState || {}

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

  return (
    <div>
      <p className="hint" style={{ marginBottom: 12 }}>
        {data.group_count} unique face{data.group_count === 1 ? '' : 's'} across {data.face_count} detected face{data.face_count === 1 ? '' : 's'}.
        Guest searches check these unique faces, so the same person is found once no matter how many photos they appear in.
      </p>
      <div className="photo-grid">
        {groups.map((g) => {
          const open = openGroupId === g.group_index
          return (
            <div className="photo-card" key={g.group_index}>
              <div
                style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, cursor: 'pointer' }}
                onClick={() => onOpenGroup(open ? null : g.group_index)}
                title={open ? 'Collapse' : 'Show member photos'}
              >
                <Closeup photoId={g.representative.photo_id} bbox={g.representative.bbox} eventId={eventId} />
                <div style={{ minWidth: 0 }}>
                  <p className="subtle" style={{ margin: 0 }}>
                    <strong>Person {g.group_index + 1}</strong>
                  </p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>
                    {g.photo_ids.length} photo{g.photo_ids.length === 1 ? '' : 's'} · {g.face_count} face{g.face_count === 1 ? '' : 's'}
                  </p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>{open ? '▾ Hide photos' : '▸ Show photos'}</p>
                </div>
              </div>
              {open && (
                <div className="photo-grid" style={{ padding: 12, paddingTop: 0 }}>
                  {g.photo_ids.map((photoId) => (
                    <div
                      key={photoId}
                      style={{ cursor: 'zoom-in' }}
                      onClick={() => onOpenPhoto({
                        photo_id: photoId,
                        filename: `${photoId}.jpg`,
                        url: `/files/events/${eventId}/photos/${photoId}`,
                        thumbnail_url: `/files/events/${eventId}/photos/${photoId}/thumb`,
                      })}
                      title="Open fullscreen + face closeups"
                    >
                      <GalleryMedia
                        src={fileUrl(`/files/events/${eventId}/photos/${photoId}/thumb`)}
                        filename={`${photoId}.jpg`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
