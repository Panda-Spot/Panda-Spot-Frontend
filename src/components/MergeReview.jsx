import React, { useEffect, useState } from 'react'
import { dismissMergeSuggestion, fileUrl, getMergeSuggestions, setFacePersonName } from '../api.js'
import { useToast } from '../toast.jsx'

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

// Same/different-person review queue (Google Photos concept): lookalike
// groups the auto-clustering kept apart, confirmed by a human. "Same"
// names every face in both groups with the dominant name (named side
// wins, else the bigger side) so they display as one person; "Different"
// dismisses the pair for good.
export default function MergeReview({ eventId, onChanged }) {
  const { showToast } = useToast()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState(null)

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
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[s.id]
        return next
      })
      await load()
      onChanged?.()
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
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="guest-link-label">Possible duplicates ({suggestions.length}) — same person?</div>
      <p className="hint" style={{ marginTop: 0 }}>
        These lookalikes scored just below auto-merge. Confirm to merge them under one name, or mark different.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s) => {
          const a = s.group_a
          const b = s.group_b
          const working = busy === s.id
          return (
            <div
              key={s.id}
              style={{
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
              }}
            >
              <Circle rep={a.representative} eventId={eventId} />
              <Circle rep={b.representative} eventId={eventId} />
              <div style={{ minWidth: 0, flex: '1 1 140px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {displayName(a, 'Unnamed')} <span className="hint">({a.photo_ids.length})</span>
                  {' vs '}
                  {displayName(b, 'Unnamed')} <span className="hint">({b.photo_ids.length})</span>
                </div>
                <div className="hint" style={{ fontSize: 12 }}>{Math.round(s.similarity * 100)}% similar</div>
              </div>
              <input
                className="text-input"
                value={drafts[s.id] ?? dominant(s)}
                maxLength={60}
                placeholder="Merge as…"
                disabled={working}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                style={{ fontSize: 13, padding: '7px 10px', maxWidth: 170 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn secondary" type="button" disabled={working} onClick={() => handleSame(s)} style={{ fontSize: 12, padding: '7px 12px' }}>
                  {working ? '…' : 'Same person'}
                </button>
                <button className="btn secondary" type="button" disabled={working} onClick={() => handleDifferent(s)} style={{ fontSize: 12, padding: '7px 12px' }}>
                  Different
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
