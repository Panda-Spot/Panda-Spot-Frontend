import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, Image, HardDrive, Search } from 'lucide-react'
import { driveBackupConnectUrl, getAdminOverview } from '../api.js'
import { useAuth } from '../auth.jsx'
import StatTile from '../components/StatTile.jsx'
import TrendChart from '../components/TrendChart.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'

export default function Admin() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    getAdminOverview().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="hint">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <LayoutDashboard size={22} className="text-gold-500" /> Platform overview
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Every studio, event, photo, and search on the platform.
        </p>
      </div>

      {user?.is_admin && (
        <GlassCard hover={false}>
          <h2 className="section-title" style={{ fontSize: 18, marginTop: 0 }}>Drive backup <span className="hint">(advanced, beta — platform setup)</span></h2>
          <p className="subtle">
            One Google account, shared across every event that turns on Drive backup — not something each
            photographer connects individually. Shoots captures get mirrored into an event's Drive folder using this
            one account (works because the folder is shared as "Anyone with the link — Editor"). Since uploads count
            against this single account's own Drive quota, they're only kept there for 2 days before being reclaimed
            back to the server (into a separate shoots/ subfolder, kept apart from directly-uploaded photos), and 7
            days total before permanent deletion — photographers are notified to make their own copy well before
            then.
          </p>
          {user.drive_backup_configured && <p className="hint">Connected — GOOGLE_DRIVE_BACKUP_REFRESH_TOKEN is set on the server.</p>}
          <a href={driveBackupConnectUrl()} style={{ textDecoration: 'none' }}>
            <GoldButton variant="outline">
              {user.drive_backup_configured ? 'Reconnect a different account' : 'Connect Google Drive'}
            </GoldButton>
          </a>
          <p className="hint">
            The callback page shows a fresh refresh token to copy into the server's .env, then restart the server for
            it to take effect.
          </p>
        </GlassCard>
      )}
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
              <span>
                <Link to={`/admin/events/${e.id}`}>{e.name}</Link>{' '}
                <span className="hint">({e.owner_email})</span>
              </span>
              <span className="hint">{e.photo_count} photos</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
