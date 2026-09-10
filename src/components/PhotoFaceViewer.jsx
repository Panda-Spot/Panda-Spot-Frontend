import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Tag, Trash2, X } from 'lucide-react'
import { fileUrl } from '../api.js'
import { getToken } from '../authToken.js'
import { lockScroll, unlockScroll } from '../utils/scrollLock.js'
import ZoomableImage from './gallery/ZoomableImage.jsx'

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

// Padded SQUARE-IN-PIXELS crop around a face rect (fractions 0..1),
// clamped inside the image — keeps closeup tiles uniform even for edge
// faces. Fraction-space squares are NOT pixel squares on non-square
// photos (a 10%-wide slice of a 3:2 image is 1.5x taller than wide), so
// the math runs in pixel space (height normalized to 1, width = aspect)
// and converts back to per-axis fractions. The tile then sizes the img
// per axis (width % + height %), which maps each axis exactly —
// width-only sizing shifts/squashes tiles on landscape photos.
function paddedSquare(rect, aspect) {
  const a = aspect > 0 ? aspect : 1
  const cx = (rect.left + rect.width / 2) * a
  const cy = rect.top + rect.height / 2
  let side = Math.max(rect.width * a, rect.height) * 1.7
  side = Math.min(side, a, 1)
  if (!(side > 0)) return null
  const x0 = Math.min(Math.max(cx - side / 2, 0), Math.max(0, a - side))
  const y0 = Math.min(Math.max(cy - side / 2, 0), Math.max(0, 1 - side))
  return { left: x0 / a, top: y0, sizeW: side / a, sizeH: side }
}

/**
 * Fullscreen face-detail viewer (Google Photos style): the whole photo with
 * numbered boxes, and a scrollable closeup strip of every captured face
 * along the bottom — cropped client-side from the bbox, so no extra backend
 * round trips beyond the one faces fetch. Bboxes are stored in
 * original-image pixels, converted here against the loaded image's natural
 * size. Used only from the studio AI Search tab.
 */
