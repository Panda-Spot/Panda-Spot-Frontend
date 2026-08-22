import { useEffect, useState } from 'react'
import { listEvents } from '../api.js'

const FREE_EVENT_LIMIT = 15

export default function Billing() {
  const [eventCount, setEventCount] = useState(null)

  useEffect(() => {
    listEvents().then((events) => setEventCount(events.length)).catch(() => setEventCount(null))
  }, [])

  return (
    <div>
      <h1 className="section-title">Billing</h1>
      <p className="subtle">Paid plans are coming soon. For now, every account is on the free plan.</p>

      <div className="card billing-card">
        <div className="guest-link-label">Free plan</div>
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

      <div className="card billing-card">
        <div className="guest-link-label">Coming soon</div>
        <p className="hint">Paid plans with higher limits, priority support, and more are on the way.</p>
      </div>
    </div>
  )
}
