import { useEffect, useState } from 'react'
import { Users, Calendar, Image, HardDrive, Search } from 'lucide-react'
import { getAdminOverview } from '../api.js'
import StatTile from '../components/StatTile.jsx'
import TrendChart from '../components/TrendChart.jsx'

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
          <StatTile icon={Users} value={data.total_users} label="users" />
          <StatTile icon={Calendar} value={data.total_events} label="events" />
          <StatTile icon={Image} value={data.total_photos} label="photos" />
          <StatTile icon={HardDrive} value={`${(data.total_storage_bytes / 1e9).toFixed(1)}GB`} label="storage used" />
          <StatTile icon={Search} value={data.total_searches} label="searches" />
        </div>
      </div>

      <div className="card analytics-card">
        <div className="guest-link-label">Signups (last 30 days)</div>
        <TrendChart series={[{ key: 'daily_signups', name: 'Signups', data: data.daily_signups }]} />
      </div>

      <div className="card analytics-card">
        <div className="guest-link-label">Events created (last 30 days)</div>
        <TrendChart series={[{ key: 'daily_events', name: 'Events created', data: data.daily_events }]} />
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
