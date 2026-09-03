import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptClientInvite, getClientInvite } from '../api.js'
import { useAuth } from '../auth.jsx'

// MERGE (Studio-Verse Photo Selection): unlike InviteAccept.jsx (staff
// collaborator invites, which requires an existing PandaSpot login), a
// client usually has no account yet — this page collects a password
// right here and the backend creates the USER-role account on accept.
export default function AcceptClientInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    getClientInvite(token).then(setInvite).catch((e) => setError(e.message))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!invite.account_exists && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setAccepting(true)
    setError('')
    try {
      const res = await acceptClientInvite(token, password, name)
      await refreshUser()
      navigate(`/client/${res.event_id}`)
    } catch (e) {
      setError(e.message)
      setAccepting(false)
    }
  }

  if (error && !invite) return <p className="error">{error}</p>
  if (!invite) return <p className="hint">Loading invite…</p>

  return (
    <div className="card invite-card">
      <h1 className="section-title">View your photos</h1>
      <p className="subtle">
        You've been invited to browse and favourite your photos from "{invite.event_name}".
      </p>
      <form onSubmit={handleSubmit}>
        {!invite.account_exists && (
          <>
            <label className="field-label" htmlFor="client-name">Your name</label>
            <input
              id="client-name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
            />
            <label className="field-label" htmlFor="client-password">Set a password</label>
            <input
              id="client-password"
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </>
        )}
        {invite.account_exists && (
          <p className="hint">You already have a PandaSpot login with {invite.email} — just confirm below to add this event.</p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={accepting}>
          {accepting ? 'Joining…' : 'View my photos'}
        </button>
      </form>
    </div>
  )
}
