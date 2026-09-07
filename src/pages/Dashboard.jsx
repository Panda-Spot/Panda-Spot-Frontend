import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { CalendarDays, Heart, ImageIcon, Users, ScanFace, Zap, BookOpen, Receipt, QrCode, Tv, Gift, ChevronDown } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { getMySubscription, getStudioAnalyticsSummary, listEvents } from '../api.js'
import { celebrate } from '../lib/confetti.js'
import { IMPROVE_OPTIONS, WAY_OPTIONS, loadSignupGoals, saveSignupGoals } from '../lib/signupGoals.js'
import { ChartTooltip, TopEventsBar, axisProps, eventsByMonth, GOLD } from '../components/EventCharts.jsx'
import { useAuth } from '../auth.jsx'
import { greetingTime } from '../utils/formatters.js'
import StatCard from '../components/ui/StatCard.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Modal from '../components/ui/Modal.jsx'

/* ── One-time welcome popup for a brand-new free trial ─────── */
const TRIAL_PERKS = [
  { icon: ScanFace, title: 'AI face search', text: 'Guests take a selfie and instantly find every photo they appear in — no sorting by you.' },
  { icon: Heart, title: 'Photo selection', text: 'Clients favourite their picks and submit — you get a clean final list, not chats.' },
  { icon: Zap, title: 'Live shoot uploads', text: 'Camera-to-cloud FTP lands photos in the gallery while you keep shooting.' },
  { icon: BookOpen, title: 'Album proofing', text: 'Share flipbook versions, collect pinned comments, get approvals locked.' },
  { icon: QrCode, title: 'QR cards + TV wall', text: 'Printable guest QR plus a live venue slideshow that updates itself.' },
  { icon: Receipt, title: 'Studio billing', text: 'Quotations, bills, receipts, packages and bookings in one place.' },
]

