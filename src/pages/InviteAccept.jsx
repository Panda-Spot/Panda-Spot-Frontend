import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acceptInvite, declineInvite, getInvite } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'
import { pop } from '../lib/confetti.js'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  useEffect(() => {
    getInvite(token).then(setInvite).catch((e) => setError(e.message))
  }, [token])

  const handleAccept = async () => {
    setBusy(true)
    try {
      const res = await acceptInvite(token)
      setDone(`Accepted — you now have access to "${invite.event_name}".`)
      showToast('Invitation accepted')
      pop()
      setTimeout(() => navigate(`/events/${res.event_id}`), 900)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = async () => {
    setBusy(true)
    try {
      await declineInvite(token)
      setDone('Invitation declined. The owner has been notified.')
      showToast('Invitation declined')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!invite) return <p className="hint">Loading invite…</p>
  if (done) {
    return (
      <div className="card invite-card">
        <h1 className="section-title">Done</h1>
        <p className="subtle">{done}</p>
        <div className="row">
          <Link className="btn secondary" to="/dashboard">Go to Dashboard</Link>
          <Link className="btn secondary" to="/invitations">My Invitations</Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card invite-card">
        <h1 className="section-title">You&apos;re invited</h1>
        <p className="subtle">You&apos;ve been invited to help with &quot;{invite.event_name}&quot; on PandaSpot.</p>
        <p className="hint">Log in or create an account with {invite.email} to review and accept.</p>
        <div className="row">
          <Link className="btn" to={`/login?redirect=${encodeURIComponent(`/invites/${token}`)}`}>Log in</Link>
          <Link className="btn secondary" to={`/register?redirect=${encodeURIComponent(`/invites/${token}`)}`}>Create account</Link>
        </div>
      </div>
    )
  }

  // Manual approval: never auto-join — invitee must click Accept or Decline.
  return (
    <div className="card invite-card">
      <h1 className="section-title">You&apos;re invited</h1>
      <p className="subtle">You&apos;ve been invited to help with &quot;{invite.event_name}&quot; as a collaborator.</p>
      <p className="hint">Sent to {invite.email} — only that account can accept.</p>
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={handleAccept}>
          {busy ? 'Working…' : 'Accept invitation'}
        </button>
        <button type="button" className="btn secondary" disabled={busy} onClick={handleDecline}>
          Decline
        </button>
      </div>
    </div>
  )
}
