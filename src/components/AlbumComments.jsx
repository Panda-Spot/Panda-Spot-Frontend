import { useState } from 'react'
import { Check, MessageSquare, Pin, Reply } from 'lucide-react'

// Threaded album feedback (Phase 23) — shared by studio + client. Pins
// (numbered, page-attributed) and general notes render newest-last; replies
// thread one level deep; resolution is studio-side via canResolve.
export default function AlbumComments({
  comments = [],
  pageNumberOf = null,
  locked = false,
  canResolve = false,
  onResolve = null,
  pendingPin = null,
  onCancelPin = null,
  onPostPin = null,
  onPostReply = null,
  onPostNote = null,
  selectedPinId = null,
  onSelectPin = null,
  busy = false,
}) {
  const [replyOpen, setReplyOpen] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [pinText, setPinText] = useState('')

  const ordered = [...(comments || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const submitReply = async (parentId) => {
    if (!replyText.trim() || !onPostReply) return
    await onPostReply(parentId, replyText.trim())
    setReplyText('')
    setReplyOpen(null)
  }

  const renderComment = (c, isReply) => (
    <div
      key={c.id}
      className="card"
      style={{
        padding: '8px 10px',
        marginBottom: 8,
        marginLeft: isReply ? 20 : 0,
        borderColor: selectedPinId === c.id ? 'var(--gold, #d4af37)' : undefined,
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.pin_number != null ? (
            <button
              type="button"
              title="Jump to pin on spread"
              onClick={() => onSelectPin?.(c)}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c.resolved_at ? 'rgba(52,211,153,0.9)' : 'rgba(245,158,11,0.92)',
                color: '#111113', fontSize: 11, fontWeight: 800,
              }}
            >
              {c.pin_number}
            </button>
          ) : (
            <MessageSquare size={13} style={{ color: 'var(--text-tertiary)' }} />
          )}
          {c.author?.name || 'Studio'}
          {c.resolved_at && (
            <span className="hint" style={{ color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Check size={11} /> resolved
            </span>
          )}
        </span>
        <span className="hint">
          {c.page_id && pageNumberOf ? `p.${pageNumberOf(c.page_id)} · ` : ''}
          {new Date(c.created_at).toLocaleString()}
        </span>
      </div>
      <p style={{ fontSize: 13, margin: '6px 0', whiteSpace: 'pre-wrap' }}>{c.message}</p>
      {!isReply && (
        <div className="row" style={{ gap: 8 }}>
          {!locked && (
            <button
              type="button"
              className="btn secondary"
              style={{ padding: '2px 8px', fontSize: 12 }}
              onClick={() => { setReplyOpen(replyOpen === c.id ? null : c.id); setReplyText('') }}
            >
              <Reply size={12} /> Reply
            </button>
          )}
          {canResolve && !c.resolved_at && (
            <button
              type="button"
              className="btn secondary"
              style={{ padding: '2px 8px', fontSize: 12 }}
              disabled={busy}
              onClick={() => onResolve?.(c.id)}
            >
              <Check size={12} /> Resolve
            </button>
          )}
        </div>
      )}
      {!isReply && replyOpen === c.id && !locked && (
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <input
            className="text-input"
            style={{ flex: 1 }}
            placeholder="Write a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitReply(c.id) }}
          />
          <button type="button" className="btn" disabled={busy || !replyText.trim()} onClick={() => submitReply(c.id)}>
            Send
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {pendingPin && !locked && (
        <div className="card" style={{ borderColor: 'var(--gold, #d4af37)', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pin size={13} /> New pin at {pendingPin.xPct}%, {pendingPin.yPct}%
            {pendingPin.pageId && pageNumberOf ? ` (page ${pageNumberOf(pendingPin.pageId)})` : ''}
          </p>
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <input
              className="text-input"
              style={{ flex: 1 }}
              placeholder="What should change here?"
              value={pinText}
              onChange={(e) => setPinText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && pinText.trim()) { onPostPin?.(pinText.trim()); setPinText('') } }}
            />
            <button
              type="button"
              className="btn"
              disabled={busy || !pinText.trim()}
              onClick={() => { onPostPin?.(pinText.trim()); setPinText('') }}
            >
              Post pin
            </button>
            <button type="button" className="btn secondary" onClick={() => { setPinText(''); onCancelPin?.() }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {ordered.length === 0 && !pendingPin && (
        <p className="hint">No feedback yet — pins dropped on a spread and general notes appear here.</p>
      )}
      {ordered.map((c) => (
        <div key={c.id}>
          {renderComment(c, false)}
          {(c.replies || []).map((r) => renderComment(r, true))}
        </div>
      ))}

      {!locked && onPostNote && (
        <div className="row" style={{ marginTop: 6, gap: 6 }}>
          <input
            className="text-input"
            style={{ flex: 1 }}
            placeholder="Add a general note on this version…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && noteText.trim()) { onPostNote(noteText.trim()); setNoteText('') } }}
          />
          <button
            type="button"
            className="btn secondary"
            disabled={busy || !noteText.trim()}
            onClick={() => { onPostNote(noteText.trim()); setNoteText('') }}
          >
            Add note
          </button>
        </div>
      )}
      {locked && (
        <p className="hint" style={{ color: '#34D399' }}>Approved and locked — feedback is read-only.</p>
      )}
    </div>
  )
}
