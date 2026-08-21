import { useEffect, useState } from 'react'
import { getAdminOverview } from '../api.js'

export default function Admin() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminOverview().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="hint">Loading…</p>

  return (
    <div>
      <h1 className="section-title">Platform overview</h1>
      <div className="card analytics-card">
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{data.total_users}</div>
            <div className="stat-label">users</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{data.total_events}</div>
            <div className="stat-label">events</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{data.total_photos}</div>
            <div className="stat-label">photos</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{(data.total_storage_bytes / 1e9).toFixed(1)}GB</div>
            <div className="stat-label">storage used</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{data.total_searches}</div>
            <div className="stat-label">searches</div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Recent events</h2>
      <ul className="event-list">
        {data.recent_events.map((e) => (
          <li key={e.id} className="event-list-item">
            <div className="event-list-footer">
              <span>{e.name} <span className="hint">({e.owner_email})</span></span>
              <span className="hint">{e.photo_count} photos</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
