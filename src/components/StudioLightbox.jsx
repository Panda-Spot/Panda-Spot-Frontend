import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Eye, EyeOff, Heart, Info, X } from 'lucide-react'
import { fileUrl } from '../api.js'
import { getToken } from '../authToken.js'
import { isVideoFile } from '../utils/media.js'
import { lockScroll, unlockScroll } from '../utils/scrollLock.js'
import ZoomableImage from './gallery/ZoomableImage.jsx'

const SWIPE_THRESHOLD_PX = 50

// Full-screen studio preview for the management grids (Photos & Imports,
// Selection members/groups/merged). Phone-gallery style: tap the backdrop
// or Esc to close, arrow keys / on-screen chevrons / touch swipe to move.
// Deliberately plain — no comments, reactions or shares here. The AI Search
// members grid keeps its own PhotoFaceViewer (face closeups), so it does
// not use this.
//
// Optional `actions` ({ onHeart, onArchive, onInfo }) renders an action
// cluster in the footer, reading live flags off the current item. Only the
// Photos lightbox passes actions today; Selection previews stay plain.
export default function StudioLightbox({ items, index, onClose, onIndexChange, actions }) {
  const touchStartX = useRef(null)
  const [mediaLoaded, setMediaLoaded] = useState(false)

  const photo = items[index]
  const go = (dir) => onIndexChange((i) => Math.min(Math.max(i + dir, 0), items.length - 1))

  // Preview paints the cached thumbnail instantly and fills the screen.
  // The full original loads ONLY on eye-toggle (studio owners): direct
  // uploads + PandaShoots stream from the server, Drive imports are pulled
  // from the Drive folder on demand — with download progress shown.
  const thumbSrc = (p) => (p ? fileUrl(p.thumbnail_url || p.url) : '')
  const [showOriginal, setShowOriginal] = useState(false)
  const [origUrl, setOrigUrl] = useState(null)
  const [origProgress, setOrigProgress] = useState(null) // { loaded, total|null }
  const [origError, setOrigError] = useState('')
  const abortRef = useRef(null)

  const stopOriginalLoad = () => {
    try { abortRef.current?.abort() } catch { /* already settled */ }
    abortRef.current = null
  }

  const loadOriginal = async (p) => {
    stopOriginalLoad()
    setOrigError('')
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

  const toggleOriginal = (p) => {
    if (showOriginal || origUrl) {
      stopOriginalLoad()
      setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
      setOrigProgress(null)
      setOrigError('')
      setShowOriginal(false)
    } else {
      setShowOriginal(true)
      loadOriginal(p)
    }
  }

  useEffect(() => {
    setMediaLoaded(false)
    stopOriginalLoad()
    setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    setOrigProgress(null)
    setOrigError('')
    setShowOriginal(false)
  }, [index])

  useEffect(() => () => {
    stopOriginalLoad()
    setOrigUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [])

  useEffect(() => {
    for (const n of [index - 1, index + 1]) {
      const p = items[n]
      if (p && !isVideoFile(p.filename)) {
        const img = new Image()
        img.src = thumbSrc(p)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items])

  useEffect(() => {
    lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlockScroll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, onClose, onIndexChange])

  if (!photo) return null

  const video = isVideoFile(photo.filename)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > SWIPE_THRESHOLD_PX) go(-1)
    else if (delta < -SWIPE_THRESHOLD_PX) go(1)
    touchStartX.current = null
  }

  return createPortal(
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" type="button" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>

      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {index > 0 && (
          <button className="lightbox-nav lightbox-nav-prev" type="button" onClick={() => go(-1)} aria-label="Previous photo">
            <ChevronLeft size={28} />
          </button>
        )}

        {!mediaLoaded && <div className="lightbox-spinner" />}
        {video ? (
          <video
            key={photo.photo_id}
            src={fileUrl(photo.url)}
            className="lightbox-image"
            controls
            playsInline
            onLoadedData={() => setMediaLoaded(true)}
            style={{ opacity: mediaLoaded ? 1 : 0 }}
          />
        ) : (
          <div className="preview-stack">
            <ZoomableImage
              key={showOriginal && origUrl ? `o-${photo.photo_id}` : `t-${photo.photo_id}`}
              src={showOriginal && origUrl ? origUrl : thumbSrc(photo)}
              alt={photo.filename}
              className="lightbox-image"
              onLoad={() => setMediaLoaded(true)}
              style={{ opacity: mediaLoaded ? 1 : 0 }}
            />
          </div>
        )}

        {index < items.length - 1 && (
          <button className="lightbox-nav lightbox-nav-next" type="button" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={28} />
          </button>
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
      </div>

      <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
        <p className="lightbox-caption">{photo.filename}</p>
        <div className="lightbox-footer-row">
          <span className="hint">{index + 1} of {items.length}</span>
          <div className="lightbox-actions">
            {!video && (
              <button
                className="icon-btn" type="button"
                title={showOriginal ? 'Back to thumbnail preview' : 'View full original'}
                onClick={() => toggleOriginal(photo)}
              >
                {showOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
            {actions?.onHeart && (
                <button
                  className="icon-btn" type="button"
                  title={photo.highlighted ? 'Remove TV highlight' : 'Highlight for the TV wall'}
                  onClick={() => actions.onHeart(photo)}
                  style={{ color: photo.highlighted ? '#EF4444' : undefined }}
                >
                  <Heart size={16} fill={photo.highlighted ? '#EF4444' : 'none'} />
                </button>
              )}
              {actions?.onArchive && (
                <button
                  className="icon-btn" type="button"
                  title={photo.archived_at ? 'Restore — show to guests and clients again' : 'Archive — hide from guests and clients without deleting'}
                  onClick={() => actions.onArchive(photo)}
                >
                  {photo.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
              )}
              {actions?.onInfo && (
                <button
                  className="icon-btn info" type="button"
                  title="Details, rating, downloads, cover"
                  onClick={() => actions.onInfo(photo)}
                >
                  <Info size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>,
    document.body
  )
}
