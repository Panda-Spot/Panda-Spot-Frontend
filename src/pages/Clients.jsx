import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Search, UserPlus, Users } from 'lucide-react'
import {
  checkClientDuplicate,
  createClientAccount,
  inviteClient,
  listClients,
  listEvents,
  removeClient,
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
import { clientDisplayName, formatDate } from '../utils/formatters.js'

// Cross-event client roster: every USER-role client holding an
// EventUserMapping on any of this studio's events, merged by user id with
// the list of events they can access. Per-event invite/remove reuse the
// exact same endpoints as each event's own Clients card.
export default function Clients() {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [byEvent, setByEvent] = useState({}) // eventId -> { clients, pending_invites }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null) // user_id
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTab, setInviteTab] = useState('existing') // existing | new
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [duplicate, setDuplicate] = useState(null)

  // Advisory duplicate check while typing an email — warns before sending
  // a double invite, never blocks (same advisory-only contract as
  // Studio-Verse's checkDuplicateClient).
  useEffect(() => {
    if (!inviteOpen) return
    const email = inviteEmail.trim().toLowerCase()
    if (!inviteEventId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setDuplicate(null)
      return
    }
    const t = setTimeout(() => {
      checkClientDuplicate(inviteEventId, email)
        .then(setDuplicate)
        .catch(() => setDuplicate(null))
    }, 400)
    return () => clearTimeout(t)
  }, [inviteOpen, inviteEventId, inviteEmail])
  const [inviteEventId, setInviteEventId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCap, setInviteCap] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const evs = await listEvents()
      setEvents(evs)
      const entries = await Promise.all(
        evs.map(async (ev) => {
          try {
            const data = await listClients(ev.id)
            return [ev.id, data]
          } catch {
            return [ev.id, { clients: [], pending_invites: [] }]
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

  const roster = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      const data = byEvent[ev.id]
      if (!data) continue
      for (const c of data.clients || []) {
        if (!map.has(c.user_id)) {
          map.set(c.user_id, { ...c, event_names: [], accesses: [] })
        }
        const row = map.get(c.user_id)
        row.event_names.push(ev.name)
        row.accesses.push({
          event_id: ev.id,
          event_name: ev.name,
          favourite_cap: c.favourite_cap,
          submitted_at: c.submitted_at,
        })
      }
    }
    return [...map.values()].sort((a, b) =>
      (a.name || a.email || '').localeCompare(b.name || b.email || '')
    )
  }, [events, byEvent])

  const pendingCount = useMemo(
    () => Object.values(byEvent).reduce((n, d) => n + (d.pending_invites?.length || 0), 0),
    [byEvent]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      c.event_names.some((n) => n.toLowerCase().includes(q))
    )
  }, [roster, search])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEventId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const cap = inviteCap.trim() === '' ? undefined : Number(inviteCap)
      if (inviteTab === 'new') {
        if (newPassword && newPassword.length < 8) {
          showToast('Password must be at least 8 characters', { type: 'error' })
          return
        }
        const res = await createClientAccount(inviteEventId, {
          email: inviteEmail.trim(),
          name: newName.trim() || undefined,
          password: newPassword || undefined,
          favouriteCap: cap,
        })
        if (res.status === 'created' && res.generated_password) {
          setCreatedCredentials({ email: res.email, password: res.generated_password })
        } else {
          showToast(`Added — ${res.email} can view this event immediately.`)
          closeInviteModal()
        }
      } else {
        await inviteClient(inviteEventId, inviteEmail.trim(), cap)
        showToast(`Invite sent to ${inviteEmail.trim()}`)
        closeInviteModal()
      }
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  const closeInviteModal = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteCap('')
    setNewName('')
    setNewPassword('')
    setCreatedCredentials(null)
    setDuplicate(null)
    setInviteTab('existing')
  }

  const openInviteModal = () => {
    setInviteEventId(events[0]?.id || '')
    setInviteTab('existing')
    setCreatedCredentials(null)
    setInviteOpen(true)
  }

  const handleRemove = async (eventId, eventName, client) => {
    const ok = await confirm(
      `Remove ${client.name || client.email} from "${eventName}"? They immediately lose gallery access to that event.`,
      { title: 'Remove client access?', confirmLabel: 'Remove', danger: true }
    )
    if (!ok) return
    try {
      await removeClient(eventId, client.user_id)
      showToast('Client access removed')
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniLoader size={22} /> Loading clients…
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
            <Users size={22} className="text-gold-500" /> Clients
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {roster.length} client{roster.length === 1 ? '' : 's'} across {events.length} event{events.length === 1 ? '' : 's'}
            {pendingCount > 0 && ` · ${pendingCount} invite${pendingCount === 1 ? '' : 's'} pending`}
          </p>
        </div>
        <GoldButton
          icon={<UserPlus size={14} />}
          onClick={openInviteModal}
          disabled={events.length === 0}
        >
          Invite client
        </GoldButton>
      </div>

      {error && <p className="error">{error}</p>}

      <GlassCard hover={false}>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Search by name, email, or event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            {roster.length === 0
              ? 'No clients yet — invite your first client to give them gallery access.'
              : 'No clients match that search.'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <GlassCard key={c.user_id} hover={false}>
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded((x) => (x === c.user_id ? null : c.user_id))}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {clientDisplayName(c)}
                  </p>
                  <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Mail size={11} /> {c.email}
                  </p>
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {c.event_names.length} event{c.event_names.length === 1 ? '' : 's'}
                </span>
                {c.accesses.some((a) => a.submitted_at) && <Badge variant="gold">Submitted</Badge>}
              </div>

              {expanded === c.user_id && (
                <div className="mt-4 space-y-2">
                  {c.accesses.map((a) => (
                    <div
                      key={a.event_id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 flex-wrap"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      <Link
                        to={`/events/${a.event_id}`}
                        className="text-sm font-medium flex-1 min-w-[140px]"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.event_name}
                      </Link>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {a.favourite_cap ? `Cap ${a.favourite_cap}` : 'No cap'}
                      </span>
                      {a.submitted_at
                        ? <Badge variant="gold">Submitted {formatDate(a.submitted_at)}</Badge>
                        : <Badge>Awaiting picks</Badge>}
                      <button
                        type="button"
                        className="text-xs font-medium"
                        style={{ color: '#F87171' }}
                        onClick={() => handleRemove(a.event_id, a.event_name, c)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={inviteOpen} onClose={closeInviteModal} title="Add client" size="sm">
        {createdCredentials ? (
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Account created for <strong>{createdCredentials.email}</strong> — share this one-time password now, it won&apos;t be shown again:
            </p>
            <p className="text-base font-mono font-bold mb-4 p-3 rounded-lg text-center"
              style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)', userSelect: 'all' }}>
              {createdCredentials.password}
            </p>
            <GoldButton className="w-full justify-center" onClick={closeInviteModal}>Done</GoldButton>
          </div>
        ) : (
          <>
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-4" style={{ background: 'var(--bg-elevated)' }}>
              {[
                { key: 'existing', label: 'Email invite' },
                { key: 'new', label: 'New account' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setInviteTab(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: inviteTab === key ? 'var(--bg-surface)' : 'transparent',
                    color: inviteTab === key ? '#F59E0B' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={handleInvite}>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }} htmlFor="inv-event">Event</label>
              <select
                id="inv-event"
                className="w-full mt-1 mb-4 rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                value={inviteEventId}
                onChange={(e) => setInviteEventId(e.target.value)}
              >
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <GoldInput label="Client email" name="inv-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              {duplicate?.already_in_event && (
                <p className="hint" style={{ color: '#FBBF24' }}>
                  {duplicate.name || inviteEmail.trim()} already has access to this event.
                </p>
              )}
              {duplicate?.exists && !duplicate.already_in_event && (
                <p className="hint">
                  {duplicate.name || inviteEmail.trim()} already has an account
                  {duplicate.role && duplicate.role !== 'USER' ? ` (${duplicate.role})` : ''} — inviting will link it to this event.
                </p>
              )}
              {inviteTab === 'new' && (
                <>
                  <GoldInput label="Client name (optional)" name="inv-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <GoldInput label="Password (optional — blank = generate)" name="inv-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </>
              )}
              <GoldInput label="Favourite cap (optional, blank = unlimited)" name="inv-cap" type="number" value={inviteCap} onChange={(e) => setInviteCap(e.target.value)} />
              <GoldButton type="submit" loading={inviting} className="w-full justify-center">
                {inviteTab === 'new' ? 'Create account' : 'Send invite'}
              </GoldButton>
              {inviteTab === 'new' && (
                <p className="hint mt-2">Creates the login immediately with access to this event — no email round trip.</p>
              )}
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
