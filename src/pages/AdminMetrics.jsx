import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, MessageSquare, Search, Target, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { getAdminMetrics } from '../api.js'
import StatTile from '../components/StatTile.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'

const GOLD = '#F59E0B'
const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

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

  const { guest_engagement: eng, feature_adoption: adoption, top_clients: topClients, drive_backup_quota: quota, storage_by_event: storageByEvent } = data

  const storageChart = (storageByEvent || []).map((e) => ({
    ...e,
    label: e.event_name.length > 14 ? `${e.event_name.slice(0, 13)}…` : e.event_name,
    gb: Math.round((e.storage_used_bytes / 1e9) * 10) / 10,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={22} className="text-gold-500" /> Metrics
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Platform-wide engagement, feature adoption, storage, and usage.
        </p>
      </div>

      <h2 className="section-title">Guest engagement</h2>
      <div className="card analytics-card">
        <div className="stat-grid">
          <StatTile icon={Users} value={eng.unique_guests} label="unique guests" />
          <StatTile icon={Search} value={eng.total_searches} label="total searches" />
          <StatTile icon={Target} value={formatPct(eng.match_rate)} label="searches with a match" />
          <StatTile icon={MessageSquare} value={formatPct(eng.feedback_rate)} label='"not me" feedback rate' />
        </div>
      </div>

      <h2 className="section-title">Storage by event</h2>
      <GlassCard hover={false}>
        {storageChart.length === 0 ? (
          <p className="hint">No stored photos yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={storageChart} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval={0} angle={-18} textAnchor="end" height={52} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181B', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, color: '#F5F5F7', fontSize: 12 }}
                itemStyle={{ color: GOLD }}
                formatter={(v, name, props) => [`${v} GB · ${props.payload.photo_count} photos · ${props.payload.owner_email}`, 'stored']}
              />
              <Bar dataKey="gb" name="stored" radius={[4, 4, 0, 0]}>
                {storageChart.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? GOLD : `rgba(245,158,11,${0.85 - (i / storageChart.length) * 0.5})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

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