function TrialWelcomeModal({ subscription }) {
  const [dismissed, setDismissed] = useState(true)
  const [expanded, setExpanded] = useState(false)
  // Google signups skip the Register form, so they never answer the goal
  // questions — ask here instead, with a Skip that jumps to the perks.
  const [goalsStep, setGoalsStep] = useState(false)
  const [improve, setImprove] = useState('')
  const [ways, setWays] = useState([])

  useEffect(() => {
    if (subscription?.status !== 'TRIAL') return
    const seenKey = `pandaspot-trial-welcome-seen-${subscription.id}`
    try {
      if (localStorage.getItem(seenKey)) return
    } catch {
      return
    }
    setGoalsStep(!loadSignupGoals())
    setDismissed(false)
    // Big welcome moment — confetti blast as the trial popup appears.
    setTimeout(() => celebrate(), 350)
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
    <Modal open={!dismissed} onClose={close} title={goalsStep ? 'What matters to you?' : 'Welcome to PandaSpot!'} size="lg">
      {goalsStep ? (
        <>
          <p className="signup-pitch">
            Studios on PandaSpot <strong>cut post-shoot busywork</strong> — tell us what to set up first:
          </p>
          <p className="goal-question">What do you want to improve most?</p>
          <div className="goal-grid" role="radiogroup" aria-label="What do you want to improve most?">
            {IMPROVE_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={improve === id}
                data-selected={improve === id}
                className="goal-card"
                onClick={() => setImprove((prev) => (prev === id ? '' : id))}
              >
                <span className="goal-card-icon"><Icon size={20} /></span>
                {label}
              </button>
            ))}
          </div>
          <p className="goal-question">How should it work for you?</p>
          <div className="goal-grid" role="group" aria-label="How should it work for you?">
            {WAY_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={ways.includes(id)}
                data-selected={ways.includes(id)}
                className="goal-card"
                onClick={() => setWays((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]))}
              >
                <span className="goal-card-icon"><Icon size={20} /></span>
                {label}
              </button>
            ))}
          </div>
          <div className="row mt-4">
            <GoldButton
              className="flex-1 justify-center"
              onClick={() => { saveSignupGoals({ improve, ways }); setGoalsStep(false) }}
            >
              Save &amp; continue
            </GoldButton>
            <button type="button" className="btn secondary" onClick={() => setGoalsStep(false)}>Skip</button>
          </div>
        </>
      ) : (
        <>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        You&apos;re on a <strong style={{ color: 'var(--text-primary)' }}>free trial</strong> — upload up to{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{subscription.photo_quota_total} photos</strong>
        {daysLeft !== null && (
          <> for the next <strong style={{ color: 'var(--text-primary)' }}>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong></>
        )}.
      </p>

      <div className="trial-bonus">
        <Gift size={18} className="trial-bonus-icon" />
        <div>
          <p className="trial-bonus-title">Signup bonus — everything unlocked, no credit card</p>
          <p className="trial-bonus-text">Face search, photo selection, albums, studio suite and billing are all open during your trial.</p>
        </div>
      </div>

      <p className="trial-perks-heading">What you get</p>
      <ul className="trial-perks">
        {TRIAL_PERKS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="trial-perk">
            <span className="trial-perk-icon"><Icon size={18} /></span>
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>{title}</strong>
              <span className="trial-perk-text"> — {text}</span>
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="trial-readmore" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        {expanded ? 'Show less' : 'Read more — how studios save hours every event'}
        <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {expanded && (
        <div className="trial-deepdive">
          <p><strong>Before PandaSpot:</strong> you cull thousands of photos by hand, export sneak-peeks, and chase every guest and client over WhatsApp for picks and approvals.</p>
          <p><strong>With PandaSpot:</strong> upload once — guests serve themselves with a selfie, clients submit a locked favourite list, and albums get pinned feedback plus a locked approval. Same-day delivery stops being a heroic effort.</p>
          <p><strong>Live events:</strong> PandaShoots pushes camera shots straight into the gallery and the venue TV wall, so the crowd sees itself during the event — and every shared photo links new guests back to you.</p>
          <p><strong>Money side:</strong> packages, quotations, bills, receipts and bookings live next to your galleries, so the business paperwork stops living in five different apps.</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <Tv size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <p className="hint" style={{ margin: 0 }}>Tip: create your first event to get your guest link and QR card.</p>
      </div>
      <GoldButton onClick={close} className="w-full justify-center mt-4">Let&apos;s go</GoldButton>
        </>
      )}
    </Modal>
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

export default function Dashboard() {
  const { user } = useAuth()
  const containerRef = useRef(null)
  const [subscription, setSubscription] = useState(null)
  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    getMySubscription()
      .then((data) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
    getStudioAnalyticsSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
    // Event metrics live here on the Dashboard (not on the Events page).
    listEvents('all')
      .then((rows) => setEvents(rows || []))
      .catch(() => setEvents([]))
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-row > *', { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.5, delay: 0.1, ease: 'power3.out' })
      gsap.fromTo('.chart-section', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.55, delay: 0.4, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const quotaUsed = Number(subscription?.photo_quota_used || 0)
  const quotaTotal = Number(subscription?.photo_quota_total || 0)

  // Studio-wide aggregates — drive the uploads chart, the status donut,
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

  // Event metrics for the Dashboard cards below.
  const monthly = eventsByMonth(events)
  const topEvents = [...events].sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0)).slice(0, 5)

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
        <StatCard label="Events" value={summary?.totals?.events ?? 0} icon={CalendarDays} />
        <StatCard label="Photos" value={summary?.totals?.photos ?? 0} icon={ImageIcon} />
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
            <div className="flex flex-wrap gap-4 items-stretch">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Quota used</p>
                <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {quotaUsed} <span className="text-base font-medium" style={{ color: 'var(--text-tertiary)' }}>/ {quotaTotal}</span>
                </p>
              </div>
              <div className="flex gap-3 flex-wrap flex-1" style={{ minWidth: 280 }}>
                <div className="rounded-lg px-4 py-3 flex-1" style={{ background: 'var(--bg-elevated)', minWidth: 160 }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Remaining</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {Math.max(0, quotaTotal - quotaUsed)} uploads
                  </p>
                </div>
                <div className="rounded-lg px-4 py-3 flex-1" style={{ background: 'var(--bg-elevated)', minWidth: 160 }}>
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

      {/* ── Event metrics ─── */}
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

      <div className="mt-6 flex gap-3 flex-wrap">
        <Link to="/events">
          <GoldButton>Open Events</GoldButton>
        </Link>
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
