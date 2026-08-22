import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createEvent, listEvents } from '../api.js'

function guestLink(slug) {
  return `${window.location.origin}/e/${slug}`
}

function CopyLinkButton({ slug }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(guestLink(slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — ignore
    }
  }

  return (
    <button className="btn secondary copy-btn" type="button" onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy guest link'}
    </button>
  )
}

export default function Dashboard() {
  const [events, setEvents] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    listEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createEvent(name.trim())
      setName('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="hero-banner">
        <h1>Your events</h1>
        <p>Create an event, then bulk-upload the photos so guests can find themselves by selfie.</p>
      </div>

      <form className="card row" onSubmit={handleCreate}>
        <input
          className="text-input"
          placeholder="Event name (e.g. Smith Wedding 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create Event'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="hint">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="hint">No events yet — create one above.</p>
      ) : (
        <ul className="event-list">
          {events.map((ev) => (
            <li key={ev.id} className="event-list-item">
              <Link to={`/events/${ev.id}`}>
                <span>
                  {ev.name}
                  <span className="role-badge">{ev.role === 'owner' ? 'Owner' : 'Collaborator'}</span>
                </span>
                <span className="count">{ev.photo_count} photo{ev.photo_count === 1 ? '' : 's'}</span>
              </Link>
              <div className="event-list-footer">
                <span className="hint guest-link-text">{guestLink(ev.guestSlug)}</span>
                <CopyLinkButton slug={ev.guestSlug} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
