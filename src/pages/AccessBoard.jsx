import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, UserPlus } from 'lucide-react'
import {
  createClientAccount,
  getAccessSummary,
  inviteClient,
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
  const [modalTab, setModalTab] = useState('invite') // invite | create
  const [inviteEventId, setInviteEventId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCap, setInviteCap] = useState('')
  const [inviteExpiry, setInviteExpiry] = useState('')
  const [inviting, setInviting] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createCap, setCreateCap] = useState('')
  const [createExpiry, setCreateExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdPassword, setCreatedPassword] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  // One round trip for the whole board (events + clients + invites +
  // favourite counts). Previously this fired 1 + N requests, which is what
  // made /access lag with a busy studio.
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAccessSummary()
      const evs = (data.events || []).map((e) => ({ id: e.id, name: e.name }))
      setEvents(evs)
      if (!selectedEventId && evs.length > 0) setSelectedEventId(evs[0].id)
      setByEvent(Object.fromEntries((data.events || []).map((e) => [e.id, e])))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setInviteExpiry('')
    setCreateName('')
    setCreatePassword('')
    setCreateCap('')
    setCreateExpiry('')
    setCreatedPassword('')
    setModalMessage('')
    setModalTab('invite')
    setInviteOpen(true)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEventId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const cap = inviteCap.trim() === '' ? undefined : Number(inviteCap)
      const expiresAt = inviteExpiry.trim() || undefined
      await inviteClient(inviteEventId, inviteEmail.trim(), cap, expiresAt)
      showToast(`Invite sent to ${inviteEmail.trim()}`)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteCap('')
      setInviteExpiry('')
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!inviteEventId || !inviteEmail.trim()) return
    setCreating(true)
    setCreatedPassword('')
    setModalMessage('')
    try {
      const res = await createClientAccount(inviteEventId, {
        email: inviteEmail.trim(),
        name: createName.trim() || undefined,
        password: createPassword || undefined,
        favouriteCap: createCap.trim() === '' ? undefined : Number(createCap),
        expiresAt: createExpiry.trim() || undefined,
      })
      if (res.status === 'created' && res.generated_password) {
        setCreatedPassword(res.generated_password)
        setModalMessage(`Login created — copy the one-time password now, it won't be shown again.`)
      } else {
        showToast(`Client ready — ${res.email}`)
        setInviteOpen(false)
        load()
        return
      }
      load()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setCreating(false)
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

                  <div className="space-y-2">
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
                          {c.access_expires && (
                            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }} title={`Access expires ${new Date(c.access_expires).toLocaleString()}`}>
                              until {new Date(c.access_expires).toLocaleDateString()}
                            </span>
                          )}
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
                    className="w-full mt-3 text-xs font-medium rounded-lg py-2 flex items-center justify-center gap-1 sticky bottom-3"
                    style={{ color: 'var(--accent-primary)', border: '1px dashed var(--accent-primary)', background: 'var(--bg-surface)' }}
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
              {/* Bounded + scroll-chained-off so wheel/touch inside the
                  sidebar never jumps the page behind it. */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto overscroll-contain">
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

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Client access" size="sm">
        <div className="row source-filter-row" style={{ marginBottom: 12 }}>
          {[
            { key: 'invite', label: 'Invite by email' },
            { key: 'create', label: 'Create login' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className={modalTab === t.key ? 'upload-tab active' : 'upload-tab'}
              onClick={() => { setModalTab(t.key); setModalMessage(''); setCreatedPassword('') }}
            >
              {t.label}
            </button>
          ))}
        </div>
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
        {modalTab === 'invite' ? (
          <form onSubmit={handleInvite}>
            <GoldInput
              label="Client email (pick an existing client or type a new one)"
              name="ab-email" type="email"
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              list="ab-client-emails"
            />
            <datalist id="ab-client-emails">
              {allClients.map((c) => <option key={c.user_id} value={c.email}>{c.name || c.email}</option>)}
            </datalist>
            <GoldInput label="Favourite cap (optional, blank = unlimited)" name="ab-cap" type="number" value={inviteCap} onChange={(e) => setInviteCap(e.target.value)} />
            <GoldInput label="Access expires (optional)" name="ab-expiry" type="date" value={inviteExpiry} onChange={(e) => setInviteExpiry(e.target.value)} />
            <GoldButton type="submit" loading={inviting} className="w-full justify-center">Send invite</GoldButton>
          </form>
        ) : (
          <form onSubmit={handleCreate}>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
              You pick the password and share it yourself — they log straight in, no invite email.
            </p>
            <GoldInput
              label="Client email (pick an existing client or type a new one)"
              name="ab-cemail" type="email"
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              list="ab-client-emails"
            />
            <GoldInput label="Name (optional)" name="ab-cname" type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            <GoldInput label="Password (blank = auto-generate)" name="ab-cpass" type="text" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} autoComplete="new-password" />
            <GoldInput label="Favourite cap (optional, blank = unlimited)" name="ab-ccap" type="number" value={createCap} onChange={(e) => setCreateCap(e.target.value)} />
            <GoldInput label="Access expires (optional)" name="ab-cexpiry" type="date" value={createExpiry} onChange={(e) => setCreateExpiry(e.target.value)} />
            {modalMessage && <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{modalMessage}</p>}
            {createdPassword && (
              <p className="text-xs mb-2" style={{ color: 'var(--text-primary)', userSelect: 'all' }}>
                One-time password (copy now — never shown again): <strong>{createdPassword}</strong>
              </p>
            )}
            <GoldButton type="submit" loading={creating} className="w-full justify-center">Create login</GoldButton>
          </form>
        )}
      </Modal>
    </div>
  )
}
