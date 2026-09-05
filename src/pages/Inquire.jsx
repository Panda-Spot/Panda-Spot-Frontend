import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { submitInquiry } from '../api.js'

// Public booking inquiry form (Phase 12): no login — the studio is
// resolved by its subdomain slug in the URL (/inquire/:slug).
export default function Inquire() {
  const { slug } = useParams()
  const [form, setForm] = useState({ name: '', phone: '', email: '', event_type: '', event_date: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please add your name and email so the studio can reach you.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await submitInquiry(slug, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim(),
        event_type: form.event_type.trim() || undefined,
        event_date: form.event_date || undefined,
        message: form.message.trim() || undefined,
      })
      setDone(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <main className="content" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ marginTop: 24 }}>Book your date</h1>
        {done ? (
          <div className="card">
            <div className="guest-link-label">Inquiry received</div>
            <p>Thanks {form.name.split(' ')[0] || 'there'} — {done.studio || 'the studio'} will get back to you shortly at {form.email}.</p>
          </div>
        ) : (
          <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="field-label" htmlFor="inq-name">Your name</label>
              <input id="inq-name" className="text-input" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="field-label" htmlFor="inq-phone">Phone (optional)</label>
                <input id="inq-phone" className="text-input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={40} />
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="field-label" htmlFor="inq-email">Email</label>
                <input id="inq-email" className="text-input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} />
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="field-label" htmlFor="inq-type">Event type (optional)</label>
                <input id="inq-type" className="text-input" value={form.event_type} onChange={(e) => set({ event_type: e.target.value })} placeholder="e.g. Wedding" maxLength={80} />
              </div>
              <div>
                <label className="field-label" htmlFor="inq-date">Event date (optional)</label>
                <input id="inq-date" className="text-input" type="date" value={form.event_date} onChange={(e) => set({ event_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="inq-msg">Message (optional)</label>
              <textarea id="inq-msg" className="text-input" rows={4} value={form.message} onChange={(e) => set({ message: e.target.value })} maxLength={2000} placeholder="Venue, package you liked, anything else…" />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send inquiry'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
