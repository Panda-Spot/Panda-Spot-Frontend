import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react'
import { acceptClientContract, getClientContract, listClientContracts, previewClientContractFile } from '../api.js'
import { useToast } from '../toast.jsx'
import { celebrate } from '../lib/confetti.js'

// Client-side contracts (Phase 12): review assigned agreements and
// accept with a typed name (checkbox foundation for e-signature later).
export function ClientContracts() {
  const { showToast } = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listClientContracts().then(setRows).catch((e) => setError(e.message))
  }, [])

  if (error && !rows) return <p className="error">{error}</p>
  if (!rows) return <p className="hint">Loading contracts…</p>

  return (
    <div>
      <Link className="back-link" to="/client"><ArrowLeft size={13} style={{ display: 'inline' }} /> Your events</Link>
      {rows.length === 0 ? (
        <p className="hint">No contracts assigned to you yet.</p>
      ) : (
        <ul className="team-list">
          {rows.map((c) => (
            <li key={c.id} className="team-list-item">
              <span style={{ flex: 1 }}>
                <FileText size={13} style={{ display: 'inline', verticalAlign: -2 }} /> {c.template_name || 'Agreement'}
                <span className="hint"> · {c.status === 'signed' ? 'signed' : 'awaiting your signature'}{c.event?.name ? ` · ${c.event.name}` : ''}</span>
              </span>
              {c.status === 'signed'
                ? <CheckCircle2 size={16} style={{ color: '#34D399' }} />
                : <Link className="btn secondary" to={`/client/contracts/${c.id}`}>Review & sign</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ClientContractDetail() {
  const { showToast } = useToast()
  const { contractId: id } = useParams()
  const [contract, setContract] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    getClientContract(id).then(setContract).catch((e) => setError(e.message))
  }, [id])

  // Inline PDF preview (fetched authed — iframes can't send the header).
  useEffect(() => {
    let url = null
    let cancelled = false
    if (contract?.file_url) {
      previewClientContractFile(id)
        .then((u) => { if (!cancelled) { url = u; setPdfUrl(u) } else URL.revokeObjectURL(u) })
        .catch(() => { if (!cancelled) setPdfError('Preview unavailable — the signed copy below still counts.') })
    }
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, contract?.file_url])

  const accept = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please type your full name to accept.')
      return
    }
    if (!agreed) {
      setError('Please tick the agreement checkbox as well.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await acceptClientContract(id, name.trim())
      setContract((c) => ({ ...c, status: res.status, accepted_at: res.accepted_at, signature_name: name.trim() }))
      showToast('Contract signed — thank you!')
      celebrate()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !contract) return <p className="error">{error}</p>
  if (!contract) return <p className="hint">Loading contract…</p>

  return (
    <div>
      <Link className="back-link" to="/client/contracts"><ArrowLeft size={13} style={{ display: 'inline' }} /> All contracts</Link>
      <h1 style={{ marginTop: 10 }}>{contract.template_name || 'Agreement'}</h1>
      {contract.event && <p className="hint">For event: {contract.event.name}</p>}
      {contract.status === 'signed' ? (
        <div className="card">
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} style={{ color: '#34D399' }} />
            Signed by {contract.signature_name} on {contract.accepted_at ? new Date(contract.accepted_at).toLocaleString() : '—'}
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="hint">Read the agreement your studio shared, tick the box, then type your full name below to accept it.</p>
          {pdfUrl ? (
            <iframe title="Contract preview" src={pdfUrl} style={{ width: '100%', height: '50vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', marginTop: 8 }} />
          ) : (
            <p className="hint">{pdfError || (contract.file_url ? 'Loading preview…' : 'No preview file attached — the terms below still count.')}</p>
          )}
          <form style={{ display: 'grid', gap: 8, marginTop: 10 }} onSubmit={accept}>
            <label className="row" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
              <span className="subtle">I have read this agreement and I accept its terms.</span>
            </label>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="field-label" htmlFor="sign-name">Full name (acts as your signature)</label>
                <input id="sign-name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </div>
              <button className="btn" type="submit" disabled={busy || !agreed}>
                {busy ? 'Signing…' : 'Accept & sign'}
              </button>
            </div>
          </form>
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
