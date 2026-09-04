import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Wallet as WalletIcon } from 'lucide-react'
import {
  activateTrial,
  downgradeSubscription,
  getMySubscription,
  listEvents,
  listSubscriptionHistory,
  listSubscriptionPlans,
  listWalletTransactions,
  rechargeWallet,
  subscribeToPlan,
  upgradeSubscription,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'

const FREE_EVENT_LIMIT = 15

// Subscription quota gates are wired into uploads/imports/Shoots. Super
// Admin can temporarily keep global free access enabled from the platform
// settings page.
export default function Billing() {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [eventCount, setEventCount] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [freeAccessEnabled, setFreeAccessEnabled] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [aiIndexedPhotoCount, setAiIndexedPhotoCount] = useState(0)
  const [plans, setPlans] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    listEvents().then((events) => setEventCount(events.length)).catch(() => setEventCount(null))
    getMySubscription()
      .then((data) => {
        setSubscription(data.subscription)
        setWalletBalance(data.wallet_balance)
        setAiIndexedPhotoCount(data.ai_indexed_photo_count || 0)
        setFreeAccessEnabled(!!data.free_access_enabled)
      })
      .catch(() => {})
    listSubscriptionPlans().then(setPlans).catch(() => setPlans([]))
    listWalletTransactions().then(setTransactions).catch(() => setTransactions([]))
    listSubscriptionHistory().then(setHistory).catch(() => setHistory([]))
  }

  useEffect(load, [])

  const withBusy = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      load()
    } catch (e) {
      setError(e.message)
      showToast(e.message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  // Downgrading forfeits the price difference with no refund (enforced
  // server-side) — say so explicitly before the irreversible call.
  const handleDowngrade = async (planId, planName) => {
    const ok = await confirm(
      `Downgrade to "${planName}"? The price difference is forfeited — there is no refund, and your quota ceiling drops immediately.`,
      { title: 'Downgrade plan?', confirmLabel: 'Downgrade', danger: true }
    )
    if (!ok) return
    withBusy(() => downgradeSubscription(planId))
  }

  const subscriptionPlans = (plans || []).filter((p) => p.planType === 'SUBSCRIPTION')
  const walletPlans = (plans || []).filter((p) => p.planType === 'WALLET')
  const hasWallet = transactions.length > 0 || walletBalance > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <CreditCard size={22} className="text-gold-500" /> Billing
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Your SaaS subscription, wallet credits, and client invoicing.
        </p>
      </div>

      {freeAccessEnabled && (
        <p className="hint">Platform free access is currently enabled. Upload quota tracking is wired but not enforced until the platform turns free access off.</p>
      )}

      <GlassCard hover={false}>
        <div className="guest-link-label">Free plan (event limits)</div>
        <ul className="billing-limits">
          <li>Up to {FREE_EVENT_LIMIT} events per account</li>
          <li>10GB of photo storage per event</li>
        </ul>
        {eventCount != null && (
          <>
            <div className="meter">
              <div
                className="meter-fill"
                style={{ width: `${Math.min(100, Math.round((eventCount / FREE_EVENT_LIMIT) * 100))}%` }}
              />
            </div>
            <div className="meter-labels">
              <span>{eventCount} used</span>
              <span>{FREE_EVENT_LIMIT} limit</span>
            </div>
          </>
        )}
      </GlassCard>

      {error && <p className="error">{error}</p>}

      {subscription?.status === 'GRACE' && (
        <div className="px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#FBBF24' }}>
              Uploads are disabled — grace period
              {subscription.grace_ends_at && (
                <> ends {new Date(subscription.grace_ends_at).toLocaleDateString()} ({Math.max(0, Math.ceil((new Date(subscription.grace_ends_at) - new Date()) / 86400000))} day(s) left)</>
              )}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Your events stay visible, but new uploads are blocked. Renew below before the grace window lapses or content is purged.
            </p>
          </div>
        </div>
      )}
      {subscription?.status === 'EXPIRED' && (
        <div className="px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#F87171' }}>Subscription expired</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Subscribe to a plan below to restore uploads.
          </p>
        </div>
      )}

      <GlassCard hover={false}>
        <div className="guest-link-label">Subscription</div>
        {subscription ? (
          <>
            <p className="subtle">
              <strong>{subscription.plan_name || 'Trial'}</strong>{' '}
              <Badge variant={subscription.status === 'TRIAL' || subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'GRACE' ? 'gold' : 'error'}>
                {subscription.status}
              </Badge>
              {subscription.expires_at && ` · renews/expires ${new Date(subscription.expires_at).toLocaleDateString()}`}
            </p>
            <p className="hint">
              Photo quota: {subscription.photo_quota_used} / {subscription.photo_quota_total}
              {subscription.status === 'GRACE' && subscription.grace_ends_at &&
                ` — in grace period until ${new Date(subscription.grace_ends_at).toLocaleDateString()}`}
            </p>
          </>
        ) : (
          <p className="hint">No subscription yet — start a free trial or subscribe to a plan below.</p>
        )}

        {!subscription && (
          <GoldButton type="button" loading={busy} onClick={() => withBusy(activateTrial)}>
            Start free trial
          </GoldButton>
        )}

        {plans === null ? (
          <p className="hint">Loading plans…</p>
        ) : subscriptionPlans.length === 0 ? (
          <p className="hint">No subscription plans available yet.</p>
        ) : (
          <div className="photo-grid" style={{ marginTop: 12 }}>
            {subscriptionPlans.map((p) => {
              const isCurrent = subscription?.plan_name === p.planName;
              const currentPrice = Number(subscriptionPlans.find((sp) => sp.planName === subscription?.plan_name)?.price ?? 0);
              const priceDiff = Number(p.price) - currentPrice;
              const isHigher = subscription && priceDiff > 0;
              return (
                <div className="photo-card" key={p.id} style={{ padding: 16 }}>
                  <div className="guest-link-label">{p.planName}</div>
                  <p className="hint">₹{Number(p.price)} / {p.durationValue} {p.durationUnit?.toLowerCase()}</p>
                  <p className="hint">{p.photoQuota} photos</p>
                  {isCurrent ? (
                    <Badge variant="gold">Current plan</Badge>
                  ) : subscription && subscription.status !== 'GRACE' && subscription.status !== 'EXPIRED' && subscription.plan_name ? (
                    isHigher ? (
                      <GoldButton size="sm" type="button" disabled={busy} onClick={() => withBusy(() => upgradeSubscription(p.id))}>
                        Upgrade (+₹{priceDiff})
                      </GoldButton>
                    ) : (
                      <GoldButton size="sm" variant="outline" type="button" disabled={busy} onClick={() => handleDowngrade(p.id, p.planName)}>
                        Downgrade
                      </GoldButton>
                    )
                  ) : (
                    <GoldButton size="sm" variant="outline" type="button" disabled={busy} onClick={() => withBusy(() => subscribeToPlan(p.id))}>
                      Subscribe
                    </GoldButton>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label="Wallet balance" value={walletBalance} icon={WalletIcon} />
        <StatCard label="AI-indexed photos" value={aiIndexedPhotoCount} icon={CreditCard} />
      </div>

      <GlassCard hover={false}>
        <div className="guest-link-label">Wallet</div>
        <p className="subtle">Balance: <strong>{walletBalance} credits</strong></p>
        <p className="hint">
          AI indexed photos: {aiIndexedPhotoCount}. This counts every photo that has actually been face-extracted, even if it is later hidden from Guest Face Search.
        </p>
        {plans !== null && walletPlans.length > 0 && (
          <div className="photo-grid" style={{ marginTop: 12 }}>
            {walletPlans.map((p) => (
              <div className="photo-card" key={p.id} style={{ padding: 16 }}>
                <div className="guest-link-label">{p.planName}</div>
                <p className="hint">₹{Number(p.price)} for {p.walletCredits} credits</p>
                <GoldButton
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={busy || (p.walletTier === 'INITIAL' && hasWallet) || (p.walletTier === 'TOPUP' && !hasWallet)}
                  onClick={() => withBusy(() => rechargeWallet(p.id))}
                >
                  {p.walletTier === 'INITIAL' ? 'Activate wallet' : 'Top up'}
                </GoldButton>
              </div>
            ))}
          </div>
        )}
        {transactions.length > 0 && (
          <ul className="team-list" style={{ marginTop: 12 }}>
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="team-list-item">
                <span>{t.type} {t.credits > 0 ? `+${t.credits}` : t.credits}</span>
                <span className="hint">{new Date(t.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <div className="guest-link-label">Quotations, bills & payments</div>
        <p className="hint">Create quotations for clients, confirm them into bills, and record payments.</p>
        <Link to="/billing/documents">
          <GoldButton variant="outline">Open Invoicing</GoldButton>
        </Link>
      </GlassCard>

      {history.length > 0 && (
        <GlassCard hover={false}>
          <div className="guest-link-label">Plan history</div>
          <p className="hint">Every subscribe, upgrade, downgrade, trial, and free grant on this account.</p>
          <ul className="team-list" style={{ marginTop: 8 }}>
            {history.map((h) => (
              <li key={h.id} className="team-list-item">
                <span>
                  {h.change_type || '—'} — {h.plan_name || 'Trial'}{' '}
                  <Badge variant={h.status === 'TRIAL' || h.status === 'ACTIVE' ? 'success' : h.status === 'GRACE' ? 'gold' : 'default'}>
                    {h.status}
                  </Badge>
                  {h.is_free_grant && <span className="hint"> · free grant</span>}
                </span>
                <span className="hint">{h.starts_at ? new Date(h.starts_at).toLocaleDateString() : '—'}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  )
}
