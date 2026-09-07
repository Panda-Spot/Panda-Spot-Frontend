import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { acceptInvite, declineInvite, listMyInvites } from '../api.js'
import { useToast } from '../toast.jsx'
import { pop } from '../lib/confetti.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'
import { formatDate, timeAgo } from '../utils/formatters.js'

// Invitee's own inbox: every pending collaborator invite sent to my email,
// with manual Accept / Decline. No auto-join anywhere.
export default function MyInvitations() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

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

  const handleAccept = async (token, eventName) => {
    setBusy(token)
    try {
      const res = await acceptInvite(token)
      showToast(`Accepted — welcome to "${eventName}"`)
      pop()
      navigate(`/events/${res.event_id}`)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(null)
      load()
    }
  }

  const handleDecline = async (token) => {
    setBusy(token)
    try {
      await declineInvite(token)
      showToast('Invitation declined')
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
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Inbox size={22} className="text-gold-500" /> My Invitations
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {invites.length} pending · you only get access after you Accept
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {invites.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            No pending invitations. When a studio invites you, it shows up here and in your email.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <GlassCard key={inv.token} hover={false}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {inv.event_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Invited {formatDate(inv.invited_at)} · {timeAgo(inv.invited_at)}
                  </p>
                </div>
                <Badge variant="gold">Pending</Badge>
                <Link className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }} to={`/invites/${inv.token}`}>
                  Review
                </Link>
                <GoldButton
                  disabled={busy === inv.token}
                  onClick={() => handleAccept(inv.token, inv.event_name)}
                >
                  {busy === inv.token ? 'Working…' : 'Accept'}
                </GoldButton>
                <button
                  type="button"
                  className="text-xs font-medium"
                  style={{ color: '#F87171' }}
                  disabled={busy === inv.token}
                  onClick={() => handleDecline(inv.token)}
                >
                  Decline
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
