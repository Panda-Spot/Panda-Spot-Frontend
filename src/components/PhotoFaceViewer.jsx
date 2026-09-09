import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { fileUrl } from '../api.js'
import { lockScroll, unlockScroll } from '../utils/scrollLock.js'

function toRect(bbox, natural) {
  const [x1, y1, x2, y2] = bbox.map(Number)
  const w = natural.width || 1
  const h = natural.height || 1
  return {
    left: (x1 / w) * 100,
    top: (y1 / h) * 100,
    width: Math.max(0, (x2 - x1) / w) * 100,
    height: Math.max(0, (y2 - y1) / h) * 100,
  }
}

// Padded square crop around a face rect (fractions 0..1), clamped inside
// the image — keeps closeup tiles uniform even for edge faces.
function paddedSquare(rect) {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const half = Math.max(rect.width, rect.height) * 0.85
  let left = Math.max(0, cx - half)
  let top = Math.max(0, cy - half)
  let size = half * 2
  if (left + size > 100) left = Math.max(0, 100 - size)
  if (top + size > 100) top = Math.max(0, 100 - size)
  size = Math.min(size, 100 - left, 100 - top)
  return { left, top, size }
}

/**
 * Fullscreen face-detail viewer (Google Photos style): the whole photo with
 * numbered boxes, and a scrollable closeup strip of every captured face
 * along the bottom — cropped client-side from the bbox, so no extra backend
 * round trips beyond the one faces fetch. Bboxes are stored in
 * original-image pixels, converted here against the loaded image's natural
 * size. Used only from the studio AI Search tab.
 */
export default function PhotoFaceViewer({ photo, faces, loading, onClose, onRemove }) {
  const [natural, setNatural] = useState(null)
  const [imgError, setImgError] = useState(false)
  // Thumbnails only — originals may live on Drive (revocable) or be
  // expired; the cached thumbnail is always servable. Same rule as the
  // studio lightbox: never load the original in a preview.
  const src = photo ? fileUrl(photo.thumbnail_url || photo.url) : ''

  useEffect(() => {
    setNatural(null)
    setImgError(false)
  }, [photo?.photo_id])

  useEffect(() => {
    if (!photo) return
    lockScroll()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlockScroll()
    }
  }, [photo, onClose])

  if (!photo) return null

  const faceList = faces || []

  const closeup = (f) => {
    const r = toRect(f.bbox, natural)
    return paddedSquare({
      left: r.left / 100,
      top: r.top / 100,
      width: r.width / 100,
      height: r.height / 100,
    })
  }

  return createPortal(
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" type="button" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>

      <div className="face-viewer-stage" onClick={(e) => e.stopPropagation()}>
        <div className="face-viewer-photo">
          {!natural && !imgError && <div className="lightbox-spinner" />}
          <img
            src={src}
            alt={photo.filename}
            className="face-viewer-img"
            draggable={false}
            onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            onError={() => setImgError(true)}
          />
          {imgError && <p className="error" style={{ padding: 12 }}>Couldn&apos;t load the full image.</p>}
          {natural && faceList.map((f, i) => {
            const r = toRect(f.bbox, natural)
            return (
              <div
                key={f.id || i}
                style={{
                  position: 'absolute',
                  left: `${r.left}%`,
                  top: `${r.top}%`,
                  width: `${r.width}%`,
                  height: `${r.height}%`,
                  border: '2px solid #F59E0B',
                  borderRadius: 6,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: -2,
                    background: '#F59E0B',
                    color: '#111',
                    fontSize: 11,
                    fontWeight: 800,
                    borderRadius: 9999,
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </span>
              </div>
            )
          })}
        </div>

        <div className="face-viewer-strip" onClick={(e) => e.stopPropagation()}>
          <div className="face-viewer-strip-head">
            <span className="face-viewer-title">{photo.filename}</span>
            <span className="hint">
              {loading ? 'Loading faces…' : `${faceList.length} face${faceList.length === 1 ? '' : 's'} captured`}
            </span>
          </div>
          {!loading && faceList.length > 0 && natural && (
            <div className="face-strip">
              {faceList.map((f, i) => {
                const sq = closeup(f)
                return (
                  <div key={f.id || i} className="face-strip-item">
                    <div className="face-strip-crop">
                      <img
                        src={src}
                        alt={`Face ${i + 1}`}
                        draggable={false}
                        style={{
                          position: 'absolute',
                          left: `${-(sq.left / sq.size) * 100}%`,
                          top: `${-(sq.top / sq.size) * 100}%`,
                          width: `${100 / sq.size}%`,
                          maxWidth: 'none',
                        }}
                      />
                    </div>
                    <span className="hint">#{i + 1}{f.det_score != null ? ` · ${Math.round(f.det_score * 100)}%` : ''}</span>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && faceList.length === 0 && (
            <p className="hint" style={{ margin: '4px 0 0' }}>
              No face data on this photo — it may predate face indexing, or detection found nothing.
            </p>
          )}
          {onRemove && (
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn secondary" type="button" onClick={onRemove}>
                Remove from AI Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
