import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClientEvents } from '../api.js'

// MERGE (Studio-Verse Photo Selection): a USER-role client's landing page
// — every event a studio has granted them access to (see EventUserMapping).
export default function ClientEvents() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listClientEvents().then(setEvents).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!events) return <p className="hint">Loading…</p>

  return (
    <div>
      <h1 className="section-title">Your photos</h1>
      {events.length === 0 && <p className="hint">No events shared with you yet.</p>}
      <ul className="team-list">
        {events.map((e) => (
          <li key={e.event_id} className="team-list-item">
            <Link to={`/client/${e.event_id}`}>{e.event_name}</Link>
            <span className="hint">
              {e.submitted_at ? 'Submitted' : e.favourite_cap ? `Up to ${e.favourite_cap} favourites` : 'No favourite limit'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
