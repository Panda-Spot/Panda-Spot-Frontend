import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Search, UserPlus, Users } from 'lucide-react'
import {
  cancelInvite,
  inviteCollaborator,
  listEvents,
  listCollaborators,
  removeCollaborator,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import GoldInput from '../components/ui/GoldInput.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'
import { formatDate, timeAgo } from '../utils/formatters.js'

// Owner's cross-event Team workspace: every collaborator + every invite
// (pending / accepted / declined) with invited/accepted/joined timestamps.
// Invites are manual-approval only — email is sent, access is granted only
// after the invitee clicks Accept on their invite link.
export default function Team() {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [byEvent, setByEvent] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | pending | accepted | declined
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEventId, setInviteEventId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const evs = await listEvents()
      const owned = evs.filter((e) => e.role !== 'collaborator')
      setEvents(owned)
      const entries = await Promise.all(
        owned.map(async (ev) => {
          try {
            const data = await listCollaborators(ev.id)
            return [ev.id, data]
          } catch {
            return [ev.id, { collaborators: [], pending_invites: [], accepted_invites: [], declined_invites: [] }]
          }
        })
      )
      setByEvent(Object.fromEntries(entries))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    const out = []
    for (const ev of events) {
      const data = byEvent[ev.id]
      if (!data) continue
      for (const c of data.collaborators || []) {
        out.push({
          kind: 'active',
          key: `c-${ev.id}-${c.user_id}`,
          event_id: ev.id,
          event_name: ev.name,
          email: c.email,
          name: c.name,
          invited_at: null,
          accepted_at: null,
          joined_at: c.joined_at,
          payload: c,
        })
      }
      for (const i of data.pending_invites || []) {
        out.push({
          kind: 'pending',
          key: `p-${ev.id}-${i.invite_id}`,
          event_id: ev.id,
          event_name: ev.name,
          email: i.email,
          name: '',
          invited_at: i.invited_at,
          accepted_at: null,
          joined_at: null,
          payload: i,
        })
      }
      for (const i of data.accepted_invites || []) {
        out.push({
          kind: 'accepted',
          key: `a-${ev.id}-${i.invite_id}`,
          event_id: ev.id,
          event_name: ev.name,
          email: i.email,
          name: '',
          invited_at: i.invited_at,
          accepted_at: i.accepted_at,
          joined_at: i.accepted_at,
          payload: i,
        })
      }
      for (const i of data.declined_invites || []) {
        out.push({
          kind: 'declined',
          key: `d-${ev.id}-${i.invite_id}`,
          event_id: ev.id,
          event_name: ev.name,
          email: i.email,
          name: '',
          invited_at: i.invited_at,
          accepted_at: null,
          joined_at: null,
          declined_at: i.declined_at,
          payload: i,
        })
      }
    }
    return out.sort((a, b) => new Date(b.invited_at || b.joined_at || 0) - new Date(a.invited_at || a.joined_at || 0))
  }, [events, byEvent])

  const counts = useMemo(() => ({
    active: rows.filter((r) => r.kind === 'active').length,
    pending: rows.filter((r) => r.kind === 'pending').length,
    accepted: rows.filter((r) => r.kind === 'accepted').length,
    declined: rows.filter((r) => r.kind === 'declined').length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.kind !== statusFilter) return false
      if (!q) return true
      return (r.email || '').toLowerCase().includes(q)
        || (r.name || '').toLowerCase().includes(q)
        || (r.event_name || '').toLowerCase().includes(q)
    })
  }, [rows, search, statusFilter])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEventId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await inviteCollaborator(inviteEventId, inviteEmail.trim())
      showToast(res.status === 'added' ? `Added — ${res.email}` : `Invite sent to ${inviteEmail.trim()} — they must Accept before they get access.`)
      setInviteOpen(false)
      setInviteEmail('')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (row) => {
    const ok = await confirm(
      `Remove ${row.email} from "${row.event_name}"? They immediately lose access.`,
      { title: 'Remove collaborator?', confirmLabel: 'Remove', danger: true }
    )
    if (!ok) return
    try {
      await removeCollaborator(row.event_id, row.payload.user_id)
      showToast('Collaborator removed')
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleCancel = async (row) => {
    const ok = await confirm(
      `Cancel the pending invite to ${row.email} for "${row.event_name}"?`,
      { title: 'Cancel invite?', confirmLabel: 'Cancel invite', danger: true }
    )
    if (!ok) return
    try {
      await cancelInvite(row.event_id, row.payload.invite_id)
      showToast('Invite cancelled')
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniLoader size={22} /> Loading team…
        </p>
        {[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users size={22} className="text-gold-500" /> Team
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {counts.active} active · {counts.pending} pending · {counts.accepted} accepted · {counts.declined} declined
          </p>
        </div>
        <GoldButton icon={<UserPlus size={14} />} onClick={() => { setInviteEventId(events[0]?.id || ''); setInviteOpen(true) }} disabled={events.length === 0}>
          Invite collaborator
        </GoldButton>
      </div>

      {error && <p className="error">{error}</p>}

      <GlassCard hover={false}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px]" style={{ background: 'var(--bg-elevated)' }}>
            <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
            <input
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search by email, name, or event…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {['all', 'active', 'pending', 'accepted', 'declined'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                style={{
                  background: statusFilter === s ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === s ? '#F59E0B' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            No team entries match. Invite your first collaborator to get started.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <GlassCard key={r.key} hover={false}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {r.name || r.email}
                  </p>
                  <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Mail size={11} /> {r.email} · <Link to={`/events/${r.event_id}`} style={{ color: 'var(--accent-primary)' }}>{r.event_name}</Link>
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {r.kind === 'active' && <>Joined {formatDate(r.joined_at)} · {timeAgo(r.joined_at)}</>}
                    {r.kind === 'pending' && <>Invited {formatDate(r.invited_at)} · {timeAgo(r.invited_at)} · awaiting Accept</>}
                    {r.kind === 'accepted' && <>Invited {formatDate(r.invited_at)} · Accepted {formatDate(r.accepted_at)} · {timeAgo(r.accepted_at)}</>}
                    {r.kind === 'declined' && <>Invited {formatDate(r.invited_at)} · Declined {formatDate(r.declined_at)}</>}
                  </p>
                </div>
                {r.kind === 'active' && <Badge variant="success">Active</Badge>}
                {r.kind === 'pending' && <Badge variant="gold">Pending</Badge>}
                {r.kind === 'accepted' && <Badge variant="success">Accepted</Badge>}
                {r.kind === 'declined' && <Badge>Declined</Badge>}
                {r.kind === 'active' && (
                  <button type="button" className="text-xs font-medium" style={{ color: '#F87171' }} onClick={() => handleRemove(r)}>
                    Remove
                  </button>
                )}
                {(r.kind === 'pending' || r.kind === 'declined') && (
                  <button type="button" className="text-xs font-medium" style={{ color: '#F87171' }} onClick={() => handleCancel(r)}>
                    {r.kind === 'pending' ? 'Cancel invite' : 'Clear'}
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite collaborator" size="sm">
        <form onSubmit={handleInvite}>
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }} htmlFor="team-event">Event</label>
          <select
            id="team-event"
            className="w-full mt-1 mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            value={inviteEventId}
            onChange={(e) => setInviteEventId(e.target.value)}
          >
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <GoldInput label="Collaborator email" name="team-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <p className="hint">They get an email with an invite link and must click Accept — no auto-join.</p>
          <GoldButton type="submit" loading={inviting} className="w-full justify-center">Send invite</GoldButton>
        </form>
      </Modal>
    </div>
  )
}
