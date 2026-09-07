import { Link } from 'react-router-dom'

/* ── Shared chart theme (gold) ────────────────────────────── */
export const GOLD = '#F59E0B'
export const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

export function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#18181B',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 10,
      color: '#F5F5F7',
      fontSize: 12,
      padding: '8px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <p style={{ color: '#A0A0AB', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || GOLD, fontWeight: 600 }}>
          {p.value}{suffix} <span style={{ color: '#A0A0AB', fontWeight: 400 }}>{p.name}</span>
        </p>
      ))}
    </div>
  )
}

/* ── Horizontal bars for top events ───────────────────────── */
export function TopEventsBar({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-24">
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No photos uploaded yet</p>
    </div>
  )
  const max = Math.max(...data.map((d) => d.photo_count), 1)
  return (
    <div className="space-y-3 mt-2">
      {data.map((ev, i) => (
        <Link key={ev.id} to={`/events/${ev.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs truncate max-w-[60%]" style={{ color: 'var(--text-primary)' }}>
              {ev.name}
            </span>
            <span className="text-xs font-mono" style={{ color: GOLD }}>{ev.photo_count}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(ev.photo_count / max) * 100}%`,
                background: i === 0
                  ? `linear-gradient(90deg, ${GOLD}, #FDE68A)`
                  : `linear-gradient(90deg, ${GOLD}88, ${GOLD}44)`,
              }}
            />
          </div>
        </Link>
      ))}
    </div>
  )
}

// Last-6-months buckets (oldest → newest) from event createdAt timestamps.
export function eventsByMonth(events) {
  const buckets = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('default', { month: 'short' }),
      count: 0,
    })
  }
  for (const ev of events || []) {
    const d = new Date(ev.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.count += 1
  }
  return buckets
}
