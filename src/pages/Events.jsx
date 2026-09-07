import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Camera, CalendarDays, Lock, ScanFace, Heart, Search, Plus, Building2, Gift, Sparkles, Crown, FileImage, CalendarOff } from 'lucide-react'
import { createEvent, fileUrl, getMySubscription, listEvents } from '../api.js'
import { pop } from '../lib/confetti.js'
import { runInline, runInWorker } from '../lib/workerTask.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Modal from '../components/ui/Modal.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'

const PAGE_SIZES = [5, 10, 20, 50]

const PRESETS = [
  { key: 'wedding', label: 'Wedding', icon: Heart, faceSearch: true, photoSelection: true },
  { key: 'corporate', label: 'Corporate', icon: Building2, faceSearch: true, photoSelection: false },
  { key: 'birthday', label: 'Birthday', icon: Gift, faceSearch: true, photoSelection: false },
  { key: 'minimal', label: 'Minimal', icon: Sparkles, faceSearch: true, photoSelection: false },
  { key: 'premium', label: 'Premium', icon: Crown, faceSearch: true, photoSelection: true },
  { key: 'blank', label: 'Blank theme', icon: FileImage, faceSearch: true, photoSelection: false },
]

const TYPE_FILTERS = [
  { key: 'all', label: 'All types' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'birthday', label: 'Birthday' },
]

// Pure + self-contained (runs in a Web Worker): filter by status, role and
// search, newest first. NOTE: keep closure-free — serialized to the worker.
function deriveVisibleEvents({ events, status, role, type, query }) {
  const list = Array.isArray(events) ? events : []
  const q = (query || '').trim().toLowerCase()
  const filtered = list.filter((e) => {
    if (status === 'archived' ? !e.archived_at : status === 'active' ? !!e.archived_at : false) return false
    if (role !== 'all' && e.role !== role) return false
    if (type !== 'all' && e.event_type !== type) return false
    if (q && !(e.name || '').toLowerCase().includes(q)) return false
    return true
  })
  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return filtered
}

