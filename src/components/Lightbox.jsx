import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, Share2, X } from 'lucide-react'
import { addPhotoComment, fileUrl, getPhotoComments } from '../api.js'
import { getGuestClientId, getGuestName, setGuestName } from '../guestId.js'

const SWIPE_THRESHOLD_PX = 50

// Full-screen, swipeable viewer for a guest's matched photos. Shows the
// same thumbnail already loaded in the grid (not the full-res original —
// that's only ever fetched on download/share, see server's files.js), so a
// small caption makes clear a sharper copy is what actually gets downloaded.
export default function Lightbox({ slug, matches, index, onClose, onIndexChange, onShare, sharingId, onToggleLike }) {
  const touchStartX = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [nameInput, setNameInput] = useState(getGuestName())
  const [postingComment, setPostingComment] = useState(false)

  const match = matches[index]

  useEffect(() => {
    setImgLoaded(false)
  }, [index])

  useEffect(() => {
    if (!match) return
    setLoadingComments(true)
    getPhotoComments(slug, match.photo_id)
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false))
  }, [slug, match])

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setPostingComment(true)
    try {
      const comment = await addPhotoComment(slug, match.photo_id, getGuestClientId(), nameInput.trim(), commentText.trim())
      setComments((prev) => [...prev, comment])
      setCommentText('')
      setGuestName(nameInput.trim())
    } catch {
      // Silently drop — the comment box just keeps the typed text so the
      // guest can retry, no need for a hard error state in a lightbox.
    } finally {
      setPostingComment(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndexChange((i) => (i > 0 ? i - 1 : i))
      else if (e.key === 'ArrowRight') onIndexChange((i) => (i < matches.length - 1 ? i + 1 : i))
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [matches.length, onClose, onIndexChange])

  if (!match) return null

  const goPrev = () => onIndexChange((i) => (i > 0 ? i - 1 : i))
  const goNext = () => onIndexChange((i) => (i < matches.length - 1 ? i + 1 : i))

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > SWIPE_THRESHOLD_PX) goPrev()
    else if (delta < -SWIPE_THRESHOLD_PX) goNext()
    touchStartX.current = null
  }

  return (
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
          <button className="lightbox-nav lightbox-nav-prev" type="button" onClick={goPrev} aria-label="Previous photo">
            <ChevronLeft size={28} />
          </button>
        )}

        {!imgLoaded && <div className="lightbox-spinner" />}
        <img
          key={match.photo_id}
          src={fileUrl(match.thumbnail_url || match.url)}
          alt={match.filename}
          className="lightbox-image"
          onLoad={() => setImgLoaded(true)}
          style={{ opacity: imgLoaded ? 1 : 0 }}
        />

        {index < matches.length - 1 && (
          <button className="lightbox-nav lightbox-nav-next" type="button" onClick={goNext} aria-label="Next photo">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
        <p className="lightbox-caption">
          Preview quality — {Math.round(match.similarity * 100)}% match. The downloaded/shared copy will be sharper.
        </p>
        <div className="row">
          <button
            className={match.liked_by_me ? 'like-btn liked' : 'like-btn'}
            type="button"
            onClick={() => onToggleLike(match)}
            aria-label={match.liked_by_me ? 'Unlike' : 'Like'}
          >
            <Heart size={14} fill={match.liked_by_me ? 'currentColor' : 'none'} />
            {match.like_count > 0 ? match.like_count : ''}
          </button>
          <button className="btn secondary" type="button" onClick={() => onShare(match)} disabled={sharingId === match.photo_id}>
            <Share2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {sharingId === match.photo_id ? 'Preparing…' : 'Share'}
          </button>
          <span className="hint">{index + 1} of {matches.length}</span>
        </div>

        <div className="lightbox-comments">
          {loadingComments ? (
            <p className="hint">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="hint">No comments yet — be the first!</p>
          ) : (
            <ul className="lightbox-comment-list">
              {comments.map((c) => (
                <li key={c.id}>
                  <strong>{c.guest_name}</strong> {c.text}
                </li>
              ))}
            </ul>
          )}
          <form className="row" onSubmit={handlePostComment} style={{ marginTop: 8 }}>
            <input
              className="text-input lightbox-name-input"
              type="text"
              placeholder="Your name (optional)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={60}
            />
            <input
              className="text-input"
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
            />
            <button className="btn" type="submit" disabled={postingComment || !commentText.trim()}>
              {postingComment ? 'Posting…' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
