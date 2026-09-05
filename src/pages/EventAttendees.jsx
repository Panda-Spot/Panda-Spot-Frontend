import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download } from 'lucide-react'
import { exportLeadsCsv, getEvent, listEventLeads } from '../api.js'
import { useToast } from '../toast.jsx'

const ACTIONS = [
  { value: '', label: 'Any action' },
  { value: 'gallery_open', label: 'Opened gallery' },
  { value: 'selfie_search', label: 'Searched selfie' },
  { value: 'download', label: 'Downloaded' },
  { value: 'share', label: 'Shared link' },
  { value: 'feedback', label: 'Gave feedback' },
];

// Studio attendee dashboard (Phase 10): who visited, what they did,
// and whether they left contact details + consent — filterable by date,
// action, and free text, with a spreadsheet CSV export.
export default function EventAttendees() {
  const { eventId } = useParams()
  const { showToast } = useToast()
  const [eventName, setEventName] = useState('')
  const [mode, setMode] = useState('disabled')
  const [leads, setLeads] = useState(null)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [ev, data] = await Promise.all([
        getEvent(eventId),
        listEventLeads(eventId, { from: from || undefined, to: to || undefined, action: action || undefined, search: search.trim() || undefined }),
      ])
      setEventName(ev.name)
      setMode(ev.lead_capture_mode || 'disabled')
      setLeads(data.leads || [])
    } catch (e) {
      setError(e.message)
    }
  }, [eventId, from, to, action, search])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportLeadsCsv(eventId)
      showToast('Attendee CSV downloaded')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  if (error && !leads) return <p className="error">{error}</p>

  return (
    <div>
      <Link className="back-link" to={`/events/${eventId}`}><ArrowLeft size={13} style={{ display: 'inline' }} /> Back to event</Link>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Attendees{eventName ? ` — ${eventName}` : ''}</h1>
        <button className="btn secondary" type="button" disabled={exporting || !leads?.length} onClick={handleExport}>
          <Download size={13} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      <p className="hint">
        Capture mode: <strong>{mode.replace(/_/g, ' ')}</strong> · guests appear on first sight; contact details only when they share them.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <label className="field-label" htmlFor="att-from">From</label>
            <input id="att-from" className="text-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 170 }} />
          </div>
          <div>
            <label className="field-label" htmlFor="att-to">To</label>
            <input id="att-to" className="text-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 170 }} />
          </div>
          <div>
            <label className="field-label" htmlFor="att-action">Action</label>
            <select id="att-action" className="text-input" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="field-label" htmlFor="att-search">Search name / email / phone</label>
            <input id="att-search" className="text-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Sharma" />
          </div>
        </div>
      </div>

      {!leads ? (
        <p className="hint">Loading attendees…</p>
      ) : leads.length === 0 ? (
        <p className="hint">No attendees yet — guests appear here on their first gallery visit.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Consent</th>
                <th>Source</th>
                <th>Actions</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.guest_client_id}>
                  <td>{l.name || <span className="hint">—</span>}</td>
                  <td>
                    {[l.email, l.phone].filter(Boolean).join(' · ') || <span className="hint">—</span>}
                  </td>
                  <td>{l.guest_type}</td>
                  <td>{l.consent_given ? <span style={{ color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} /> yes</span> : <span className="hint">no</span>}</td>
                  <td>{l.source || <span className="hint">—</span>}</td>
                  <td>
                    {l.total_actions === 0 ? <span className="hint">—</span> : (
                      <span className="hint">
                        {l.total_actions} · {l.last_action?.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                  <td>{l.last_seen_at ? new Date(l.last_seen_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