export default function Events() {
  // All events are fetched ONCE per page load / CRUD — tab switches only
  // re-filter locally (worker, previous list kept meanwhile), no API call.
  const [allEvents, setAllEvents] = useState([])
  const [visibleEvents, setVisibleEvents] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [limitAlert, setLimitAlert] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // Feature choice is mandatory at creation — at least one must stay on.
  const [newFaceSearch, setNewFaceSearch] = useState(true)
  const [newPhotoSelection, setNewPhotoSelection] = useState(false)
  const [newEventDate, setNewEventDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [roleFilter, setRoleFilter] = useState('all') // all | owner | collaborator
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedPreset, setSelectedPreset] = useState('wedding')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [subscription, setSubscription] = useState(null)

  const filters = { status: statusFilter, role: roleFilter, type: typeFilter, query: search }

  const load = () => {
    setLoading(true)
    listEvents('all')
      .then((rows) => {
        setAllEvents(rows || [])
        setVisibleEvents(runInline(deriveVisibleEvents, { events: rows || [], ...filters }))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter changes re-filter the already-loaded list in a worker — instant,
  // no API call. The previous list stays on screen until the new one lands.
  useEffect(() => {
    let stale = false
    runInWorker(deriveVisibleEvents, { events: allEvents, ...filters })
      .then((rows) => { if (!stale) setVisibleEvents(rows) })
      .catch(() => { if (!stale) setVisibleEvents(runInline(deriveVisibleEvents, { events: allEvents, ...filters })) })
    return () => { stale = true }
  }, [allEvents, statusFilter, roleFilter, typeFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the page in range whenever the result set or page size changes.
  useEffect(() => { setPage(1) }, [statusFilter, roleFilter, typeFilter, search, pageSize])
  const pageCount = Math.max(1, Math.ceil(visibleEvents.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedEvents = visibleEvents.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    getMySubscription()
      .then((data) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || (!newFaceSearch && !newPhotoSelection)) return
    setCreating(true)
    setError('')
    try {
      const preset = PRESETS.find((p) => p.key === selectedPreset)
      await createEvent(name.trim(), {
        faceSearch: newFaceSearch,
        photoSelection: newPhotoSelection,
        eventDate: newEventDate || undefined,
        eventType: preset?.key || undefined,
      })
      setName('')
      setNewEventDate('')
      setNewFaceSearch(true)
      setNewPhotoSelection(false)
      setCreateOpen(false)
      pop()
      load()
    } catch (e) {
      // Plan cap is a wall, not a footnote — explain it in an alert popup
      // with the way forward instead of a plain inline error.
      if (/plan.*limit|limit.*events/i.test(e.message || '')) {
        setLimitAlert(true)
      }
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const quotaUsed = Number(subscription?.photo_quota_used || 0)
  const quotaTotal = Number(subscription?.photo_quota_total || 0)
  const quotaFull = quotaTotal > 0 && quotaUsed >= quotaTotal
  const trialExhausted = subscription?.status === 'TRIAL' && quotaFull

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        {trialExhausted && (
          <Link to="/billing">
            <GoldButton icon={<Lock size={14} />}>Upgrade Plan</GoldButton>
          </Link>
        )}
      </div>

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
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px]" style={{ background: 'var(--bg-elevated)' }}>
                <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="Search events by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                Per page
                <select
                  className="rounded-lg px-2 py-1.5 text-xs"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <div className="flex gap-3 flex-wrap mt-3">
              <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
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
              <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
                {[
                  { key: 'all', label: 'All roles' },
                  { key: 'owner', label: 'Owner' },
                  { key: 'collaborator', label: 'Collaborator' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRoleFilter(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: roleFilter === key ? 'var(--bg-surface)' : 'transparent',
                      color: roleFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
                {TYPE_FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: typeFilter === key ? 'var(--bg-surface)' : 'transparent',
                      color: typeFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between mt-4 mb-3">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {visibleEvents.length === 0
                ? `No events found · ${allEvents.length} total`
                : `Showing ${((safePage - 1) * pageSize) + 1}–${Math.min(safePage * pageSize, visibleEvents.length)} of ${visibleEvents.length} found · ${allEvents.length} total`}
            </p>
            {!trialExhausted && (
              <button className="btn secondary" type="button" onClick={() => setCreateOpen(true)} style={{ fontSize: 13, padding: '6px 14px' }}>
                <Plus size={14} /> New Event
              </button>
            )}
          </div>

          {visibleEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CalendarOff size={28} style={{ color: '#F59E0B' }} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>
                {allEvents.length === 0 ? 'No events yet' : 'No events match'}
              </h3>
              <p className="hint" style={{ maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
                {allEvents.length === 0
                  ? 'Create your first event to start managing photos, guests and deliveries.'
                  : 'Try adjusting your filters or search to find what you\'re looking for.'}
              </p>
            </div>
          ) : (
            <>
              <div className="event-grid">
                {pagedEvents.map((ev) => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="event-card">
                    {ev.cover_url ? (
                      <img
                        src={fileUrl(ev.cover_url)}
                        alt=""
                        className="event-card-cover"
                        draggable={false}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="event-card-cover event-card-cover-empty">
                        <Camera size={28} />
                      </div>
                    )}
                    <div className="event-card-body">
                      <p className="event-card-name" title={ev.name}>
                        {ev.name}
                        {ev.event_type && (
                          <span className="role-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', marginLeft: 6 }}>
                            {ev.event_type}
                          </span>
                        )}
                        <span className="role-badge">{ev.role === 'owner' ? 'Owner' : 'Collaborator'}</span>
                      </p>
                      {ev.event_date && (
                        <p className="hint">{new Date(ev.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      )}
                      <p className="hint">{ev.photo_count} photo{ev.photo_count === 1 ? '' : 's'}</p>
                      <div className="event-card-pills">
                        <span className={`status-pill ${ev.face_search_enabled ? 'active' : 'off'}`}>
                          Face Search
                        </span>
                        <span className={`status-pill ${ev.photo_selection_enabled ? 'active' : 'off'}`}>
                          Selection
                        </span>
                        {ev.shoots_connected && (
                          <span className="status-pill active">PandaShoots</span>
                        )}
                        {ev.guest_upload_enabled && (
                          <span className="status-pill active">Guest Upload</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 mt-4">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Page {safePage} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
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

      <Modal open={limitAlert} onClose={() => setLimitAlert(false)} title="Event limit reached" size="sm">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)' }}
          >
            <AlertTriangle size={26} style={{ color: '#FBBF24' }} />
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            You&apos;ve reached your plan&apos;s limit of 15 events.
          </p>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            New events are blocked until you free up room or move to a bigger plan — your existing
            events, photos and guest links keep working untouched.
          </p>
          <p className="hint mb-4">Archive an old event, or upgrade to raise the ceiling.</p>
          <div className="row w-full">
            <Link to="/billing" className="flex-1">
              <GoldButton className="w-full justify-center">Upgrade plan</GoldButton>
            </Link>
            <button type="button" className="btn secondary" onClick={() => setLimitAlert(false)}>
              Got it
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create event modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New event" size="md">
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Event name</label>
              <input
                className="text-input w-full"
                placeholder="Smith Wedding 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Event date</label>
              <input
                className="text-input w-full"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Event type</label>
              <p className="hint" style={{ marginBottom: 8 }}>Pick a preset to pre-configure features.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {PRESETS.map((p) => {
                  const Icon = p.icon
                  const active = selectedPreset === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(p.key)
                        setNewFaceSearch(p.faceSearch)
                        setNewPhotoSelection(p.photoSelection)
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '12px 8px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                        border: `2px solid ${active ? '#F59E0B' : 'var(--border-default)'}`,
                        background: active ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                        color: active ? '#F59E0B' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="field-label">Features</label>
              <p className="hint" style={{ marginBottom: 8 }}>Pick at least one. You can change these later in Danger.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setNewFaceSearch((v) => !v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '18px 12px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                    border: `2px solid ${newFaceSearch ? '#F59E0B' : 'var(--border-default)'}`,
                    background: newFaceSearch ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                    color: newFaceSearch ? '#F59E0B' : 'var(--text-secondary)',
                  }}
                >
                  <ScanFace size={28} />
                  <span className="text-xs font-semibold">Face Search</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.3 }}>
                    Guests find their photos with a selfie
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPhotoSelection((v) => !v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '18px 12px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                    border: `2px solid ${newPhotoSelection ? '#F59E0B' : 'var(--border-default)'}`,
                    background: newPhotoSelection ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                    color: newPhotoSelection ? '#F59E0B' : 'var(--text-secondary)',
                  }}
                >
                  <Heart size={28} />
                  <span className="text-xs font-semibold">Photo Selection</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.3 }}>
                    Clients browse, favourite, and submit picks
                  </span>
                </button>
              </div>
              {!newFaceSearch && !newPhotoSelection && (
                <p className="error" style={{ marginTop: 6 }}>Pick at least one feature.</p>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={creating || !name.trim() || (!newFaceSearch && !newPhotoSelection)}>
                {creating ? 'Creating…' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
