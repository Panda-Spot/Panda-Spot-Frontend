import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Heart, Info, X } from 'lucide-react'
import { fileUrl } from '../api.js'
import { isVideoFile } from '../utils/media.js'
import { lockScroll, unlockScroll } from '../utils/scrollLock.js'

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

  // Instant preview: thumbnails only, never the full original — plus the
  // neighbours preloaded so arrow/swipe navigation has zero delay.
  const thumbSrc = (p) => (p ? fileUrl(p.thumbnail_url || p.url) : '')
  const [fullLoaded, setFullLoaded] = useState(false)

  useEffect(() => {
    setMediaLoaded(false)
    setFullLoaded(false)
  }, [index])

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
            <img
              key={`t-${photo.photo_id}`}
              src={thumbSrc(photo)}
              alt={photo.filename}
              className="lightbox-image"
              draggable={false}
              onLoad={() => setMediaLoaded(true)}
              style={{ opacity: mediaLoaded ? 1 : 0 }}
            />
            <img
              key={`f-${photo.photo_id}`}
              src={fileUrl(photo.url)}
              alt=""
              aria-hidden
              className="lightbox-image preview-full"
              draggable={false}
              onLoad={() => setFullLoaded(true)}
              onError={() => setFullLoaded(false)}
              style={{ opacity: fullLoaded ? 1 : 0 }}
            />
          </div>
        )}

        {index < items.length - 1 && (
          <button className="lightbox-nav lightbox-nav-next" type="button" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
        <p className="lightbox-caption">{photo.filename}</p>
        <div className="lightbox-footer-row">
          <span className="hint">{index + 1} of {items.length}</span>
          {actions && (
            <div className="lightbox-actions">
              {actions.onHeart && (
                <button
                  className="icon-btn" type="button"
                  title={photo.highlighted ? 'Remove TV highlight' : 'Highlight for the TV wall'}
                  onClick={() => actions.onHeart(photo)}
                  style={{ color: photo.highlighted ? '#EF4444' : undefined }}
                >
                  <Heart size={16} fill={photo.highlighted ? '#EF4444' : 'none'} />
                </button>
              )}
              {actions.onArchive && (
                <button
                  className="icon-btn" type="button"
                  title={photo.archived_at ? 'Restore — show to guests and clients again' : 'Archive — hide from guests and clients without deleting'}
                  onClick={() => actions.onArchive(photo)}
                >
                  {photo.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
              )}
              {actions.onInfo && (
                <button
                  className="icon-btn info" type="button"
                  title="Details, rating, downloads, cover"
                  onClick={() => actions.onInfo(photo)}
                >
                  <Info size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
