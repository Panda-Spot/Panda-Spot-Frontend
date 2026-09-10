import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { dismissMergeSuggestion, fileUrl, getMergeSuggestions, setFacePersonName } from '../api.js'
import { useToast } from '../toast.jsx'
import Modal from './Modal.jsx'

function Circle({ rep, eventId, size = 68 }) {
  const src = rep?.thumbnail_url ? fileUrl(rep.thumbnail_url) : null
  if (!src) {
    return (
      <span
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-elevated)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', fontWeight: 800,
        }}
      >
        ?
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

function displayName(g, fallback) {
  return g.person_name || fallback
}

// Fraction-positioned bbox overlay for a representative full photo
// (same math as the face viewer boxes).
function FaceBox({ rep }) {
  if (!Array.isArray(rep?.bbox) || rep.bbox.length < 4 || !rep.width || !rep.height) return null
  const [x1, y1, x2, y2] = rep.bbox.map(Number)
  const style = {
    position: 'absolute',
    left: `${(x1 / rep.width) * 100}%`,
    top: `${(y1 / rep.height) * 100}%`,
    width: `${Math.max(0, (x2 - x1) / rep.width) * 100}%`,
    height: `${Math.max(0, (y2 - y1) / rep.height) * 100}%`,
    border: '2px solid #4ADE80',
    borderRadius: 6,
    boxShadow: '0 0 12px rgba(74,222,128,0.8), 0 0 0 1px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
  }
  return <div style={style} />
}

