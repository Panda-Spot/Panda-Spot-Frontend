import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { Camera, CalendarDays, Heart, ImageIcon, Lock, Users } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { createEvent, getMySubscription, getStudioAnalyticsSummary, listEvents } from '../api.js'
import { useAuth } from '../auth.jsx'
import { greetingTime } from '../utils/formatters.js'
import StatCard from '../components/ui/StatCard.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Modal from '../components/ui/Modal.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'

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

/* ── One-time welcome popup for a brand-new free trial ─────── */
function TrialWelcomeModal({ subscription }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (subscription?.status !== 'TRIAL') return
    const seenKey = `pandaspot-trial-welcome-seen-${subscription.id}`
    try {
      if (localStorage.getItem(seenKey)) return
    } catch {
      return
    }
    setDismissed(false)
  }, [subscription])

  if (!subscription || subscription.status !== 'TRIAL') return null

  const close = () => {
    try {
      localStorage.setItem(`pandaspot-trial-welcome-seen-${subscription.id}`, '1')
    } catch {
      // storage unavailable — modal just shows again next visit
    }
    setDismissed(true)
  }

  const daysLeft = subscription.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at) - new Date()) / 86400000))
    : null

  return (
    <Modal open={!dismissed} onClose={close} title="Welcome to PandaSpot!" size="sm">
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        You&apos;re on a <strong style={{ color: 'var(--text-primary)' }}>free trial</strong> — upload up to{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{subscription.photo_quota_total} photos</strong>
        {daysLeft !== null && (
          <> for the next <strong style={{ color: 'var(--text-primary)' }}>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong></>
        )}. Create your first event to get started.
      </p>
      <GoldButton onClick={close} className="w-full justify-center">Let&apos;s go</GoldButton>
    </Modal>
  )
}

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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
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

export default function Dashboard() {
  const { user } = useAuth()
  const containerRef = useRef(null)
  const [events, setEvents] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [subscription, setSubscription] = useState(null)
  const [summary, setSummary] = useState(null)

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
    getStudioAnalyticsSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createEvent(name.trim())
      setName('')
      load(statusFilter)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-row > *', { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.5, delay: 0.1, ease: 'power3.out' })
      gsap.fromTo('.chart-section', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.55, delay: 0.4, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const totalPhotos = events.reduce((sum, ev) => sum + (ev.photo_count || 0), 0)
  const monthly = eventsByMonth(events)
  const topEvents = [...events].sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0)).slice(0, 5)

  // Studio-wide aggregates (all owned + collaborated events, not just the
  // current status filter) — drive the uploads chart, the status donut,
  // and the client/favourite stat cards.
  const shortMonth = (key) => {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
  }
  const mediaByMonth = (summary?.media_by_month || []).map((d) => ({ ...d, label: shortMonth(d.month) }))
  const donutData = [
    { name: 'Active', value: summary?.event_status?.active ?? 0 },
    { name: 'Archived', value: summary?.event_status?.archived ?? 0 },
  ]
  const DONUT_COLORS = [GOLD, '#3F3F46']

  const quotaUsed = Number(subscription?.photo_quota_used || 0)
  const quotaTotal = Number(subscription?.photo_quota_total || 0)
  const quotaFull = quotaTotal > 0 && quotaUsed >= quotaTotal
  const trialExhausted = subscription?.status === 'TRIAL' && quotaFull

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div ref={containerRef}>
      <TrialWelcomeModal subscription={subscription} />

      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {greetingTime()}, {user?.name || 'Studio'}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{today}</p>
      </div>

      {/* ── Stat Cards ─── */}
      <div className="stat-row grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Events" value={summary?.totals?.events ?? events.length} icon={CalendarDays} />
        <StatCard label="Photos" value={summary?.totals?.photos ?? totalPhotos} icon={ImageIcon} />
        <StatCard label="Clients" value={summary?.totals?.clients ?? 0} icon={Users} />
        <StatCard label="Favourites" value={summary?.totals?.favourites ?? 0} icon={Heart} />
      </div>

      {/* ── Uploads charts row ─── */}
      <div className="chart-section grid xl:grid-cols-3 gap-5 mb-8">
        <GlassCard hover={false} className="xl:col-span-2">
          <SectionHeader
            title="Media Uploads"
            subtitle="Photos uploaded over the last 6 months"
          />
          {!summary ? (
            <div className="h-52 skeleton rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mediaByMonth} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="mediaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" photos" />} />
                <Area
                  type="monotone" dataKey="count" name="uploads"
                  stroke={GOLD} strokeWidth={2}
                  fill="url(#mediaGrad)"
                  dot={{ fill: GOLD, strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: '#FDE68A', r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <SectionHeader title="Event Status" subtitle="Active vs archived" />
          {!summary ? (
            <div className="h-52 skeleton rounded-lg" />
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-full h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.filter((d) => d.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90} endAngle={-270}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#18181B',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 10,
                        color: '#F5F5F7',
                        fontSize: 12,
                      }}
                      itemStyle={{ color: GOLD }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
                  <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                    {(summary?.event_status?.active ?? 0) + (summary?.event_status?.archived ?? 0)}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>events</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Uploads Used ─── */}
      <div className="chart-section mb-6">
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <ImageIcon size={14} className="text-gold-500" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Uploads Used</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Photos uploaded against your plan quota</p>
            </div>
          </div>
          {subscription ? (
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Quota used</p>
                <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {quotaUsed} <span className="text-base font-medium" style={{ color: 'var(--text-tertiary)' }}>/ {quotaTotal}</span>
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Remaining</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {Math.max(0, quotaTotal - quotaUsed)} uploads
                  </p>
                </div>
                <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Plan</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {subscription.plan_name || '—'} ({subscription.status})
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No subscription yet — start a free trial from the <Link to="/billing">Billing</Link> page to unlock quota-tracked uploads.
            </p>
          )}
        </GlassCard>
      </div>

      {/* ── Charts row ─── */}
      <div className="chart-section grid xl:grid-cols-3 gap-5 mb-8">
        <GlassCard hover={false}>
          <SectionHeader title="Events Created" subtitle="Last 6 months" />
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
          <SectionHeader title="Top Events by Photos" subtitle="Events with the most uploaded photos" />
          <TopEventsBar data={topEvents} />
        </GlassCard>
      </div>

      {/* ── Events ─── */}
      <div className="chart-section">
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
          </>
        )}
      </div>

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

      <div className="mt-6 flex gap-3 flex-wrap">
        <Link to="/clients">
          <GoldButton variant="outline">Manage clients</GoldButton>
        </Link>
        <Link to="/access">
          <GoldButton variant="outline">Open Access Board</GoldButton>
        </Link>
        <Link to="/billing/documents">
          <GoldButton variant="ghost">Invoicing →</GoldButton>
        </Link>
      </div>
    </div>
  )
}
