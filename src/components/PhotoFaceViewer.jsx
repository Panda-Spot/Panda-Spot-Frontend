import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
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
export default function PhotoFaceViewer({ photo, faces, loading, onClose, onRemove, items, index = 0, onIndexChange }) {
  const [natural, setNatural] = useState(null)
  const [imgError, setImgError] = useState(false)
  // Thumbnails only — originals may live on Drive (revocable) or be
  // expired; the cached thumbnail is always servable. Same rule as the
  // studio lightbox: never load the original in a preview.
  const src = photo ? fileUrl(photo.thumbnail_url || photo.url) : ''
  const total = Array.isArray(items) && items.length > 0 ? items.length : 1
  const canNav = typeof onIndexChange === 'function' && total > 1
  const go = (dir) => { if (canNav) onIndexChange(dir) }

  useEffect(() => {
    setNatural(null)
    setImgError(false)
  }, [photo?.photo_id])

  useEffect(() => {
    if (!photo) return
    lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlockScroll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, onClose, onIndexChange, total])

  if (!photo) return null

  const faceList = faces || []
  // Crop math needs ORIGINAL-image dims (bboxes are original pixels) while
  // only the thumbnail is ever displayed. Stored dims win; the measured
  // thumbnail is NOT a substitute (different size = wrong fractions).
  // Without dims, boxes hide and tiles show the whole thumbnail.
  const dims = photo.width && photo.height
    ? { width: photo.width, height: photo.height }
    : null

  const closeup = (f) => {
    const r = toRect(f.bbox, dims)
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
        {canNav && index > 0 && (
          <button className="lightbox-nav lightbox-nav-prev" type="button" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronLeft size={28} />
          </button>
        )}
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
          {imgError && <p className="error" style={{ padding: 12 }}>Couldn&apos;t load the thumbnail.</p>}
          {dims && faceList.map((f, i) => {
            const r = toRect(f.bbox, dims)
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
              {canNav ? `${index + 1} of ${total} · ` : ''}
              {loading ? 'Loading faces…' : `${faceList.length} face${faceList.length === 1 ? '' : 's'} captured`}
            </span>
          </div>
          {!loading && faceList.length > 0 && (
            <div className="face-strip">
              {faceList.map((f, i) => {
                // Preferred: server-stored closeup (exact pixels). Fallback:
                // crop math from stored dims; last resort: whole thumbnail.
                if (f.thumbnail_url) {
                  return (
                    <div key={f.id || i} className="face-strip-item">
                      <div className="face-strip-crop">
                        <img
                          src={fileUrl(f.thumbnail_url)}
                          alt={`Face ${i + 1}`}
                          draggable={false}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <span className="hint">#{i + 1}{f.det_score != null ? ` · ${Math.round(f.det_score * 100)}%` : ''}</span>
                    </div>
                  )
                }
                const hasCrop = !!dims;
                const sq = hasCrop ? closeup(f) : null
                return (
                  <div key={f.id || i} className="face-strip-item">
                    <div className="face-strip-crop">
                      <img
                        src={src}
                        alt={`Face ${i + 1}`}
                        draggable={false}
                        style={hasCrop ? {
                          position: 'absolute',
                          left: `${-(sq.left / sq.size) * 100}%`,
                          top: `${-(sq.top / sq.size) * 100}%`,
                          width: `${100 / sq.size}%`,
                          maxWidth: 'none',
                        } : {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
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
              <button
                className="icon-btn danger" type="button"
                title="Remove from AI Search (face data kept, photo stays in Photos & Imports)"
                onClick={onRemove}
                style={{ width: 34, height: 34 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        {canNav && index < total - 1 && (
          <button className="lightbox-nav lightbox-nav-next" type="button" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