function FullPhoto({ rep, eventId, name }) {
  const src = fileUrl(`/files/events/${eventId}/photos/${rep.photo_id}/thumb`)
  return (
    <div style={{ minWidth: 0, flex: '1 1 0' }}>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
        <img
          src={src}
          alt={name}
          draggable={false}
          style={{ width: '100%', display: 'block', maxHeight: '46vh', objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <FaceBox rep={rep} />
      </div>
      <p className="hint" style={{ margin: '6px 0 0', textAlign: 'center' }}>{name}</p>
    </div>
  )
}

// Same/different-person decision wizard (Google Photos concept):
// hero entry → pairs grid → fullscreen judge with auto-advance.
// "Same" names every face in both groups with the dominant name (named
// side wins, else the bigger side) so they display as one person;
// "Different" dismisses the pair for good.
export default function MergeReview({ eventId, onChanged }) {
  const { showToast } = useToast()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState(null)
  const [gridOpen, setGridOpen] = useState(false)
  const [judgeIndex, setJudgeIndex] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await getMergeSuggestions(eventId)
      setSuggestions(r.suggestions || [])
    } catch (e) {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (judgeIndex == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setJudgeIndex(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [judgeIndex])

  if (loading || suggestions.length === 0) return null

  const dominant = (s) => {
    const a = s.group_a
    const b = s.group_b
    if (a.person_name && !b.person_name) return a.person_name
    if (b.person_name && !a.person_name) return b.person_name
    if (a.person_name && b.person_name) {
      return (a.photo_ids.length >= b.photo_ids.length ? a : b).person_name
    }
    return ''
  }

  // After a decision the queue shrinks — point at the next pair, or
  // finish (close judge + grid, refresh circles) when none remain.
  const advance = (removedId, remaining) => {
    const next = remaining.filter((x) => x.id !== removedId)
    setSuggestions(next)
    if (next.length === 0) {
      setJudgeIndex(null)
      setGridOpen(false)
      onChanged?.()
    } else {
      setJudgeIndex((prev) => (prev == null ? null : Math.min(prev, next.length - 1)))
      onChanged?.()
    }
    setDrafts((prev) => {
      const copy = { ...prev }
      delete copy[removedId]
      return copy
    })
  }

  const handleSame = async (s) => {
    const name = (drafts[s.id] ?? dominant(s)).trim()
    if (!name) {
      showToast('Give this person a name to merge them.', { type: 'error' })
      return
    }
    setBusy(s.id)
    try {
      const ids = [...(s.group_a.face_ids || []), ...(s.group_b.face_ids || [])]
      await setFacePersonName(eventId, ids, name)
      showToast(`Merged as “${name}”.`)
      advance(s.id, suggestions)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const handleDifferent = async (s) => {
    const faceA = s.group_a?.representative?.face_id
    const faceB = s.group_b?.representative?.face_id
    if (!faceA || !faceB) return
    setBusy(s.id)
    try {
      await dismissMergeSuggestion(eventId, faceA, faceB)
      advance(s.id, suggestions)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const judging = judgeIndex != null ? suggestions[judgeIndex] : null
  const preview = suggestions.slice(0, 3)

  return (
    <div>
      {/* Hero entry row — invites the decision, like the upload card. */}
      <div className="merge-hero" onClick={() => { setGridOpen(true); setJudgeIndex(null) }} title="Review similar faces">
        <div className="merge-hero-faces">
          {preview.map((s) => (
            <span key={s.id} className="merge-hero-pair">
              <Circle rep={s.group_a.representative} eventId={eventId} size={44} />
              <Circle rep={s.group_b.representative} eventId={eventId} size={44} />
            </span>
          ))}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>Review similar faces</p>
          <p className="hint" style={{ margin: '2px 0 0' }}>
            {suggestions.length} possible duplicate{suggestions.length === 1 ? '' : 's'} — same person or not? You decide.
          </p>
        </div>
        <span className="merge-count-ribbon">{suggestions.length}</span>
      </div>

      {/* Pairs grid modal (Venn-style overlapping circles). */}
      <Modal open={gridOpen} onClose={() => setGridOpen(false)} title={`Possible duplicates (${suggestions.length})`}>
        <div className="merge-grid">
          {suggestions.map((s, i) => (
            <div key={s.id} className="merge-pair-card" onClick={() => setJudgeIndex(i)} title="Judge this pair">
              <div className="merge-venn">
                <Circle rep={s.group_a.representative} eventId={eventId} size={64} />
                <Circle rep={s.group_b.representative} eventId={eventId} size={64} />
              </div>
              <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                {displayName(s.group_a, 'Unnamed')} <span className="hint">({s.group_a.photo_ids.length})</span>
                {' vs '}
                {displayName(s.group_b, 'Unnamed')} <span className="hint">({s.group_b.photo_ids.length})</span>
              </p>
              <p className="hint" style={{ margin: '2px 0 0', fontSize: 12 }}>{Math.round(s.similarity * 100)}% similar — tap to decide</p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Fullscreen judge popup with auto-advance. */}
      {judging && createPortal(
        <div className="merge-judge-backdrop" onClick={() => setJudgeIndex(null)}>
          <div className="merge-judge-panel" onClick={(e) => e.stopPropagation()}>
            <div className="merge-judge-head">
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0 }}>
                  {displayName(judging.group_a, 'Unnamed')} vs {displayName(judging.group_b, 'Unnamed')}
                </h3>
                <p className="hint" style={{ margin: '2px 0 0' }}>
                  {Math.round(judging.similarity * 100)}% similar · {judgeIndex + 1} of {suggestions.length}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setJudgeIndex(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="merge-judge-mains">
              <div style={{ textAlign: 'center' }}>
                <Circle rep={judging.group_a.representative} eventId={eventId} size={110} />
                <p style={{ margin: '6px 0 0', fontWeight: 700 }}>
                  {displayName(judging.group_a, 'Unnamed')} <span className="hint">({judging.group_a.photo_ids.length} photos)</span>
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Circle rep={judging.group_b.representative} eventId={eventId} size={110} />
                <p style={{ margin: '6px 0 0', fontWeight: 700 }}>
                  {displayName(judging.group_b, 'Unnamed')} <span className="hint">({judging.group_b.photo_ids.length} photos)</span>
                </p>
              </div>
            </div>
            <div className="merge-judge-photos">
              <FullPhoto rep={judging.group_a.representative} eventId={eventId} name={displayName(judging.group_a, 'Person A')} />
              <FullPhoto rep={judging.group_b.representative} eventId={eventId} name={displayName(judging.group_b, 'Person B')} />
            </div>
            <div className="merge-judge-actions">
              <input
                className="text-input"
                value={drafts[judging.id] ?? dominant(judging)}
                maxLength={60}
                placeholder="Merge as…"
                disabled={busy === judging.id}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [judging.id]: e.target.value }))}
              />
              <button className="btn" type="button" disabled={busy === judging.id} onClick={() => handleSame(judging)}>
                {busy === judging.id ? '…' : 'Same person'}
              </button>
              <button className="btn secondary" type="button" disabled={busy === judging.id} onClick={() => handleDifferent(judging)}>
                Different
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
