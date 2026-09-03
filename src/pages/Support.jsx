import { useEffect, useState } from 'react'
import { createSupportTicket, listClientEvents, listSupportTickets, replySupportTicket, setSupportTicketStatus } from '../api.js'
import { useAuth } from '../auth.jsx'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

// MERGE (Studio-Verse Support Tickets): one page for requesters, studio
// admins handling client tickets, and SUPER_ADMIN handling every ticket.
export default function Support() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isClient = user?.role === 'USER'
  const [tickets, setTickets] = useState(null)
  const [clientEvents, setClientEvents] = useState([])
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [eventId, setEventId] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [busy, setBusy] = useState(false)

  const load = () => {
    listSupportTickets().then(setTickets).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  useEffect(() => {
    if (!isClient) return
    listClientEvents()
      .then((events) => {
        setClientEvents(events)
        if (events.length === 1) setEventId(events[0].event_id)
      })
      .catch((e) => setError(e.message))
  }, [isClient])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!subject.trim()) return
    setBusy(true)
    setError('')
    try {
      await createSupportTicket(subject.trim(), message.trim() || undefined, isClient ? eventId : undefined)
      setSubject('')
      setMessage('')
      if (clientEvents.length !== 1) setEventId('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleReply = async (ticketId) => {
    const text = (replyDrafts[ticketId] || '').trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      await replySupportTicket(ticketId, text)
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }))
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleStatus = async (ticketId, status) => {
    setBusy(true)
    setError('')
    try {
      await setSupportTicketStatus(ticketId, status)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !tickets) return <p className="error">{error}</p>
  if (!tickets) return <p className="hint">Loading…</p>

  return (
    <div>
      <h1 className="section-title">Support</h1>
      {error && <p className="error">{error}</p>}

      {!isSuperAdmin && (
        <div className="card billing-card">
          <div className="guest-link-label">Raise a new ticket</div>
          <form onSubmit={handleCreate}>
            {isClient && (
              <select className="text-input" value={eventId} onChange={(e) => setEventId(e.target.value)} required>
                <option value="">Choose event</option>
                {clientEvents.map((event) => (
                  <option key={event.event_id} value={event.event_id}>{event.event_name}</option>
                ))}
              </select>
            )}
            <input className="text-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className="text-input" style={{ marginTop: 8, minHeight: 80 }} placeholder="Describe your issue (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="btn" type="submit" disabled={busy || !subject.trim() || (isClient && !eventId)} style={{ marginTop: 8 }}>Submit</button>
          </form>
        </div>
      )}

      {tickets.length === 0 && <p className="hint">No tickets yet.</p>}

      {tickets.map((t) => (
        <div className="card billing-card" key={t.id}>
          <div className="guest-link-label">
            {t.subject} <span className="hint">({t.status}{t.event ? ` — ${t.event.name}` : ''}{isSuperAdmin && t.tenant ? ` — ${t.tenant.email}` : ''})</span>
          </div>
          <ul className="team-list">
            {t.replies.map((r) => (
              <li key={r.id} className="team-list-item" style={{ alignItems: 'flex-start' }}>
                <span>
                  <strong>{r.author.name}</strong> <span className="hint">({r.author.role})</span>
                  <br />
                  {r.message}
                </span>
                <span className="hint">{new Date(r.created_at).toLocaleString()}</span>
              </li>
            ))}
            {t.replies.length === 0 && <li className="hint">No replies yet.</li>}
          </ul>

          {t.status !== 'CLOSED' && (
            <form className="row" onSubmit={(e) => { e.preventDefault(); handleReply(t.id) }} style={{ marginTop: 8 }}>
              <input
                className="text-input"
                placeholder="Reply…"
                value={replyDrafts[t.id] || ''}
                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
              />
              <button className="btn secondary" type="submit" disabled={busy}>Reply</button>
            </form>
          )}

          <div className="row" style={{ marginTop: 8 }}>
            {STATUS_OPTIONS.filter((s) => isSuperAdmin || ['OPEN', 'RESOLVED'].includes(s)).map((s) => (
              <button key={s} className="btn secondary" type="button" disabled={busy || t.status === s} onClick={() => handleStatus(t.id, s)}>
                Mark {s.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
