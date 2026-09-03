import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activateTrial,
  downgradeSubscription,
  getMySubscription,
  listEvents,
  listSubscriptionPlans,
  listWalletTransactions,
  rechargeWallet,
  subscribeToPlan,
  upgradeSubscription,
} from '../api.js'

const FREE_EVENT_LIMIT = 15

// MERGE (Studio-Verse Billing & Subscriptions): the free-tier event/
// storage meter below predates this merge and is the system that's
// actually enforced today (see lib/planLimits.js) — kept as-is. The
// subscription/wallet sections are new; see lib/subscriptionAccess.js's
// own safety note for why they're not wired into any upload gate yet —
// this page is honest about that: a subscription's quota is informational
// right now, not an enforced limit.
export default function Billing() {
  const [eventCount, setEventCount] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [plans, setPlans] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    listEvents().then((events) => setEventCount(events.length)).catch(() => setEventCount(null))
    getMySubscription()
      .then((data) => {
        setSubscription(data.subscription)
        setWalletBalance(data.wallet_balance)
      })
      .catch(() => {})
    listSubscriptionPlans().then(setPlans).catch(() => setPlans([]))
    listWalletTransactions().then(setTransactions).catch(() => setTransactions([]))
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
    } finally {
      setBusy(false)
    }
  }

  const subscriptionPlans = (plans || []).filter((p) => p.planType === 'SUBSCRIPTION')
  const walletPlans = (plans || []).filter((p) => p.planType === 'WALLET')
  const hasWallet = transactions.length > 0 || walletBalance > 0

  return (
    <div>
      <h1 className="section-title">Billing</h1>

      <div className="card billing-card">
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
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card billing-card">
        <div className="guest-link-label">Subscription</div>
        {subscription ? (
          <>
            <p className="subtle">
              <strong>{subscription.plan_name || 'Trial'}</strong> — {subscription.status}
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
          <button className="btn" type="button" disabled={busy} onClick={() => withBusy(activateTrial)}>
            Start free trial
          </button>
        )}

        {plans === null ? (
          <p className="hint">Loading plans…</p>
        ) : subscriptionPlans.length === 0 ? (
          <p className="hint">No subscription plans available yet.</p>
        ) : (
          <div className="photo-grid" style={{ marginTop: 12 }}>
            {subscriptionPlans.map((p) => {
              const isCurrent = subscription?.plan_name === p.planName;
              const isHigher = subscription && Number(p.price) > Number(subscriptionPlans.find((sp) => sp.planName === subscription.plan_name)?.price ?? 0);
              return (
                <div className="photo-card" key={p.id} style={{ padding: 16 }}>
                  <div className="guest-link-label">{p.planName}</div>
                  <p className="hint">₹{Number(p.price)} / {p.durationValue} {p.durationUnit?.toLowerCase()}</p>
                  <p className="hint">{p.photoQuota} photos</p>
                  {isCurrent ? (
                    <span className="hint">Current plan</span>
                  ) : subscription && subscription.status !== 'GRACE' && subscription.status !== 'EXPIRED' && subscription.plan_name ? (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => withBusy(() => (isHigher ? upgradeSubscription(p.id) : downgradeSubscription(p.id)))}
                    >
                      {isHigher ? 'Upgrade' : 'Downgrade'}
                    </button>
                  ) : (
                    <button className="btn secondary" type="button" disabled={busy} onClick={() => withBusy(() => subscribeToPlan(p.id))}>
                      Subscribe
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Wallet</div>
        <p className="subtle">Balance: <strong>{walletBalance} credits</strong></p>
        {plans !== null && walletPlans.length > 0 && (
          <div className="photo-grid" style={{ marginTop: 12 }}>
            {walletPlans.map((p) => (
              <div className="photo-card" key={p.id} style={{ padding: 16 }}>
                <div className="guest-link-label">{p.planName}</div>
                <p className="hint">₹{Number(p.price)} for {p.walletCredits} credits</p>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy || (p.walletTier === 'INITIAL' && hasWallet) || (p.walletTier === 'TOPUP' && !hasWallet)}
                  onClick={() => withBusy(() => rechargeWallet(p.id))}
                >
                  {p.walletTier === 'INITIAL' ? 'Activate wallet' : 'Top up'}
                </button>
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
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Quotations, bills & payments</div>
        <p className="hint">Create quotations for clients, confirm them into bills, and record payments.</p>
        <Link className="btn secondary" to="/billing/documents">Open billing documents</Link>
      </div>
    </div>
  )
}
