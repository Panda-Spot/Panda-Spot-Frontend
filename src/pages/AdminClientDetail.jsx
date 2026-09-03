import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useConfirm } from '../confirm.jsx'
import {
  deleteAdminUser,
  getAdminUser,
  grantAdminUserFreeAccess,
  listAdminPlans,
  resendAdminUserVerification,
  revokeAdminUserFreeAccess,
  setAdminUserBranding,
  setAdminUserLimits,
  setAdminUserPlan,
  suspendAdminUser,
  unsuspendAdminUser,
  verifyAdminUser,
  wipeAdminUserStorage,
} from '../api.js'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

export default function AdminClientDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [client, setClient] = useState(null)
  const [plans, setPlans] = useState([])
  const [error, setError] = useState('')
  const [lifecycleMessage, setLifecycleMessage] = useState('')
  const [togglingSuspend, setTogglingSuspend] = useState(false)
  const [planId, setPlanId] = useState('')
  const [grantPlanId, setGrantPlanId] = useState('')
  const [grantUntil, setGrantUntil] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)
  const [granting, setGranting] = useState(false)
  const [revokingGrant, setRevokingGrant] = useState(false)
  const [storageConfirmInput, setStorageConfirmInput] = useState('')
  const [wipingStorage, setWipingStorage] = useState(false)
  const [eventLimitInput, setEventLimitInput] = useState('')
  const [storageLimitInput, setStorageLimitInput] = useState('')
  const [retentionDaysInput, setRetentionDaysInput] = useState('')
  const [savingLimits, setSavingLimits] = useState(false)
  const [limitsMessage, setLimitsMessage] = useState('')
  const [watermarkIntensity, setWatermarkIntensity] = useState(0.75)
  const [savingWatermark, setSavingWatermark] = useState(false)
  const [watermarkMessage, setWatermarkMessage] = useState('')
  const [confirmEmailInput, setConfirmEmailInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [verifyActionMessage, setVerifyActionMessage] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)
  const [forceVerifying, setForceVerifying] = useState(false)

  const load = useCallback(() => {
    getAdminUser(userId)
      .then((c) => {
        setClient(c)
        setPlanId(c.subscription?.plan_id || '')
        setGrantPlanId('')
        setGrantUntil('')
        setEventLimitInput(c.custom_event_limit != null ? String(c.custom_event_limit) : '')
        setStorageLimitInput(c.custom_storage_limit_bytes != null ? String(c.custom_storage_limit_bytes / 1e9) : '')
        setRetentionDaysInput(c.custom_photo_retention_days != null ? String(c.custom_photo_retention_days) : '')
        setWatermarkIntensity(Number.isFinite(Number(c.watermark_intensity)) ? Number(c.watermark_intensity) : 0.75)
      })
      .catch((e) => setError(e.message))
  }, [userId])

  useEffect(load, [load])

  useEffect(() => {
    listAdminPlans()
      .then((items) => setPlans(items.filter((p) => p.planType === 'SUBSCRIPTION' && p.isActive)))
      .catch(() => setPlans([]))
  }, [])

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
      const photoRetentionDays = retentionDaysInput.trim() === '' ? null : parseInt(retentionDaysInput, 10)
      await setAdminUserLimits(userId, eventLimit, storageLimitBytes, photoRetentionDays)
      setLimitsMessage('Limits updated.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingLimits(false)
    }
  }

  const handleSetPlan = async () => {
    setSavingPlan(true)
    setError('')
    setLifecycleMessage('')
    try {
      await setAdminUserPlan(userId, planId)
      setLifecycleMessage('Plan assigned.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingPlan(false)
    }
  }

  const handleSaveWatermark = async () => {
    setSavingWatermark(true)
    setError('')
    setWatermarkMessage('')
    try {
      const updated = await setAdminUserBranding(userId, watermarkIntensity)
      setWatermarkIntensity(Number.isFinite(Number(updated.watermark_intensity)) ? Number(updated.watermark_intensity) : 0.75)
      setWatermarkMessage('Watermark intensity updated.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingWatermark(false)
    }
  }

  const handleGrantFreeAccess = async () => {
    setGranting(true)
    setError('')
    setLifecycleMessage('')
    try {
      await grantAdminUserFreeAccess(userId, grantPlanId, grantUntil)
      setLifecycleMessage('Free access granted.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setGranting(false)
    }
  }

  const handleRevokeFreeAccess = async () => {
    const confirmed = await confirm(
      `Revoke free access for ${client.email}? Their granted plan will be cancelled immediately.`,
      { title: 'Revoke free access?', confirmLabel: 'Revoke' }
    )
    if (!confirmed) return
    setRevokingGrant(true)
    setError('')
    setLifecycleMessage('')
    try {
      await revokeAdminUserFreeAccess(userId)
      setLifecycleMessage('Free access revoked.')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setRevokingGrant(false)
    }
  }

  const handleWipeStorage = async () => {
    const confirmed = await confirm(
      `Delete all photos, thumbnails, faces, guest searches, reactions, comments, and prepared ZIPs for ${client.email}? The studio account and event shells stay.`,
      { title: 'Wipe studio storage?', confirmLabel: 'Wipe storage' }
    )
    if (!confirmed) return
    setWipingStorage(true)
    setError('')
    setLifecycleMessage('')
    try {
      const result = await wipeAdminUserStorage(userId, storageConfirmInput)
      setLifecycleMessage(`Storage wiped. Removed ${result.deleted_photo_count} photo${result.deleted_photo_count === 1 ? '' : 's'} across ${result.event_count} event${result.event_count === 1 ? '' : 's'}.`)
      setStorageConfirmInput('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setWipingStorage(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm(
      `Permanently delete ${client.email}'s account and every event they own? This can't be undone.`,
      { title: 'Delete this client?', confirmLabel: 'Delete' }
    )
    if (!confirmed) return
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
      {lifecycleMessage && <p className="hint">{lifecycleMessage}</p>}

      <div className="card">
        <p className="hint">
          Joined {new Date(client.created_at).toLocaleDateString()} · {client.role} · Email {client.email_verified ? 'verified' : 'not verified'}
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

      {client.role === 'ADMIN' && (
        <div className="card">
          <div className="guest-link-label">Client gallery watermark</div>
          <p className="hint">
            Controls the overlay strength shown on this studio's protected client galleries.
          </p>
          <label className="field-label" htmlFor="admin-watermark-intensity">Watermark intensity</label>
          <div className="watermark-control">
            <input
              id="admin-watermark-intensity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={watermarkIntensity}
              onChange={(e) => {
                setWatermarkIntensity(Number(e.target.value))
                setWatermarkMessage('')
              }}
            />
            <span className="hint">{Math.round(watermarkIntensity * 100)}%</span>
          </div>
          <div
            className="watermark-preview protected-photo-frame"
            data-watermark={client.studio_name || client.name || 'PandaSpot'}
            style={{ '--watermark-opacity': watermarkIntensity }}
          >
            <div
              className="watermark-preview-image"
              style={{ background: `linear-gradient(135deg, ${client.brand_color || '#0e8a8a'} 0%, #263238 55%, #f2c94c 100%)` }}
            />
          </div>
          <button className="btn" type="button" onClick={handleSaveWatermark} disabled={savingWatermark}>
            {savingWatermark ? 'Saving…' : 'Save watermark intensity'}
          </button>
          {watermarkMessage && <p className="hint">{watermarkMessage}</p>}
        </div>
      )}

      {/* MERGE (Studio-Verse Billing & Subscriptions, Phase 14): informational
          only — see server/src/lib/subscriptionAccess.js's safety note on
          why this isn't enforced against uploads yet. */}
      <div className="card">
        <div className="guest-link-label">Subscription</div>
        {client.subscription ? (
          <p className="hint">
            {client.subscription.plan_name || 'Trial'} — {client.subscription.status} · {client.subscription.photo_quota_used} / {client.subscription.photo_quota_total} photos
            {client.subscription.expires_at && ` · expires ${new Date(client.subscription.expires_at).toLocaleDateString()}`}
            {client.subscription.is_free_grant && ' · free grant'}
          </p>
        ) : (
          <p className="hint">No subscription.</p>
        )}
        {client.role === 'ADMIN' && (
          <>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <select className="text-input" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Choose plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.planName}</option>)}
              </select>
              <button className="btn secondary" type="button" onClick={handleSetPlan} disabled={savingPlan || !planId}>
                {savingPlan ? 'Assigning…' : 'Force assign plan'}
              </button>
              {client.subscription?.is_free_grant && (
                <button className="btn danger-btn" type="button" onClick={handleRevokeFreeAccess} disabled={revokingGrant}>
                  {revokingGrant ? 'Revoking…' : 'Revoke free access'}
                </button>
              )}
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <select className="text-input" value={grantPlanId} onChange={(e) => setGrantPlanId(e.target.value)}>
                <option value="">Free access plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.planName}</option>)}
              </select>
              <input className="text-input" type="date" value={grantUntil} onChange={(e) => setGrantUntil(e.target.value)} />
              <button className="btn" type="button" onClick={handleGrantFreeAccess} disabled={granting || !grantPlanId || !grantUntil}>
                {granting ? 'Granting…' : 'Grant free access'}
              </button>
            </div>
          </>
        )}
        {client.subscription_history?.length > 0 && (
          <div className="data-table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Change</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Quota</th>
                  <th>Starts</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {client.subscription_history.map((s) => (
                  <tr key={s.id}>
                    <td>{s.change_type || '—'}</td>
                    <td>{s.plan_name || 'Trial'}</td>
                    <td>{s.status}{s.is_free_grant ? ' · Free' : ''}</td>
                    <td>{s.photo_quota_used} / {s.photo_quota_total}</td>
                    <td>{new Date(s.starts_at).toLocaleDateString()}</td>
                    <td>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          {formatBytes(client.default_storage_limit_bytes)} per event /{' '}
          {client.default_photo_retention_days} day originals).
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
        <label className="field-label" htmlFor="retention-days">Photo retention (days)</label>
        <input
          id="retention-days"
          className="text-input"
          type="number"
          min="1"
          placeholder={String(client.default_photo_retention_days)}
          value={retentionDaysInput}
          onChange={(e) => setRetentionDaysInput(e.target.value)}
        />
        <p className="hint" style={{ marginTop: 4 }}>
          Full-resolution originals are removed after this many days — thumbnails and face search keep working forever.
        </p>
        <button className="btn" type="submit" disabled={savingLimits} style={{ marginTop: 12 }}>
          {savingLimits ? 'Saving…' : 'Save limits'}
        </button>
        {limitsMessage && <p className="hint">{limitsMessage}</p>}
      </form>

      <div className="card danger-zone">
        <h2 className="section-title" style={{ marginTop: 0 }}>Danger zone</h2>
        {client.role === 'ADMIN' && (
          <>
            <p className="subtle">
              Wipes every photo, thumbnail, face, search, reaction, comment, and prepared download for this studio. The studio account, events, clients, and subscription history stay.
            </p>
            <input
              className="text-input"
              placeholder={client.email}
              value={storageConfirmInput}
              onChange={(e) => setStorageConfirmInput(e.target.value)}
            />
            <button
              className="btn danger-btn"
              type="button"
              onClick={handleWipeStorage}
              disabled={wipingStorage || storageConfirmInput.trim().toLowerCase() !== client.email.toLowerCase()}
              style={{ marginTop: 10 }}
            >
              {wipingStorage ? 'Wiping…' : 'Wipe studio storage'}
            </button>
          </>
        )}
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
