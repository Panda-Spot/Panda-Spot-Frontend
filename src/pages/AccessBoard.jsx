import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Mail, UserPlus } from 'lucide-react'
import {
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

// Cross-event access console: one scrollable column per event holding a
// card for every client with access, plus a sticky sidebar to assign
// unassigned clients to the selected event or invite someone brand-new.
// NOTE (Phase 18H): per-client expiry editing and revoke/restore need
// access_expires + revoked state on EventUserMapping, which this backend
// doesn't have yet — cards show the real submitted/cap state that exists
// today, and expiry/revoke controls arrive with that migration.
export default function AccessBoard() {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [events, setEvents] = useState([])
  const [byEvent, setByEvent] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
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
      if (!selectedEventId && evs.length > 0) setSelectedEventId(evs[0].id)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const allClients = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      for (const c of byEvent[ev.id]?.clients || []) {
        if (!map.has(c.user_id)) map.set(c.user_id, c)
      }
    }
    return [...map.values()]
  }, [events, byEvent])

  const unassigned = useMemo(() => {
    const inSelected = new Set((byEvent[selectedEventId]?.clients || []).map((c) => c.user_id))
    const q = sidebarSearch.trim().toLowerCase()
    return allClients.filter((c) => {
      if (inSelected.has(c.user_id)) return false
      if (!q) return true
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    })
  }, [allClients, byEvent, selectedEventId, sidebarSearch])

  const openInvite = (eventId, email = '') => {
    setInviteEventId(eventId)
    setInviteEmail(email)
    setInviteCap('')
    setInviteOpen(true)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEventId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const cap = inviteCap.trim() === '' ? undefined : Number(inviteCap)
      await inviteClient(inviteEventId, inviteEmail.trim(), cap)
      showToast(`Invite sent to ${inviteEmail.trim()}`)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteCap('')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setInviting(false)
    }
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
          <MiniLoader size={22} /> Loading access board…
        </p>
        <SkeletonLoader type="card" count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <LayoutGrid size={22} className="text-gold-500" /> Access Board
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Who can see which event — assign, invite, or remove in one place.
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {events.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            No events yet — <Link to="/events">create one</Link> to start granting client access.
          </p>
        </GlassCard>
      ) : (
        <div className="flex gap-5 items-start">
          {/* ── Event columns ── */}
          <div className="flex-1 min-w-0 flex gap-4 overflow-x-auto pb-4">
            {events.map((ev) => {
              const data = byEvent[ev.id] || { clients: [], pending_invites: [] }
              const selected = selectedEventId === ev.id
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className="w-72 flex-shrink-0 rounded-xl p-3 cursor-pointer"
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${selected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      to={`/events/${ev.id}`}
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.name}
                    </Link>
                    <Badge variant={selected ? 'gold' : 'default'}>
                      {(data.clients || []).length}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {(data.clients || []).map((c) => (
                      <div
                        key={c.user_id}
                        className="rounded-lg px-3 py-2"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {c.name || c.email}
                        </p>
                        <p className="text-[11px] truncate flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                          <Mail size={10} /> {c.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {c.submitted_at
                            ? <Badge variant="gold">Submitted</Badge>
                            : <Badge>{c.favourite_cap ? `Cap ${c.favourite_cap}` : 'No cap'}</Badge>}
                          <button
                            type="button"
                            className="text-[11px] font-medium ml-auto"
                            style={{ color: '#F87171' }}
                            onClick={() => handleRemove(ev.id, ev.name, c)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {(data.clients || []).length === 0 && (
                      <p className="text-[11px] text-center py-3" style={{ color: 'var(--text-tertiary)' }}>
                        No clients yet
                      </p>
                    )}
                    {(data.pending_invites || []).map((inv) => (
                      <div key={inv.invite_id} className="rounded-lg px-3 py-2" style={{ background: 'transparent', border: '1px dashed var(--border-default)' }}>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{inv.email}</p>
                        <Badge>Invite pending</Badge>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full mt-3 text-xs font-medium rounded-lg py-2 flex items-center justify-center gap-1"
                    style={{ color: 'var(--accent-primary)', border: '1px dashed var(--accent-primary)' }}
                    onClick={(e) => { e.stopPropagation(); openInvite(ev.id) }}
                  >
                    <UserPlus size={12} /> Invite to this event
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Sticky sidebar ── */}
          <div className="w-64 flex-shrink-0 hidden lg:block sticky top-20">
            <GlassCard hover={false}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Assign clients</h3>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {events.find((e) => e.id === selectedEventId)?.name || 'Select an event column first'}
              </p>
              <input
                className="w-full rounded-lg px-3 py-2 text-xs mb-3"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                placeholder="Search clients…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
              />
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {unassigned.map((c) => (
                  <div key={c.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-elevated)' }}>
                    <span className="text-[11px] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {c.name || c.email}
                    </span>
                    <button
                      type="button"
                      className="text-[11px] font-semibold flex-shrink-0"
                      style={{ color: 'var(--accent-primary)' }}
                      disabled={!selectedEventId}
                      onClick={() => openInvite(selectedEventId, c.email)}
                    >
                      Assign
                    </button>
                  </div>
                ))}
                {unassigned.length === 0 && (
                  <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
                    Everyone already has access here.
                  </p>
                )}
              </div>
              <GoldButton
                variant="outline"
                size="sm"
                className="w-full justify-center mt-3"
                disabled={!selectedEventId}
                onClick={() => openInvite(selectedEventId)}
              >
                New client on the spot
              </GoldButton>
            </GlassCard>
          </div>
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite client" size="sm">
        <form onSubmit={handleInvite}>
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }} htmlFor="ab-event">Event</label>
          <select
            id="ab-event"
            className="w-full mt-1 mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            value={inviteEventId}
            onChange={(e) => setInviteEventId(e.target.value)}
          >
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <GoldInput label="Client email" name="ab-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <GoldInput label="Favourite cap (optional, blank = unlimited)" name="ab-cap" type="number" value={inviteCap} onChange={(e) => setInviteCap(e.target.value)} />
          <GoldButton type="submit" loading={inviting} className="w-full justify-center">Send invite</GoldButton>
        </form>
      </Modal>
    </div>
  )
}
