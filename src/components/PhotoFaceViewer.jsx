import React, { useEffect, useState } from 'react'
import Modal from './ui/Modal.jsx'
import { fileUrl } from '../api.js'

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
 * Fullscreen face-detail viewer: the whole photo with numbered boxes over
 * every recognized face, plus a closeup tile per face (cropped
 * client-side from the bbox, so no extra backend round trips beyond the
 * one faces fetch). Bboxes are stored in original-image pixels, converted
 * here against the loaded image's natural size.
 */
export default function PhotoFaceViewer({ photo, faces, loading, onClose, onRemove }) {
  const [natural, setNatural] = useState(null)
  const [imgError, setImgError] = useState(false)
  const src = photo ? fileUrl(photo.url) : ''

  useEffect(() => {
    setNatural(null)
    setImgError(false)
  }, [photo?.photo_id])

  if (!photo) return null

  return (
    <Modal open={!!photo} onClose={onClose} title={photo.filename || 'Photo'} size="2xl">
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <img
          src={src}
          alt={photo.filename}
          style={{ width: '100%', display: 'block', maxHeight: '62vh', objectFit: 'contain', background: '#000' }}
          onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
          onError={() => setImgError(true)}
        />
        {imgError && <p className="error" style={{ padding: 12 }}>Couldn&apos;t load the full image.</p>}
        {natural && (faces || []).map((f, i) => {
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

      <div className="guest-link-label" style={{ marginTop: 16 }}>
        Recognized faces ({loading ? '…' : (faces || []).length})
      </div>
      {loading ? (
        <p className="hint">Loading faces…</p>
      ) : (faces || []).length === 0 ? (
        <p className="hint">No face data on this photo — it may predate face indexing, or detection found nothing.</p>
      ) : (
        natural && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {(faces || []).map((f, i) => {
              const sq = paddedSquare({
                left: toRect(f.bbox, natural).left / 100,
                top: toRect(f.bbox, natural).top / 100,
                width: toRect(f.bbox, natural).width / 100,
                height: toRect(f.bbox, natural).height / 100,
              })
              return (
                <div key={f.id || i} style={{ width: 96, textAlign: 'center' }}>
                  <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#000' }}>
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
                  <p className="hint" style={{ marginTop: 4 }}>#{i + 1}{f.det_score != null ? ` · ${Math.round(f.det_score * 100)}%` : ''}</p>
                </div>
              )
            })}
          </div>
        )
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        {onRemove && (
          <button className="btn secondary" type="button" onClick={onRemove}>
            Remove from AI Search
          </button>
        )}
        <button className="btn secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
