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
    ai_credit_cost_per_photo: '',
    includes_ai_media: false,
    special_access_cutoff_date: '',
    display_order: '0',
  }
}

function dateInputValue(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
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
  const [planDrafts, setPlanDrafts] = useState({})

  const load = () => {
    listAdminPlans()
      .then((items) => {
        setPlans(items)
        setPlanDrafts(Object.fromEntries(items.map((p) => [p.id, {
          plan_name: p.planName,
          price: String(p.price ?? ''),
          duration_value: p.durationValue != null ? String(p.durationValue) : '',
          duration_unit: p.durationUnit || 'MONTHS',
          photo_quota: p.photoQuota != null ? String(p.photoQuota) : '',
          wallet_credits: p.walletCredits != null ? String(p.walletCredits) : '',
          wallet_tier: p.walletTier || 'INITIAL',
          ai_credit_cost_per_photo: p.aiCreditCostPerPhoto != null ? String(p.aiCreditCostPerPhoto) : '',
          includes_ai_media: !!p.includesAiMedia,
          special_access_cutoff_date: dateInputValue(p.specialAccessCutoffDate),
          display_order: String(p.displayOrder ?? 0),
        }])))
      })
      .catch((e) => setError(e.message))
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
        ai_credit_cost_per_photo: draft.plan_type === 'WALLET' && draft.ai_credit_cost_per_photo !== '' ? Number(draft.ai_credit_cost_per_photo) : undefined,
        includes_ai_media: draft.plan_type === 'SUBSCRIPTION' ? !!draft.includes_ai_media : false,
        special_access_cutoff_date: draft.special_access_cutoff_date || null,
        display_order: Number(draft.display_order) || 0,
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

  const handleSavePlan = async (plan) => {
    const d = planDrafts[plan.id]
    setBusy(true)
    setError('')
    try {
      await updateAdminPlan(plan.id, {
        plan_name: d.plan_name,
        price: Number(d.price),
        duration_value: plan.planType === 'SUBSCRIPTION' ? Number(d.duration_value) : null,
        duration_unit: plan.planType === 'SUBSCRIPTION' ? d.duration_unit : null,
        photo_quota: plan.planType === 'SUBSCRIPTION' ? Number(d.photo_quota) || 0 : null,
        wallet_credits: plan.planType === 'WALLET' ? Number(d.wallet_credits) || 0 : null,
        wallet_tier: plan.planType === 'WALLET' ? d.wallet_tier : null,
        ai_credit_cost_per_photo: plan.planType === 'WALLET' && d.ai_credit_cost_per_photo !== '' ? Number(d.ai_credit_cost_per_photo) : null,
        includes_ai_media: plan.planType === 'SUBSCRIPTION' ? !!d.includes_ai_media : false,
        special_access_cutoff_date: d.special_access_cutoff_date || null,
        display_order: Number(d.display_order) || 0,
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const updatePlanDraft = (id, patch) => {
    setPlanDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
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
            <input className="text-input" type="number" placeholder="Display order" value={draft.display_order} onChange={(e) => setDraft((d) => ({ ...d, display_order: e.target.value }))} style={{ maxWidth: 140 }} />
          </div>

          {draft.plan_type === 'SUBSCRIPTION' ? (
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <input className="text-input" type="number" placeholder="Duration value" value={draft.duration_value} onChange={(e) => setDraft((d) => ({ ...d, duration_value: e.target.value }))} style={{ maxWidth: 130 }} />
              <select className="text-input" value={draft.duration_unit} onChange={(e) => setDraft((d) => ({ ...d, duration_unit: e.target.value }))}>
                {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className="text-input" type="number" placeholder="Photo quota" value={draft.photo_quota} onChange={(e) => setDraft((d) => ({ ...d, photo_quota: e.target.value }))} style={{ maxWidth: 150 }} />
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={draft.includes_ai_media} onChange={(e) => setDraft((d) => ({ ...d, includes_ai_media: e.target.checked }))} />
                AI media
              </label>
            </div>
          ) : (
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <input className="text-input" type="number" placeholder="Wallet credits" value={draft.wallet_credits} onChange={(e) => setDraft((d) => ({ ...d, wallet_credits: e.target.value }))} style={{ maxWidth: 150 }} />
              <input className="text-input" type="number" placeholder="AI cost/photo" value={draft.ai_credit_cost_per_photo} onChange={(e) => setDraft((d) => ({ ...d, ai_credit_cost_per_photo: e.target.value }))} style={{ maxWidth: 150 }} />
              <select className="text-input" value={draft.wallet_tier} onChange={(e) => setDraft((d) => ({ ...d, wallet_tier: e.target.value }))}>
                {WALLET_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8, alignItems: 'center' }}>
            <label className="field-label" htmlFor="special-cutoff">Special access cutoff</label>
            <input id="special-cutoff" className="text-input" type="date" value={draft.special_access_cutoff_date} onChange={(e) => setDraft((d) => ({ ...d, special_access_cutoff_date: e.target.value }))} />
            <span className="hint">Only studios created before this date can select the plan. Blank means public.</span>
          </div>

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
              <div style={{ flex: 1 }}>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <input className="text-input" value={planDrafts[p.id]?.plan_name || ''} onChange={(e) => updatePlanDraft(p.id, { plan_name: e.target.value })} style={{ maxWidth: 220 }} />
                  <input className="text-input" type="number" value={planDrafts[p.id]?.price || ''} onChange={(e) => updatePlanDraft(p.id, { price: e.target.value })} style={{ maxWidth: 110 }} />
                  <input className="text-input" type="number" value={planDrafts[p.id]?.display_order || '0'} onChange={(e) => updatePlanDraft(p.id, { display_order: e.target.value })} style={{ maxWidth: 90 }} />
                  <input className="text-input" type="date" value={planDrafts[p.id]?.special_access_cutoff_date || ''} onChange={(e) => updatePlanDraft(p.id, { special_access_cutoff_date: e.target.value })} />
                </div>
                {p.planType === 'SUBSCRIPTION' ? (
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <input className="text-input" type="number" value={planDrafts[p.id]?.duration_value || ''} onChange={(e) => updatePlanDraft(p.id, { duration_value: e.target.value })} style={{ maxWidth: 110 }} />
                    <select className="text-input" value={planDrafts[p.id]?.duration_unit || 'MONTHS'} onChange={(e) => updatePlanDraft(p.id, { duration_unit: e.target.value })}>
                      {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input className="text-input" type="number" value={planDrafts[p.id]?.photo_quota || ''} onChange={(e) => updatePlanDraft(p.id, { photo_quota: e.target.value })} style={{ maxWidth: 130 }} />
                    <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!!planDrafts[p.id]?.includes_ai_media} onChange={(e) => updatePlanDraft(p.id, { includes_ai_media: e.target.checked })} />
                      AI media
                    </label>
                  </div>
                ) : (
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <input className="text-input" type="number" value={planDrafts[p.id]?.wallet_credits || ''} onChange={(e) => updatePlanDraft(p.id, { wallet_credits: e.target.value })} style={{ maxWidth: 130 }} />
                    <input className="text-input" type="number" value={planDrafts[p.id]?.ai_credit_cost_per_photo || ''} onChange={(e) => updatePlanDraft(p.id, { ai_credit_cost_per_photo: e.target.value })} style={{ maxWidth: 130 }} />
                    <select className="text-input" value={planDrafts[p.id]?.wallet_tier || 'INITIAL'} onChange={(e) => updatePlanDraft(p.id, { wallet_tier: e.target.value })}>
                      {WALLET_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                <span className="hint">
                  {p.planType} · {p.specialAccessCutoffDate ? `special before ${dateInputValue(p.specialAccessCutoffDate)}` : 'public'}{!p.isActive && ' · inactive'}
                </span>
              </div>
              <span className="row">
                <button className="btn secondary" type="button" disabled={busy} onClick={() => handleSavePlan(p)}>Save</button>
                <button className="btn secondary" type="button" disabled={busy} onClick={() => handleToggleActive(p)}>
                  {p.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              </span>
            </li>
          ))}
          {plans.length === 0 && <li className="hint">No plans yet — create one above.</li>}
        </ul>
      </div>
    </div>
  )
}