export default function PhotoFaceViewer({ photo, faces, loading, highlight, onClose, onRemove, items, index = 0, onIndexChange }) {
  const [natural, setNatural] = useState(null)
  const [imgError, setImgError] = useState(false)
  // Face boxes sit in unzoomed coordinates — hide them while zoomed.
  const [zoomed, setZoomed] = useState(false)
  // Thumbnails by default — originals may live on Drive (revocable) or be
  // expired; the cached thumbnail is always servable. The eye toggle
  // streams the full original like Photos & Imports: thumbnail stays
  // painted with a live progress bar, original fades in on top when done.
  const [showOriginal, setShowOriginal] = useState(false)
  const [origUrl, setOrigUrl] = useState(null)
  const [origProgress, setOrigProgress] = useState(null) // { loaded, total|null }
  const [origError, setOrigError] = useState('')
  const [origReady, setOrigReady] = useState(false)
  const abortRef = useRef(null)
  // Person-highlight boxes can be hidden to inspect the clean photo.
  const [showHighlight, setShowHighlight] = useState(true)
  const thumbSrc = photo ? fileUrl(photo.thumbnail_url || photo.url) : ''

  const stopOriginalLoad = () => {
    try { abortRef.current?.abort() } catch { /* already settled */ }
    abortRef.current = null
  }

  const loadOriginal = async (p) => {
    stopOriginalLoad()
    setOrigError('')
    setOrigReady(false)
    setOrigProgress({ loaded: 0, total: null })
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const token = getToken()
      const res = await fetch(fileUrl(p.url), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`Original unavailable (${res.status})`)
      const total = Number(res.headers.get('Content-Length')) || null
      if (!res.body || typeof res.body.getReader !== 'function') {
        const blob = await res.blob()
        setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
        setOrigProgress(null)
        return
      }
      const reader = res.body.getReader()
      const chunks = []
      let loaded = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.byteLength || value.length || 0
        setOrigProgress({ loaded, total })
      }
      const blob = new Blob(chunks)
      setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      setOrigProgress(null)
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setOrigError(e.message || 'Could not load the original')
        setOrigProgress(null)
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
    }
  }

  const toggleOriginal = () => {
    if (!photo?.url) return
    if (showOriginal || origUrl) {
      stopOriginalLoad()
      setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
      setOrigProgress(null)
      setOrigError('')
      setOrigReady(false)
      setShowOriginal(false)
    } else {
      setShowOriginal(true)
      loadOriginal(photo)
    }
  }

  useEffect(() => () => {
    stopOriginalLoad()
    setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])
  const total = Array.isArray(items) && items.length > 0 ? items.length : 1
  const canNav = typeof onIndexChange === 'function' && total > 1
  const go = (dir) => { if (canNav) onIndexChange(dir) }

  useEffect(() => {
    setNatural(null)
    setImgError(false)
    stopOriginalLoad()
    setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    setOrigProgress(null)
    setOrigError('')
    setOrigReady(false)
    setShowOriginal(false)
  }, [photo?.photo_id]) // eslint-disable-line react-hooks/exhaustive-deps
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

  // Person highlight lives on the main image only (green box): the
  // strip below stays neutral and keeps its detection order.
  const isHighlighted = (f) => {
    if (!highlight) return false
    if (Array.isArray(highlight.faceIds) && highlight.faceIds.length > 0) return highlight.faceIds.includes(f.id)
    return !!(highlight.personName && f.person_name && f.person_name === highlight.personName)
  }
  const rawList = faces || []
  const hasHighlight = !!highlight && rawList.some(isHighlighted)
  const faceList = rawList
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
    }, dims.width / dims.height)
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
          <ZoomableImage
            key={`t-${photo.photo_id}`}
            src={thumbSrc}
            alt={photo.filename}
            className="face-viewer-img"
            onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            onError={() => setImgError(true)}
            onZoomChange={(z) => setZoomed(z > 1)}
          />
          {showOriginal && origUrl && (
            <ZoomableImage
              key={`o-${photo.photo_id}`}
              src={origUrl}
              alt={photo.filename}
              className="face-viewer-img"
              onLoad={() => setOrigReady(true)}
              onZoomChange={(z) => setZoomed(z > 1)}
              style={{
                position: 'absolute', inset: 0,
                opacity: origReady ? 1 : 0,
                transition: 'opacity 0.3s',
                pointerEvents: origReady ? undefined : 'none',
              }}
            />
          )}
          {(origProgress || origError) && (
            <div className="orig-progress-float" onClick={(e) => e.stopPropagation()}>
              {origProgress ? (
                <>
                  <div className="orig-progress-bar">
                    <div
                      style={{
                        width: origProgress.total ? `${Math.round((origProgress.loaded / origProgress.total) * 100)}%` : '35%',
                        height: '100%',
                        background: '#F59E0B',
                        borderRadius: 3,
                        transition: origProgress.total ? 'width 0.2s' : undefined,
                      }}
                      className={origProgress.total ? undefined : 'orig-progress-busy'}
                    />
                  </div>
                  <span className="hint">
                    Downloading original… {origProgress.total
                      ? `${Math.round((origProgress.loaded / origProgress.total) * 100)}%`
                      : `${(origProgress.loaded / 1048576).toFixed(1)} MB`}
                  </span>
                </>
              ) : (
                <p className="error" style={{ margin: 0, fontSize: 12 }}>{origError}</p>
              )}
            </div>
          )}
          {imgError && <p className="error" style={{ padding: 12 }}>Couldn&apos;t load the thumbnail.</p>}
          {dims && !zoomed && showHighlight && faceList.map((f, i) => {
            const r = toRect(f.bbox, dims)
            const hot = hasHighlight && isHighlighted(f)
            return (
              <div
                key={f.id || i}
                style={{
                  position: 'absolute',
                  left: `${r.left}%`,
                  top: `${r.top}%`,
                  width: `${r.width}%`,
                  height: `${r.height}%`,
                  border: hot ? '3px solid #4ADE80' : '2px solid #F59E0B',
                  borderRadius: 6,
                  boxShadow: hot ? '0 0 12px rgba(74,222,128,0.8), 0 0 0 1px rgba(0,0,0,0.6)' : '0 0 0 1px rgba(0,0,0,0.6)',
                  opacity: hasHighlight && !hot ? 0.45 : 1,
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="hint">
                {canNav ? `${index + 1} of ${total} · ` : ''}
                {loading ? 'Loading faces…' : `${faceList.length} face${faceList.length === 1 ? '' : 's'} captured`}
              </span>
              {photo.url && (
                <button
                  type="button" className="icon-btn"
                  title={showOriginal ? 'Back to thumbnail (fast, always available)' : 'View full original'}
                  onClick={(e) => { e.stopPropagation(); toggleOriginal() }}
                  style={{ width: 26, height: 26 }}
                >
                  {showOriginal ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
              {hasHighlight && (
                <button
                  type="button" className="icon-btn"
                  title={showHighlight ? 'Hide person highlight' : 'Show person highlight'}
                  onClick={(e) => { e.stopPropagation(); setShowHighlight((v) => !v) }}
                  style={{ width: 26, height: 26, color: showHighlight ? '#4ADE80' : undefined }}
                >
                  <Tag size={14} />
                </button>
              )}
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
                      <span className="hint">#{i + 1}{f.person_name ? ` · ${f.person_name}` : ''}{f.det_score != null ? ` · ${Math.round(f.det_score * 100)}%` : ''}</span>
                    </div>
                  )
                }
                const hasCrop = !!dims;
                const sq = hasCrop ? closeup(f) : null
                return (
                  <div key={f.id || i} className="face-strip-item">
                    <div className="face-strip-crop">
                      <img
                        src={thumbSrc}
                        alt={`Face ${i + 1}`}
                        draggable={false}
                        style={(hasCrop && sq) ? {
                          position: 'absolute',
                          left: `${-(sq.left / sq.sizeW) * 100}%`,
                          top: `${-(sq.top / sq.sizeH) * 100}%`,
                          width: `${100 / sq.sizeW}%`,
                          height: `${100 / sq.sizeH}%`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                        } : {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    <span className="hint">#{i + 1}{f.person_name ? ` · ${f.person_name}` : ''}{f.det_score != null ? ` · ${Math.round(f.det_score * 100)}%` : ''}</span>
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
