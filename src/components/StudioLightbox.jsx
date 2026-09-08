import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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
export default function StudioLightbox({ items, index, onClose, onIndexChange }) {
  const touchStartX = useRef(null)
  const [mediaLoaded, setMediaLoaded] = useState(false)

  const photo = items[index]
  const go = (dir) => onIndexChange((i) => Math.min(Math.max(i + dir, 0), items.length - 1))

  useEffect(() => {
    setMediaLoaded(false)
  }, [index])

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
          <img
            key={photo.photo_id}
            src={fileUrl(photo.url)}
            alt={photo.filename}
            className="lightbox-image"
            draggable={false}
            onLoad={() => setMediaLoaded(true)}
            style={{ opacity: mediaLoaded ? 1 : 0 }}
          />
        )}

        {index < items.length - 1 && (
          <button className="lightbox-nav lightbox-nav-next" type="button" onClick={() => go(1)} aria-label="Next photo">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
        <p className="lightbox-caption">{photo.filename}</p>
        <span className="hint">{index + 1} of {items.length}</span>
      </div>
    </div>,
    document.body
  )
}
