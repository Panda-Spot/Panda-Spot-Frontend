import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, Mail, Search, User } from 'lucide-react'
import { acceptInvite, declineInvite, getInvite, listMyInvites } from '../api.js'
import { useToast } from '../toast.jsx'
import { pop } from '../lib/confetti.js'
import { useConfirm } from '../confirm.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import { formatDate, timeAgo } from '../utils/formatters.js'

const PAGE_SIZES = [5, 10, 25, 50]

// Invitee's own inbox: every pending collaborator invite sent to my email,
// with inviter details, search, paging and a full-detail review popup.
// Manual Accept / Decline everywhere — no auto-join.
export default function MyInvitations() {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [reviewToken, setReviewToken] = useState(null)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listMyInvites()
      setInvites(res.invites || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => { setPage(1) }, [search, pageSize])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invites
    return invites.filter((inv) =>
      (inv.event_name || '').toLowerCase().includes(q) ||
      (inv.inviter_name || '').toLowerCase().includes(q) ||
      (inv.inviter_email || '').toLowerCase().includes(q) ||
      (inv.studio_name || '').toLowerCase().includes(q)
    )
  }, [invites, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const openReview = async (token) => {
    setReviewToken(token)
    setReview(null)
    setReviewLoading(true)
    try {
      setReview(await getInvite(token))
    } catch (e) {
      showToast(e.message, { type: 'error' })
      setReviewToken(null)
    } finally {
      setReviewLoading(false)
    }
  }

  const handleAccept = async (token, eventName) => {
    const ok = await confirm(
      `Accept the invitation to help with "${eventName}"? You'll get your own login scoped to that event only.`,
      { title: 'Accept invitation?', confirmLabel: 'Accept' }
    )
    if (!ok) return
    setBusy(token)
    try {
      const res = await acceptInvite(token)
      showToast(`Accepted — welcome to "${eventName}"`)
      pop()
      setReviewToken(null)
      navigate(`/events/${res.event_id}`)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
      load()
    }
  }

  const handleDecline = async (token, eventName) => {
    const ok = await confirm(
      `Decline the invitation to "${eventName}"? The studio will see that you declined.`,
      { title: 'Decline invitation?', confirmLabel: 'Decline', danger: true }
    )
    if (!ok) return
    setBusy(token)
    try {
      await declineInvite(token)
      showToast('Invitation declined')
      setReviewToken(null)
      load()
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniLoader size={22} /> Loading invitations…
        </p>
        {[...Array(3)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {filtered.length} pending · you only get access after you Accept
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <GlassCard hover={false}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px]" style={{ background: 'var(--bg-elevated)' }}>
            <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
            <input
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search by event, studio, or inviter…"
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
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            {invites.length === 0
              ? 'No pending invitations. When a studio invites you, it shows up here and in your email.'
              : 'No invitations match that search.'}
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((inv) => (
              <GlassCard key={inv.token} hover={false}>
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar name={inv.studio_name || inv.inviter_name || inv.event_name} size="sm" ring />
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {inv.event_name}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
                      {inv.studio_name && (
                        <span className="inline-flex items-center gap-1"><Building2 size={11} /> {inv.studio_name}</span>
                      )}
                      {(inv.inviter_name || inv.inviter_email) && (
                        <span className="inline-flex items-center gap-1">
                          <User size={11} /> {inv.inviter_name || inv.inviter_email}
                          {inv.inviter_name && inv.inviter_email && (
                            <span className="inline-flex items-center gap-1">· <Mail size={11} /> {inv.inviter_email}</span>
                          )}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <CalendarDays size={11} /> Invited {formatDate(inv.invited_at)} · {timeAgo(inv.invited_at)}
                    </p>
                  </div>
                  <Badge variant="gold">Pending</Badge>
                  <GoldButton
                    disabled={busy === inv.token}
                    onClick={() => openReview(inv.token)}
                  >
                    Review
                  </GoldButton>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Page {safePage} of {pageCount} · {filtered.length} invitation{filtered.length === 1 ? '' : 's'}
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

      <Modal open={!!reviewToken} onClose={() => { setReviewToken(null); setReview(null) }} title="Review invitation" size="sm">
        {reviewLoading || !review ? (
          <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MiniLoader size={18} /> Loading invitation details…
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={review.studio_name || review.inviter_name || review.event_name} size="md" ring />
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{review.event_name}</p>
                {review.studio_name && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{review.studio_name}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              <p><strong style={{ color: 'var(--text-primary)' }}>Invited by:</strong> {review.inviter_name || '—'}{review.inviter_email && <> ({review.inviter_email})</>}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Sent to:</strong> {review.email}</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Invited on:</strong> {review.invited_at ? new Date(review.invited_at).toLocaleString() : '—'}</p>
              <p className="hint">Accepting gives you your own login scoped to this event only — upload photos, see the gallery and analytics. Nothing is shared until you accept.</p>
            </div>
            <div className="row">
              <GoldButton
                className="flex-1 justify-center"
                disabled={busy === reviewToken}
                onClick={() => handleAccept(reviewToken, review.event_name)}
              >
                {busy === reviewToken ? 'Working…' : 'Accept invitation'}
              </GoldButton>
              <button
                type="button"
                className="btn secondary"
                disabled={busy === reviewToken}
                onClick={() => handleDecline(reviewToken, review.event_name)}
              >
                Decline
              </button>
            </div>
            <p className="hint mt-3 text-center">
              Prefer the full page? <Link to={`/invites/${reviewToken}`} style={{ color: 'var(--accent-primary)' }}>Open it here</Link>
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
