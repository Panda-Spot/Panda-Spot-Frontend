import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, Target, MessageSquare } from 'lucide-react'
import { getAdminMetrics } from '../api.js'
import StatTile from '../components/StatTile.jsx'

function formatBytes(bytes) {
  if (bytes == null) return '—'
  return `${(bytes / 1e9).toFixed(1)}GB`
}
function formatPct(fraction) {
  return `${Math.round(fraction * 100)}%`
}

const ADOPTION_LABELS = {
  drive_import_connected: 'Drive import connected',
  drive_sync_enabled: 'Drive auto-sync on',
  shoots_connected: 'PandaShoots connected',
  drive_backup_enabled: 'Drive backup on',
  active_guest_alert_subscriptions: 'Active guest alert subscriptions',
}

export default function AdminMetrics() {
  const [sort, setSort] = useState('storage')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getAdminMetrics(sort).then(setData).catch((e) => setError(e.message))
  }, [sort])

  useEffect(load, [load])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="hint">Loading…</p>

  const { guest_engagement: eng, feature_adoption: adoption, top_clients: topClients, drive_backup_quota: quota } = data

  return (
    <div>
      <h1 className="section-title">Metrics</h1>
      <p className="subtle">Platform-wide engagement, feature adoption, and usage — the full picture behind the overview stats.</p>

      <h2 className="section-title">Guest engagement</h2>
      <div className="card analytics-card">
        <div className="stat-grid">
          <StatTile icon={Users} value={eng.unique_guests} label="unique guests" />
          <StatTile icon={Search} value={eng.total_searches} label="total searches" />
          <StatTile icon={Target} value={formatPct(eng.match_rate)} label="searches with a match" />
          <StatTile icon={MessageSquare} value={formatPct(eng.feedback_rate)} label='"not me" feedback rate' />
        </div>
      </div>

      <h2 className="section-title">Feature adoption</h2>
      <div className="data-table-wrap">
        <table className="data-table">
          <tbody>
            {Object.entries(ADOPTION_LABELS).map(([key, label]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{adoption[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Platform Drive-backup quota</h2>
      <div className="card">
        {!quota.configured ? (
          <p className="hint">Drive backup isn't set up on this instance yet — see the Clients page's platform setup card.</p>
        ) : quota.error ? (
          <p className="error">Couldn't check quota: {quota.error}</p>
        ) : (
          <p className="hint">
            {formatBytes(quota.used_bytes)} used{quota.total_bytes != null ? ` of ${formatBytes(quota.total_bytes)}` : ' (no cap on this account)'}
          </p>
        )}
      </div>

      <div className="data-table-toolbar" style={{ marginTop: 28 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Top clients</h2>
        <select className="text-input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="storage">By storage used</option>
          <option value="events">By event count</option>
          <option value="photos">By photo count</option>
        </select>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Events</th>
              <th>Photos</th>
              <th>Storage</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {topClients.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.event_count}</td>
                <td>{u.photo_count}</td>
                <td>{formatBytes(u.storage_used_bytes)}</td>
                <td><Link className="btn secondary" to={`/admin/clients/${u.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
