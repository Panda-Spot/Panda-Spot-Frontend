import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acceptInvite, getInvite } from '../api.js'
import { useAuth } from '../auth.jsx'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    getInvite(token).then(setInvite).catch((e) => setError(e.message))
  }, [token])

  useEffect(() => {
    if (!invite || authLoading || !user || accepting) return
    setAccepting(true)
    acceptInvite(token)
      .then((res) => navigate(`/events/${res.event_id}`))
      .catch((e) => setError(e.message))
  }, [invite, authLoading, user, token, accepting, navigate])

  if (error) return <p className="error">{error}</p>
  if (!invite) return <p className="hint">Loading invite…</p>

  if (!user) {
    return (
      <div className="card invite-card">
        <h1 className="section-title">You're invited</h1>
        <p className="subtle">You've been invited to help with "{invite.event_name}" on PandaSpot.</p>
        <p className="hint">Log in or create an account with {invite.email} to accept.</p>
        <div className="row">
          <Link className="btn" to={`/login?redirect=${encodeURIComponent(`/invites/${token}`)}`}>Log in</Link>
          <Link className="btn secondary" to={`/register?redirect=${encodeURIComponent(`/invites/${token}`)}`}>Create account</Link>
        </div>
      </div>
    )
  }

  return <p className="hint">Joining "{invite.event_name}"…</p>
}
