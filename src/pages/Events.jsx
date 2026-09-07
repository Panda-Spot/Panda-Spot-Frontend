import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Camera, Lock, Search } from 'lucide-react'
import { createEvent, fileUrl, getMySubscription, listEvents } from '../api.js'
import { pop } from '../lib/confetti.js'
import { runInline, runInWorker } from '../lib/workerTask.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Modal from '../components/ui/Modal.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'

const PAGE_SIZES = [5, 10, 20, 50]

// Pure + self-contained (runs in a Web Worker): filter by status, role and
// search, newest first. NOTE: keep closure-free — serialized to the worker.
function deriveVisibleEvents({ events, status, role, query }) {
  const list = Array.isArray(events) ? events : []
  const q = (query || '').trim().toLowerCase()
  const filtered = list.filter((e) => {
    if (status === 'archived' ? !e.archived_at : status === 'active' ? !!e.archived_at : false) return false
    if (role !== 'all' && e.role !== role) return false
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
  // Feature choice is mandatory at creation — at least one must stay on.
  const [newFaceSearch, setNewFaceSearch] = useState(true)
  const [newPhotoSelection, setNewPhotoSelection] = useState(false)
  const [statusFilter, setStatusFilter] = useState('active')
  const [roleFilter, setRoleFilter] = useState('all') // all | owner | collaborator
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [subscription, setSubscription] = useState(null)

  const filters = { status: statusFilter, role: roleFilter, query: search }

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
  }, [allEvents, statusFilter, roleFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the page in range whenever the result set or page size changes.
  useEffect(() => { setPage(1) }, [statusFilter, roleFilter, search, pageSize])
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
      await createEvent(name.trim(), { faceSearch: newFaceSearch, photoSelection: newPhotoSelection })
      setName('')
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Events
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Create an event, then bulk-upload the photos so guests can find themselves by selfie.
        </p>
      </div>

      <form className="card" onSubmit={handleCreate}>
        <div className="guest-link-label">New event</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
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
            <button className="btn" type="submit" disabled={creating || !name.trim() || (!newFaceSearch && !newPhotoSelection)}>
              {creating ? 'Creating…' : 'Create Event'}
            </button>
          )}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Pick what this event does — required, at least one. Changing features later lives in the event&apos;s Danger section.
        </p>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 4 }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={newFaceSearch}
              onChange={(e) => setNewFaceSearch(e.target.checked)}
            />
            Face Search — guests find their own photos with a selfie
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={newPhotoSelection}
              onChange={(e) => setNewPhotoSelection(e.target.checked)}
            />
            Photo Selection — clients log in to browse, favourite, and submit picks
          </label>
        </div>
        {!newFaceSearch && !newPhotoSelection && (
          <p className="error" style={{ marginTop: 8 }}>Pick at least one feature to create the event.</p>
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
            </div>
          </GlassCard>

          <p className="text-xs mt-4 mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {visibleEvents.length === 0
              ? `No events found · ${allEvents.length} total`
              : `Showing ${((safePage - 1) * pageSize) + 1}–${Math.min(safePage * pageSize, visibleEvents.length)} of ${visibleEvents.length} found · ${allEvents.length} total`}
          </p>

          {visibleEvents.length === 0 ? (
            <p className="hint">
              {allEvents.length === 0
                ? 'No events yet — create one above.'
                : 'No events match these filters.'}
            </p>
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
                        <span className="role-badge">{ev.role === 'owner' ? 'Owner' : 'Collaborator'}</span>
                      </p>
                      <p className="hint">{ev.photo_count} photo{ev.photo_count === 1 ? '' : 's'}</p>
                      <div className="event-card-pills">
                        <span className={`status-pill ${ev.face_search_enabled ? 'active' : 'off'}`}>
                          Face Search
                        </span>
                        <span className={`status-pill ${ev.photo_selection_enabled ? 'active' : 'off'}`}>
                          Selection
                        </span>
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
    </div>
  )
}
