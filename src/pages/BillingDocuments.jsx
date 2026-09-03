import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  confirmQuotation,
  createBillingService,
  createQuotation,
  deleteQuotation,
  downloadBillPdf,
  downloadQuotationPdf,
  downloadReceiptPdf,
  getBill,
  listBillingServices,
  listBills,
  listQuotations,
  recordPayment,
} from '../api.js'

const PAYMENT_METHODS = ['CASH', 'GPAY', 'CARD', 'BANK_TRANSFER', 'CHEQUE']

function emptyItem() {
  return { name: '', price: '', quantity: 1, discount_per_unit: 0 }
}

// MERGE (Studio-Verse Billing & Subscriptions): the studio-facing
// quotation → bill → payment workflow. Deliberately one page rather than
// three separate routes — this is a first pass on the UI, not the final
// design-system treatment (that's Phase 16).
export default function BillingDocuments() {
  const [services, setServices] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bills, setBills] = useState([])
  const [selectedBill, setSelectedBill] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')

  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [items, setItems] = useState([emptyItem()])

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentRemark, setPaymentRemark] = useState('')

  const load = () => {
    listBillingServices().then(setServices).catch(() => setServices([]))
    listQuotations().then(setQuotations).catch(() => setQuotations([]))
    listBills().then(setBills).catch(() => setBills([]))
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

  const handleCreateService = async (e) => {
    e.preventDefault()
    if (!serviceName.trim()) return
    await withBusy(async () => {
      await createBillingService(serviceName.trim(), servicePrice ? Number(servicePrice) : null)
      setServiceName('')
      setServicePrice('')
    })
  }

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addServiceAsItem = (service) => {
    setItems((prev) => [...prev, { name: service.name, price: service.price ?? '', quantity: 1, discount_per_unit: 0 }])
  }

  const handleCreateQuotation = async (e) => {
    e.preventDefault()
    if (!clientEmail.trim()) return
    const validItems = items.filter((it) => it.name.trim() && it.price !== '')
    await withBusy(async () => {
      await createQuotation(
        clientEmail.trim(),
        clientName.trim(),
        validItems.map((it) => ({ name: it.name, price: Number(it.price), quantity: Number(it.quantity) || 1, discount_per_unit: Number(it.discount_per_unit) || 0 })),
        Number(discountAmount) || 0
      )
      setClientEmail('')
      setClientName('')
      setDiscountAmount('0')
      setItems([emptyItem()])
    })
  }

  const handleConfirm = (id) => withBusy(() => confirmQuotation(id))
  const handleDelete = (id) => withBusy(() => deleteQuotation(id))
  const handlePdf = (fn) => withBusy(fn)

  const openBill = async (id) => {
    setError('')
    try {
      setSelectedBill(await getBill(id))
      setPaymentAmount('')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!selectedBill || !paymentAmount) return
    await withBusy(async () => {
      await recordPayment(selectedBill.id, Number(paymentAmount), paymentMethod, paymentRemark.trim() || undefined)
      const refreshed = await getBill(selectedBill.id)
      setSelectedBill(refreshed)
      setPaymentAmount('')
      setPaymentRemark('')
    })
  }

  return (
    <div>
      <Link className="back-link" to="/billing">&larr; Billing</Link>
      <h1 className="section-title">Billing documents</h1>
      {error && <p className="error">{error}</p>}

      <div className="card billing-card">
        <div className="guest-link-label">Service catalog</div>
        <form className="row" onSubmit={handleCreateService}>
          <input className="text-input" placeholder="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          <input className="text-input" type="number" placeholder="Price (optional)" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} style={{ maxWidth: 160 }} />
          <button className="btn" type="submit" disabled={busy || !serviceName.trim()}>Add</button>
        </form>
        <ul className="team-list">
          {services.map((s) => (
            <li key={s.id} className="team-list-item">
              <span>{s.name} {s.price != null && <span className="hint">₹{Number(s.price)}</span>}</span>
              <button className="btn secondary" type="button" onClick={() => addServiceAsItem(s)}>Add to quotation</button>
            </li>
          ))}
          {services.length === 0 && <li className="hint">No services yet.</li>}
        </ul>
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">New quotation</div>
        <form onSubmit={handleCreateQuotation}>
          <div className="row">
            <input className="text-input" type="email" placeholder="Client email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            <input className="text-input" placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          {items.map((it, idx) => (
            <div className="row" key={idx} style={{ marginTop: 8 }}>
              <input className="text-input" placeholder="Item name" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
              <input className="text-input" type="number" placeholder="Price" value={it.price} onChange={(e) => updateItem(idx, { price: e.target.value })} style={{ maxWidth: 120 }} />
              <input className="text-input" type="number" min="1" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} style={{ maxWidth: 90 }} />
              <input className="text-input" type="number" placeholder="Discount/unit" value={it.discount_per_unit} onChange={(e) => updateItem(idx, { discount_per_unit: e.target.value })} style={{ maxWidth: 130 }} />
            </div>
          ))}
          <button className="btn secondary" type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} style={{ marginTop: 8 }}>
            + Add line item
          </button>
          <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
            <label className="field-label" htmlFor="q-discount">Whole-quotation discount</label>
            <input id="q-discount" className="text-input" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} style={{ maxWidth: 140 }} />
          </div>
          <button className="btn" type="submit" disabled={busy || !clientEmail.trim()} style={{ marginTop: 8 }}>
            Save quotation
          </button>
        </form>
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Quotations</div>
        <ul className="team-list">
          {quotations.map((q) => (
            <li key={q.id} className="team-list-item">
              <span>
                #{q.quotation_number} — {q.client?.email} — ₹{q.payable} <span className="hint">({q.status})</span>
              </span>
              <span>
                <button className="btn secondary" type="button" onClick={() => handlePdf(() => downloadQuotationPdf(q.id, q.quotation_number))} disabled={busy}>PDF</button>
                {q.status === 'DRAFT' && (
                  <>
                  <button className="btn secondary" type="button" onClick={() => handleConfirm(q.id)} disabled={busy}>Confirm → Bill</button>
                  <button className="btn secondary" type="button" onClick={() => handleDelete(q.id)} disabled={busy}>Delete</button>
                  </>
                )}
              </span>
            </li>
          ))}
          {quotations.length === 0 && <li className="hint">No quotations yet.</li>}
        </ul>
      </div>

      <div className="card billing-card">
        <div className="guest-link-label">Bills</div>
        <ul className="team-list">
          {bills.map((b) => (
            <li key={b.id} className="team-list-item">
              <span>#{b.bill_number} — {b.client?.email} — ₹{b.paid} / ₹{b.payable} <span className="hint">({b.status})</span></span>
              <span>
                <button className="btn secondary" type="button" onClick={() => handlePdf(() => downloadBillPdf(b.id, b.bill_number))} disabled={busy}>PDF</button>
                <button className="btn secondary" type="button" onClick={() => openBill(b.id)}>Open</button>
              </span>
            </li>
          ))}
          {bills.length === 0 && <li className="hint">No bills yet.</li>}
        </ul>
      </div>

      {selectedBill && (
        <div className="card billing-card">
          <div className="guest-link-label">Bill #{selectedBill.bill_number}</div>
          <p className="subtle">{selectedBill.client?.email} — {selectedBill.status}</p>
          <p className="hint">Payable ₹{selectedBill.payable} — Paid ₹{selectedBill.paid} — Remaining ₹{selectedBill.remaining}</p>
          <button className="btn secondary" type="button" onClick={() => handlePdf(() => downloadBillPdf(selectedBill.id, selectedBill.bill_number))} disabled={busy}>
            Download bill PDF
          </button>
          <ul className="team-list">
            {selectedBill.payments.map((p) => (
              <li key={p.receipt_number} className="team-list-item">
                <span>Receipt #{p.receipt_number} — ₹{p.amount} ({p.method})</span>
                <span>
                  <span className="hint">{new Date(p.created_at).toLocaleDateString()}</span>
                  <button className="btn secondary" type="button" onClick={() => handlePdf(() => downloadReceiptPdf(p.receipt_number))} disabled={busy}>PDF</button>
                </span>
              </li>
            ))}
          </ul>
          {selectedBill.status !== 'PAID' && (
            <form className="row" onSubmit={handleRecordPayment} style={{ marginTop: 8 }}>
              <input className="text-input" type="number" placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={{ maxWidth: 140 }} />
              <select className="text-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ maxWidth: 160 }}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className="text-input" placeholder="Remark (optional)" value={paymentRemark} onChange={(e) => setPaymentRemark(e.target.value)} />
              <button className="btn" type="submit" disabled={busy || !paymentAmount}>Record payment</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
