import { useEffect, useState } from 'react'
import {
  createAdminPlan,
  getAdminPlatformSettings,
  listAdminPlans,
  updateAdminPlan,
  updateAdminPlatformSettings,
} from '../api.js'

const PLAN_TYPES = ['SUBSCRIPTION', 'WALLET']
const DURATION_UNITS = ['DAYS', 'MONTHS', 'YEARS']
const WALLET_TIERS = ['INITIAL', 'TOPUP']

function emptyPlan() {
  return {
    plan_name: '',
    plan_type: 'SUBSCRIPTION',
    price: '',
    duration_value: '1',
    duration_unit: 'MONTHS',
    photo_quota: '',
    wallet_credits: '',
    wallet_tier: 'INITIAL',
  }
}

// MERGE (Studio-Verse Billing & Subscriptions, Phase 14 — unified admin
// console): SUPER_ADMIN-only management of the plan catalog and the
// platform-wide trial/grace defaults. This is the piece of Studio-Verse's
// super-admin console PandaSpot's admin pages never had an equivalent
// for — everything else in Phase 14 was existing PandaSpot admin pages,
// already unified under one sidebar.
export default function AdminPlans() {
  const [plans, setPlans] = useState(null)
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(emptyPlan())
  const [settingsDraft, setSettingsDraft] = useState(null)

  const load = () => {
    listAdminPlans().then(setPlans).catch((e) => setError(e.message))
    getAdminPlatformSettings().then((s) => { setSettings(s); setSettingsDraft(s) }).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createAdminPlan({
        ...draft,
        price: Number(draft.price),
        duration_value: draft.plan_type === 'SUBSCRIPTION' ? Number(draft.duration_value) : undefined,
        duration_unit: draft.plan_type === 'SUBSCRIPTION' ? draft.duration_unit : undefined,
        photo_quota: draft.plan_type === 'SUBSCRIPTION' ? Number(draft.photo_quota) || 0 : undefined,
        wallet_credits: draft.plan_type === 'WALLET' ? Number(draft.wallet_credits) || 0 : undefined,
        wallet_tier: draft.plan_type === 'WALLET' ? draft.wallet_tier : undefined,
      })
      setDraft(emptyPlan())
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleActive = async (plan) => {
    setBusy(true)
    setError('')
    try {
      await updateAdminPlan(plan.id, { is_active: !plan.isActive })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateAdminPlatformSettings({
        trial_duration_days: Number(settingsDraft.trialDurationDays),
        trial_photo_quota: Number(settingsDraft.trialPhotoQuota),
        monthly_grace_days: Number(settingsDraft.monthlyGraceDays),
        yearly_grace_days: Number(settingsDraft.yearlyGraceDays),
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !plans) return <p className="error">{error}</p>
  if (!plans || !settings) return <p className="hint">Loading…</p>

  return (
    <div>
      <h1 className="section-title">Plans & platform settings</h1>
      {error && <p className="error">{error}</p>}

      <div className="card billing-card">
        <div className="guest-link-label">Trial & grace period defaults</div>
        <p className="hint">Applied to every new trial/subscription going forward — doesn't affect subscriptions already in progress.</p>
        <form onSubmit={handleSaveSettings}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <label>
              <div className="field-label">Trial length (days)</div>
              <input className="text-input" type="number" value={settingsDraft.trialDurationDays} onChange={(e) => setSettingsDraft((s) => ({ ...s, trialDurationDays: e.target.value }))} />
            </label>
            <label>
              <div className="field-label">Trial photo quota</div>
              <input className="text-input" type="number" value={settingsDraft.trialPhotoQuota} onChange={(e) => setSettingsDraft((s) => ({ ...s, trialPhotoQuota: e.target.value }))} />
            </label>
            <label>
              <div className="field-label">Monthly-plan grace (days)</div>
              <input className="text-input" type="number" value={settingsDraft.monthlyGraceDays} onChange={(e) => setSettingsDraft((s) => ({ ...s, monthlyGraceDays: e.target.value }))} />
            </label>
            <label>
              <div className="field-label">Yearly-plan grace (days)</div>
              <input className="text-input" type="number" value={settingsDraft.yearlyGraceDays} onChange={(e) => setSettingsDraft((s) => ({ ...s, yearlyGraceDays: e.target.value }))} />
            </label>
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 8 }}>Save</button>
        </form>
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Add a plan</div>
        <form onSubmit={handleCreate}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <input className="text-input" placeholder="Plan name" value={draft.plan_name} onChange={(e) => setDraft((d) => ({ ...d, plan_name: e.target.value }))} />
            <select className="text-input" value={draft.plan_type} onChange={(e) => setDraft((d) => ({ ...d, plan_type: e.target.value }))}>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="text-input" type="number" placeholder="Price" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} style={{ maxWidth: 120 }} />
          </div>

          {draft.plan_type === 'SUBSCRIPTION' ? (
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <input className="text-input" type="number" placeholder="Duration value" value={draft.duration_value} onChange={(e) => setDraft((d) => ({ ...d, duration_value: e.target.value }))} style={{ maxWidth: 130 }} />
              <select className="text-input" value={draft.duration_unit} onChange={(e) => setDraft((d) => ({ ...d, duration_unit: e.target.value }))}>
                {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className="text-input" type="number" placeholder="Photo quota" value={draft.photo_quota} onChange={(e) => setDraft((d) => ({ ...d, photo_quota: e.target.value }))} style={{ maxWidth: 150 }} />
            </div>
          ) : (
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <input className="text-input" type="number" placeholder="Wallet credits" value={draft.wallet_credits} onChange={(e) => setDraft((d) => ({ ...d, wallet_credits: e.target.value }))} style={{ maxWidth: 150 }} />
              <select className="text-input" value={draft.wallet_tier} onChange={(e) => setDraft((d) => ({ ...d, wallet_tier: e.target.value }))}>
                {WALLET_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <button className="btn" type="submit" disabled={busy || !draft.plan_name.trim() || !draft.price} style={{ marginTop: 8 }}>
            Create plan
          </button>
        </form>
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Existing plans</div>
        <ul className="team-list">
          {plans.map((p) => (
            <li key={p.id} className="team-list-item">
              <span>
                {p.planName} <span className="hint">({p.planType}, ₹{Number(p.price)}{!p.isActive && ' — inactive'})</span>
              </span>
              <button className="btn secondary" type="button" disabled={busy} onClick={() => handleToggleActive(p)}>
                {p.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </li>
          ))}
          {plans.length === 0 && <li className="hint">No plans yet — create one above.</li>}
        </ul>
      </div>
    </div>
  )
}
