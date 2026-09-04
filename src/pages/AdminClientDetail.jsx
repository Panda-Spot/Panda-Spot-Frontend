import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, Wallet } from 'lucide-react'
import { useConfirm } from '../confirm.jsx'
import {
  deleteAdminUser,
  getAdminUser,
  grantAdminUserFreeAccess,
  listAdminPlans,
  resetAdminUserWorkspace,
  resendAdminUserVerification,
  revokeAdminUserFreeAccess,
  setAdminUserBranding,
  setAdminUserLimits,
  setAdminUserPlan,
  suspendAdminUser,
  unsuspendAdminUser,
  verifyAdminUser,
  wipeAdminUserStorage,
  listAdminUserPhotos,
  fileUrl,
} from '../api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'
import Lightbox from '../components/Lightbox.jsx'
import GalleryMedia from '../components/GalleryMedia.jsx'
import { isVideoFile } from '../utils/media.js'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

// Deep-dive view on one studio: profile + actions, watermark override,
// subscription/wallet summary with plan reassignment, full plan-change
// history, and that studio's own events table — the cross-tenant
// drill-down.
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
  const [resetConfirmInput, setResetConfirmInput] = useState('')
  const [resettingWorkspace, setResettingWorkspace] = useState(false)
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
  const [userPhotos, setUserPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [photoFilter, setPhotoFilter] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState(null)

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

    setLoadingPhotos(true)
    listAdminUserPhotos(userId)
      .then(setUserPhotos)
      .catch((e) => console.error('Failed to load user photos for admin:', e))
      .finally(() => setLoadingPhotos(false))
  }, [userId])

  useEffect(load, [load])

  useEffect(() => {
    listAdminPlans()
      .then((items) => setPlans(items.filter((p) => p.planType === 'SUBSCRIPTION' && p.isActive)))
      .catch(() => setPlans([]))
  }, [])

  const handleToggleSuspend = async () => {
    if (!client.is_suspended) {
      const ok = await confirm(
        `Suspend ${client.email}? They and their clients lose access immediately; nothing is deleted.`,
        { title: 'Suspend studio?', confirmLabel: 'Suspend' }
      )
      if (!ok) return
    }
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
    const ok = await confirm(
      `Force-assign this plan to ${client.email}? Their current subscription row is replaced.`,
      { title: 'Reassign plan?', confirmLabel: 'Reassign', danger: false }
    )
    if (!ok) return
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

  const handleResetWorkspace = async () => {
    const confirmed = await confirm(
      `Delete every event, photo, client access, support ticket, billing document, receipt, and service for ${client.email}? The studio account and subscription history stay.`,
      { title: 'Full studio reset?', confirmLabel: 'Reset studio' }
    )
    if (!confirmed) return
    setResettingWorkspace(true)
    setError('')
    setLifecycleMessage('')
    try {
      const result = await resetAdminUserWorkspace(userId, resetConfirmInput)
      setLifecycleMessage(`Studio reset complete. Removed ${result.deleted_event_count} event${result.deleted_event_count === 1 ? '' : 's'} and ${result.deleted_support_ticket_count} support ticket${result.deleted_support_ticket_count === 1 ? '' : 's'}.`)
      setResetConfirmInput('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setResettingWorkspace(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm(
      `Permanently delete ${client.email}'s account and every event they own? This can't be undone.`,
      { title: 'Delete this studio?', confirmLabel: 'Delete' }
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
    <div className="space-y-6">
      <div>
        <Link className="back-link" to="/admin/clients">&larr; All studios</Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <Building2 size={22} className="text-gold-500" />
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{client.name}</h1>
            <p className="hint">{client.email}</p>
          </div>
          {client.is_suspended ? <Badge variant="error">Suspended</Badge> : <Badge variant="success">Active</Badge>}
          <Badge>{client.role}</Badge>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {lifecycleMessage && <p className="hint">{lifecycleMessage}</p>}

      <GlassCard hover={false}>
        <p className="hint">
          Joined {new Date(client.created_at).toLocaleDateString()} · Email {client.email_verified ? 'verified' : 'not verified'}
          {client.studio_name && <> · Studio “{client.studio_name}”</>}
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {client.is_suspended ? (
            <GoldButton variant="outline" type="button" onClick={handleToggleSuspend} loading={togglingSuspend}>
              Reactivate account
            </GoldButton>
          ) : (
            <GoldButton variant="danger" type="button" onClick={handleToggleSuspend} loading={togglingSuspend}>
              Suspend account
            </GoldButton>
          )}
          {!client.email_verified && (
            <>
              <GoldButton variant="outline" type="button" onClick={handleResendVerification} loading={resendingVerification}>
                Resend verification email
              </GoldButton>
              <GoldButton variant="outline" type="button" onClick={handleForceVerify} loading={forceVerifying}>
                Mark verified
              </GoldButton>
            </>
          )}
          <Link to="/settings">
            <GoldButton variant="ghost">Unlock / reset via Settings</GoldButton>
          </Link>
        </div>
        {verifyActionMessage && <p className="hint">{verifyActionMessage}</p>}
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-4">
        <GlassCard hover={false}>
          <div className="guest-link-label flex items-center gap-2">
            <Wallet size={14} className="text-gold-500" /> Wallet & AI usage
          </div>
          <p className="subtle">Balance: <strong>{client.wallet_balance ?? 0} credits</strong></p>
          <p className="hint">AI-indexed photos: {client.ai_indexed_photo_count ?? 0}</p>
        </GlassCard>

        {client.role === 'ADMIN' && (
          <GlassCard hover={false}>
            <div className="guest-link-label">Client gallery watermark</div>
            <p className="hint">Overlay strength on this studio&apos;s protected client galleries.</p>
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
                style={{ background: `linear-gradient(135deg, ${client.brand_color || '#D97706'} 0%, #263238 55%, #f2c94c 100%)` }}
              />
            </div>
            <GoldButton type="button" onClick={handleSaveWatermark} loading={savingWatermark}>
              Save watermark intensity
            </GoldButton>
            {watermarkMessage && <p className="hint">{watermarkMessage}</p>}
          </GlassCard>
        )}
      </div>

      {/* Informational only — see server/src/lib/subscriptionAccess.js's
          safety note on why this isn't enforced against uploads yet. */}
      <GlassCard hover={false}>
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
              <GoldButton variant="outline" type="button" onClick={handleSetPlan} loading={savingPlan} disabled={!planId}>
                Force assign plan
              </GoldButton>
              {client.subscription?.is_free_grant && (
                <GoldButton variant="danger" type="button" onClick={handleRevokeFreeAccess} loading={revokingGrant}>
                  Revoke free access
                </GoldButton>
              )}
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <select className="text-input" value={grantPlanId} onChange={(e) => setGrantPlanId(e.target.value)}>
                <option value="">Free access plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.planName}</option>)}
              </select>
              <input className="text-input" type="date" value={grantUntil} onChange={(e) => setGrantUntil(e.target.value)} />
              <GoldButton type="button" onClick={handleGrantFreeAccess} loading={granting} disabled={!grantPlanId || !grantUntil}>
                Grant free access
              </GoldButton>
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
      </GlassCard>

      <div>
        <h2 className="section-title">Events ({client.events.length})</h2>        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Photos</th>
                <th>Status</th>
                <th>Storage</th>
                <th>Created</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {client.events.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.photo_count}</td>
                  <td>{e.archived_at ? <Badge variant="gold">Archived</Badge> : <Badge variant="success">Active</Badge>}</td>
                  <td>{formatBytes(e.storage_used_bytes)}</td>
                  <td>{new Date(e.created_at).toLocaleDateString()}</td>
                  <td>{new Date(e.expires_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admin/events/${e.id}`}>
                      <GoldButton size="sm" variant="outline">View</GoldButton>
                    </Link>
                  </td>
                </tr>
              ))}
              {client.events.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">No events yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {client.collaborates_on?.length > 0 && (
        <div>
          <h2 className="section-title">Collaborates on</h2>
          <ul className="team-list">
            {client.collaborates_on.map((c) => (
              <li key={c.event_id} className="team-list-item">
                <span>{c.event_name} <span className="hint">(owner: {c.owner_email})</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h2 className="section-title">Client & Collaborator Photos ({userPhotos.length})</h2>
      <p className="subtle">All photos across events owned by or shared with this studio — including client picks and collaborator captures.</p>
      {loadingPhotos ? (
        <p className="hint">Loading photos…</p>
      ) : userPhotos.length === 0 ? (
        <p className="hint">No photos found across this account's events.</p>
      ) : (
        <>
          <div className="row source-filter-row" style={{ marginTop: 8 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'upload', label: 'Uploaded' },
              { key: 'shoots', label: 'PandaShoots' },
              { key: 'drive_import', label: 'Drive import' },
              { key: 'guest', label: 'Client / Guest uploads' },
            ].map((opt) => {
              const count = opt.key === 'all'
                ? userPhotos.length
                : userPhotos.filter((p) => (p.source || 'upload') === opt.key).length
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={photoFilter === opt.key ? 'upload-tab active' : 'upload-tab'}
                  onClick={() => setPhotoFilter(opt.key)}
                >
                  {opt.label} ({count})
                </button>
              )
            })}
          </div>

          {(() => {
            const filtered = userPhotos.filter((p) => photoFilter === 'all' || (p.source || 'upload') === photoFilter)
            // Guest-style Lightbox is stills-only — videos play inline.
            const viewable = filtered.filter((p) => !isVideoFile(p.filename))
            const openIndex = (photoId) => viewable.findIndex((p) => p.photo_id === photoId)
            if (filtered.length === 0) {
              return (
                <p className="hint" style={{ padding: '24px 12px', textAlign: 'center', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  No photos found under the selected filter.
                </p>
              )
            }
            return (
              <div className="photo-grid" style={{ marginTop: 12 }}>
                {filtered.map((p) => (
                  <div className="photo-card" key={p.photo_id}>
                    <GalleryMedia
                      src={fileUrl(p.thumbnail_url || p.url)}
                      filename={p.filename}
                      style={{ cursor: isVideoFile(p.filename) ? undefined : 'pointer', height: 180, objectFit: 'cover', width: '100%' }}
                      onClick={isVideoFile(p.filename) ? undefined : () => setLightboxIndex(openIndex(p.photo_id))}
                    />
                    <div className="meta">
                      <span style={{ fontSize: 11, fontWeight: 600 }}>
                        {isVideoFile(p.filename) ? 'Video' : p.source === 'guest' ? 'Client upload' : p.source === 'shoots' ? 'PandaShoots' : p.source === 'drive_import' ? 'Drive' : 'Upload'}
                      </span>
                      <span>
                        {!isVideoFile(p.filename) && <>{p.face_count} face{p.face_count === 1 ? '' : 's'}</>}
                        {p.archived_at && <span className="hint"> · archived</span>}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #666)', padding: '2px 8px' }}>
                      {p.event_name && <span>{p.event_name}</span>}
                      {p.client_favourites_count > 0 && <span> · ★ {p.client_favourites_count} client pick</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {lightboxIndex !== null && (
            <Lightbox
              matches={userPhotos
                .filter((p) => photoFilter === 'all' || (p.source || 'upload') === photoFilter)
                .filter((p) => !isVideoFile(p.filename))
                .map((p) => ({
                  photo_id: p.photo_id,
                  filename: p.filename,
                  url: p.url,
                  thumbnail_url: p.thumbnail_url,
                }))}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onIndexChange={setLightboxIndex}
            />
          )}
        </>
      )}

      <GlassCard hover={false}>
        <h2 className="section-title">Custom plan limits</h2>
        <form onSubmit={handleSaveLimits}>
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
          <GoldButton type="submit" loading={savingLimits} style={{ marginTop: 12 }}>
            Save limits
          </GoldButton>
          {limitsMessage && <p className="hint">{limitsMessage}</p>}
        </form>
      </GlassCard>

      <GlassCard hover={false}>
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
            <GoldButton
              variant="danger"
              type="button"
              onClick={handleWipeStorage}
              loading={wipingStorage}
              disabled={storageConfirmInput.trim().toLowerCase() !== client.email.toLowerCase()}
              style={{ marginTop: 10 }}
            >
              Wipe studio storage
            </GoldButton>
            <p className="subtle" style={{ marginTop: 16 }}>
              Full reset removes every event, client/gallery access, support ticket, billing document, receipt, and studio service. The account, login, subscription, and wallet history stay.
            </p>
            <input
              className="text-input"
              placeholder={client.email}
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
            />
            <GoldButton
              variant="danger"
              type="button"
              onClick={handleResetWorkspace}
              loading={resettingWorkspace}
              disabled={resetConfirmInput.trim().toLowerCase() !== client.email.toLowerCase()}
              style={{ marginTop: 10 }}
            >
              Full studio reset
            </GoldButton>
          </>
        )}
        <p className="subtle">
          Permanently deletes this studio&apos;s account, every event they own, and every photo — irreversible. Type
          their email to confirm.
        </p>
        <input
          className="text-input"
          placeholder={client.email}
          value={confirmEmailInput}
          onChange={(e) => setConfirmEmailInput(e.target.value)}
        />
        <GoldButton
          variant="danger"
          type="button"
          onClick={handleDelete}
          loading={deleting}
          disabled={confirmEmailInput.trim().toLowerCase() !== client.email.toLowerCase()}
          style={{ marginTop: 10 }}
        >
          Delete account permanently
        </GoldButton>
      </GlassCard>
    </div>
  )
}
