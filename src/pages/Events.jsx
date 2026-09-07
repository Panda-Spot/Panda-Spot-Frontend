import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Lock } from 'lucide-react'
import { createEvent, fileUrl, getMySubscription, listEvents } from '../api.js'
import { pop } from '../lib/confetti.js'
import { runInline, runInWorker } from '../lib/workerTask.js'
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

// Pure + self-contained (runs in a Web Worker): filter by tab, newest first.
// NOTE: keep closure-free — the worker serializes this function's source.
function deriveVisibleEvents({ events, status }) {
  const list = Array.isArray(events) ? events : []
  const filtered = status === 'all'
    ? list.slice()
    : list.filter((e) => (status === 'archived' ? !!e.archived_at : !e.archived_at))
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
  const [subscription, setSubscription] = useState(null)

  const load = () => {
    setLoading(true)
    listEvents('all')
      .then((rows) => {
        setAllEvents(rows || [])
        setVisibleEvents(runInline(deriveVisibleEvents, { events: rows || [], status: statusFilter }))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab switches re-filter the already-loaded list in a worker — instant,
  // no API call. The previous list stays on screen until the new one lands.
  useEffect(() => {
    let stale = false
    runInWorker(deriveVisibleEvents, { events: allEvents, status: statusFilter })
      .then((rows) => { if (!stale) setVisibleEvents(rows) })
      .catch(() => { if (!stale) setVisibleEvents(runInline(deriveVisibleEvents, { events: allEvents, status: statusFilter })) })
    return () => { stale = true }
  }, [allEvents, statusFilter])

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
          {visibleEvents.length === 0 ? (
            <p className="hint">
              {statusFilter === 'archived'
                ? 'No archived events — archiving hides an event from guests and clients without deleting anything.'
                : 'No events yet — create one above.'}
            </p>
          ) : (
            <ul className="event-list">
              {visibleEvents.map((ev) => (
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
