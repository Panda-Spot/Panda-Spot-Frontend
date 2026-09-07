import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { createEvent, fileUrl, getMySubscription, listEvents } from '../api.js'
import { pop } from '../lib/confetti.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'

/* ── Shared chart theme (gold) ────────────────────────────── */
const GOLD = '#F59E0B'
const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

function ChartTooltip({ active, payload, label, suffix = '' }) {
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

/* ── Horizontal bars for top events ───────────────────────── */
function TopEventsBar({ data }) {
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
function eventsByMonth(events) {
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
  for (const ev of events) {
    const d = new Date(ev.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.count += 1
  }
  return buckets
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [subscription, setSubscription] = useState(null)

  const load = (status) => {
    setLoading(true)
    listEvents(status || 'active')
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  useEffect(() => {
    getMySubscription()
      .then((data) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createEvent(name.trim())
      setName('')
      pop()
      load(statusFilter)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const quotaUsed = Number(subscription?.photo_quota_used || 0)
  const quotaTotal = Number(subscription?.photo_quota_total || 0)
  const quotaFull = quotaTotal > 0 && quotaUsed >= quotaTotal
  const trialExhausted = subscription?.status === 'TRIAL' && quotaFull

  const monthly = eventsByMonth(events)
  const topEvents = [...events].sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0)).slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Events
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Create an event, then bulk-upload the photos so guests can find themselves by selfie.
        </p>
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mb-8">
        <GlassCard hover={false}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Events Created</h2>
          <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-tertiary)' }}>Last 6 months</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" events" />} />
              <Bar dataKey="count" name="events" radius={[4, 4, 0, 0]}>
                {monthly.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === monthly.length - 1 ? GOLD : `rgba(245,158,11,${0.28 + (i / (monthly.length - 1)) * 0.4})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard hover={false} className="xl:col-span-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Top Events by Photos</h2>
          <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-tertiary)' }}>Events with the most uploaded photos</p>
          <TopEventsBar data={topEvents} />
        </GlassCard>
      </div>

      <form className="card row" onSubmit={handleCreate}>
        <input
          className="text-input"
          placeholder="Event name (e.g. Smith Wedding 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {trialExhausted ? (
          <Link to="/billing">
            <GoldButton icon={<Lock size={14} />}>Upgrade Plan</GoldButton>
          </Link>
        ) : (
          <button className="btn" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Event'}
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div>
          <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MiniLoader size={22} /> Loading events…
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="event-card" />)}
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'active', label: 'Active' },
              { key: 'archived', label: 'Archived' },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === key ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {events.length === 0 ? (
            <p className="hint">
              {statusFilter === 'archived'
                ? 'No archived events — archiving hides an event from guests and clients without deleting anything.'
                : 'No events yet — create one above.'}
            </p>
          ) : (
            <ul className="event-list">
              {events.map((ev) => (
                <li key={ev.id} className="event-list-item">
                  <Link to={`/events/${ev.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {ev.cover_url ? (
                      <img
                        src={fileUrl(ev.cover_url)}
                        alt=""
                        style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                        draggable={false}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : null}
                    <span style={{ flex: 1 }}>
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
        </>
      )}

      {trialExhausted && (
        <GlassCard hover={false} className="mt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
              <Lock size={22} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Upload quota used up</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your trial uploads are finished. Upgrade your plan to keep creating events.</p>
            </div>
            <Link to="/billing">
              <GoldButton size="sm">Upgrade Plan</GoldButton>
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
