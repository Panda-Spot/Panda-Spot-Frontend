import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteAdminUser,
  getAdminUser,
  resendAdminUserVerification,
  setAdminUserLimits,
  suspendAdminUser,
  unsuspendAdminUser,
  verifyAdminUser,
} from '../api.js'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

export default function AdminClientDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [error, setError] = useState('')
  const [togglingSuspend, setTogglingSuspend] = useState(false)
  const [eventLimitInput, setEventLimitInput] = useState('')
  const [storageLimitInput, setStorageLimitInput] = useState('')
  const [savingLimits, setSavingLimits] = useState(false)
  const [limitsMessage, setLimitsMessage] = useState('')
  const [confirmEmailInput, setConfirmEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [verifyActionMessage, setVerifyActionMessage] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)
  const [forceVerifying, setForceVerifying] = useState(false)

  const load = useCallback(() => {
    getAdminUser(userId)
      .then((c) => {
        setClient(c)
        setEventLimitInput(c.custom_event_limit != null ? String(c.custom_event_limit) : '')
        setStorageLimitInput(c.custom_storage_limit_bytes != null ? String(c.custom_storage_limit_bytes / 1e9) : '')
      })
      .catch((e) => setError(e.message))
  }, [userId])

  useEffect(load, [load])

  const handleToggleSuspend = async () => {
    setTogglingSuspend(true)
    setError('')
    try {
      if (client.is_suspended) await unsuspendAdminUser(userId)
      else await suspendAdminUser(userId)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingSuspend(false)
    }
  }

  const handleResendVerification = async () => {
    setResendingVerification(true)
    setError('')
    setVerifyActionMessage('')
    try {
      const result = await resendAdminUserVerification(userId)
      setVerifyActionMessage(result.already_verified ? 'Already verified.' : 'Verification email sent.')
    } catch (e) {
      setError(e.message)
    } finally {
      setResendingVerification(false)
    }
  }

  const handleForceVerify = async () => {
    setForceVerifying(true)
    setError('')
    setVerifyActionMessage('')
    try {
      await verifyAdminUser(userId)
      setVerifyActionMessage('Marked verified.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setForceVerifying(false)
    }
  }

  const handleSaveLimits = async (e) => {
    e.preventDefault()
    setSavingLimits(true)
    setError('')
    setLimitsMessage('')
    try {
      const eventLimit = eventLimitInput.trim() === '' ? null : parseInt(eventLimitInput, 10)
      const storageLimitBytes = storageLimitInput.trim() === '' ? null : Math.round(parseFloat(storageLimitInput) * 1e9)
      await setAdminUserLimits(userId, eventLimit, storageLimitBytes)
      setLimitsMessage('Limits updated.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingLimits(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${client.email}'s account and every event they own? This can't be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await deleteAdminUser(userId, confirmEmailInput)
      navigate('/admin/clients')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  if (error && !client) return <p className="error">{error}</p>
  if (!client) return <p className="hint">Loading…</p>

  return (
    <div>
      <Link className="back-link" to="/admin/clients">&larr; All clients</Link>

      <div className="client-detail-header" style={{ marginTop: 10 }}>
        <div>
          <h1>{client.name}</h1>
          <p className="hint">{client.email}</p>
        </div>
        <span className={`status-pill ${client.is_suspended ? 'suspended' : 'active'}`}>
          {client.is_suspended ? 'Suspended' : 'Active'}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <p className="hint">
          Joined {new Date(client.created_at).toLocaleDateString()} · Email {client.email_verified ? 'verified' : 'not verified'}
        </p>
        <div className="row">
          <button className={`btn ${client.is_suspended ? 'secondary' : 'danger-btn'}`} type="button" onClick={handleToggleSuspend} disabled={togglingSuspend}>
            {togglingSuspend ? 'Working…' : client.is_suspended ? 'Reactivate account' : 'Suspend account'}
          </button>
          {!client.email_verified && (
            <>
              <button className="btn secondary" type="button" onClick={handleResendVerification} disabled={resendingVerification}>
                {resendingVerification ? 'Sending…' : 'Resend verification email'}
              </button>
              <button className="btn secondary" type="button" onClick={handleForceVerify} disabled={forceVerifying}>
                {forceVerifying ? 'Working…' : 'Mark verified'}
              </button>
            </>
          )}
        </div>
        {verifyActionMessage && <p className="hint">{verifyActionMessage}</p>}
      </div>

      <h2 className="section-title">Events ({client.events.length})</h2>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Photos</th>
              <th>Storage</th>
              <th>Created</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {client.events.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.photo_count}</td>
                <td>{formatBytes(e.storage_used_bytes)}</td>
                <td>{new Date(e.created_at).toLocaleDateString()}</td>
                <td>{new Date(e.expires_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {client.events.length === 0 && (
              <tr>
                <td colSpan={5} className="hint">No events yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Custom plan limits</h2>
      <form className="card" onSubmit={handleSaveLimits}>
        <p className="subtle">
          Leave a field blank to use the platform default (currently {client.default_event_limit} events /{' '}
          {formatBytes(client.default_storage_limit_bytes)} per event).
        </p>
        <label className="field-label" htmlFor="event-limit">Event limit</label>
        <input
          id="event-limit"
          className="text-input"
          type="number"
          min="1"
          placeholder={String(client.default_event_limit)}
          value={eventLimitInput}
          onChange={(e) => setEventLimitInput(e.target.value)}
        />
        <label className="field-label" htmlFor="storage-limit">Storage limit per event (GB)</label>
        <input
          id="storage-limit"
          className="text-input"
          type="number"
          min="1"
          step="0.1"
          placeholder={String(client.default_storage_limit_bytes / 1e9)}
          value={storageLimitInput}
          onChange={(e) => setStorageLimitInput(e.target.value)}
        />
        <button className="btn" type="submit" disabled={savingLimits} style={{ marginTop: 12 }}>
          {savingLimits ? 'Saving…' : 'Save limits'}
        </button>
        {limitsMessage && <p className="hint">{limitsMessage}</p>}
      </form>

      <div className="card danger-zone">
        <h2 className="section-title" style={{ marginTop: 0 }}>Danger zone</h2>
        <p className="subtle">
          Permanently deletes this client's account, every event they own, and every photo — irreversible. Type
          their email to confirm.
        </p>
        <input
          className="text-input"
          placeholder={client.email}
          value={confirmEmailInput}
          onChange={(e) => setConfirmEmailInput(e.target.value)}
        />
        <button
          className="btn danger-btn"
          type="button"
          onClick={handleDelete}
          disabled={deleting || confirmEmailInput.trim().toLowerCase() !== client.email.toLowerCase()}
          style={{ marginTop: 10 }}
        >
          {deleting ? 'Deleting…' : 'Delete account permanently'}
        </button>
      </div>
    </div>
  )
}
