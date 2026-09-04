import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeIndianRupee, FileText, IndianRupee, Receipt } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  confirmQuotation,
  createBillingService,
  createQuotation,
  deleteQuotation,
  downloadBillPdf,
  downloadQuotationPdf,
  downloadReceiptPdf,
  getBill,
  getBillingSettings,
  listBillingServices,
  listBills,
  listQuotations,
  recordPayment,
  updateBillingSettings,
  updateQuotation,
} from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import BillingStatusTracker from '../components/billing/BillingStatusTracker.jsx'

const PAYMENT_METHODS = ['CASH', 'GPAY', 'CARD', 'BANK_TRANSFER', 'CHEQUE']
const GOLD = '#F59E0B'
const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

function emptyItem() {
  return { name: '', price: '', quantity: 1, discount_per_unit: 0 }
}

// The studio-facing quotation → bill → payment workflow: draft quotations
// (editable) confirm one-way into immutable bills, against which one or
// more payments/receipts are recorded. GST display fields print on the
// PDFs from the platform-stored billing settings (editable by Super Admin;
// tenant-side GST editing arrives with the Phase 18H /billing/settings
// endpoint).
export default function BillingDocuments() {
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [services, setServices] = useState([])
  const [quotations, setQuotations] = useState([])
  const [bills, setBills] = useState([])
  const [selectedBill, setSelectedBill] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [quotationFilter, setQuotationFilter] = useState('all')
  const [billFilter, setBillFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')

  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [items, setItems] = useState([emptyItem()])
  const [editingId, setEditingId] = useState(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentRemark, setPaymentRemark] = useState('')

  const [gstin, setGstin] = useState('')
  const [gstState, setGstState] = useState('')
  const [gstLoaded, setGstLoaded] = useState(false)

  const load = () => {
    listBillingServices().then(setServices).catch(() => setServices([]))
    listQuotations().then(setQuotations).catch(() => setQuotations([]))
    listBills().then(setBills).catch(() => setBills([]))
    getBillingSettings()
      .then((s) => {
        setGstin(s.gstin_number || '')
        setGstState(s.gst_state || '')
        setGstLoaded(true)
      })
      .catch(() => setGstLoaded(false))
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

  const resetQuotationForm = () => {
    setClientEmail('')
    setClientName('')
    setDiscountAmount('0')
    setItems([emptyItem()])
    setEditingId(null)
  }

  const handleCreateQuotation = async (e) => {
    e.preventDefault()
    if (!clientEmail.trim()) return
    const validItems = items.filter((it) => it.name.trim() && it.price !== '')
    await withBusy(async () => {
      if (editingId) {
        await updateQuotation(
          editingId,
          validItems.map((it) => ({ name: it.name, price: Number(it.price), quantity: Number(it.quantity) || 1, discount_per_unit: Number(it.discount_per_unit) || 0 })),
          Number(discountAmount) || 0
        )
      } else {
        await createQuotation(
          clientEmail.trim(),
          clientName.trim(),
          validItems.map((it) => ({ name: it.name, price: Number(it.price), quantity: Number(it.quantity) || 1, discount_per_unit: Number(it.discount_per_unit) || 0 })),
          Number(discountAmount) || 0
        )
      }
      resetQuotationForm()
    })
  }

  const handleEditQuotation = (item) => {
    if (item.status !== 'DRAFT') return
    setEditingId(item.id)
    setClientEmail(item.client?.email || '')
    setClientName(item.client?.name || '')
    setDiscountAmount(String(item.discount_amount ?? 0))
    setItems(item.items.length > 0
      ? item.items.map((it) => ({ name: it.name, price: String(it.price ?? ''), quantity: it.quantity, discount_per_unit: String(it.discount_per_unit ?? 0) }))
      : [emptyItem()])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Confirming is one-way and irreversible: line items are copied into a new
  // immutable Bill — say so before firing.
  const handleConfirm = async (id, number) => {
    const ok = await confirm(
      `Confirm quotation #${number} into a bill? The quotation locks permanently and the new bill can never be edited — only payments can be recorded against it.`,
      { title: 'Confirm & generate bill?', confirmLabel: 'Confirm → Bill', danger: false }
    )
    if (!ok) return
    withBusy(() => confirmQuotation(id))
  }

  const handleDelete = async (id, number) => {
    const ok = await confirm(
      `Delete draft quotation #${number}? This can't be undone.`,
      { title: 'Delete quotation?', confirmLabel: 'Delete', danger: true }
    )
    if (!ok) return
    withBusy(() => deleteQuotation(id))
  }

  const handlePdf = (fn) => withBusy(fn)

  const openBill = async (id) => {
    setError('')
    try {
      const bill = await getBill(id)
      setSelectedBill(bill)
      // Prefill the remaining balance (the server still caps overpay) —
      // recording a full payment is then one click.
      setPaymentAmount(bill.remaining != null ? String(bill.remaining) : '')
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

  const handleSaveGst = async (e) => {
    e.preventDefault()
    await withBusy(async () => {
      const updated = await updateBillingSettings({
        gstin_number: gstin.trim() === '' ? null : gstin.trim(),
        gst_state: gstState.trim() === '' ? null : gstState.trim(),
      })
      setGstin(updated.gstin_number || '')
      setGstState(updated.gst_state || '')
    })
  }

  const q = search.trim().toLowerCase()
  const visibleQuotations = quotations.filter((item) => {
    if (quotationFilter !== 'all' && item.status !== quotationFilter.toUpperCase()) return false
    if (!q) return true
    return (item.client?.email || '').toLowerCase().includes(q) || String(item.quotation_number).includes(q)
  })
  const visibleBills = bills.filter((b) => {
    if (billFilter !== 'all' && b.status !== billFilter.toUpperCase()) return false
    if (!q) return true
    return (b.client?.email || '').toLowerCase().includes(q) || String(b.bill_number).includes(q)
  })

  // Headline stats from the same rows the tables render — no extra requests.
  const draftQuotations = quotations.filter((item) => item.status === 'DRAFT')
  const totalQuotedValue = quotations.reduce((sum, item) => sum + (Number(item.payable) || 0), 0)
  const totalCollected = bills.reduce(
    (sum, b) => sum + (b.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0),
    0
  )

  // Collections per month over the last 6 months, from real payment rows.
  const revenueByMonth = useMemo(() => {
    const buckets = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('default', { month: 'short' }),
        total: 0,
      })
    }
    for (const b of bills) {
      for (const p of b.payments || []) {
        const d = new Date(p.created_at)
        if (Number.isNaN(d.getTime())) continue
        const bucket = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
        if (bucket) bucket.total += Number(p.amount) || 0
      }
    }
    return buckets
  }, [bills])

  // Merged recent activity: quotations + bills + payments, newest first.
  const activity = useMemo(() => {
    const rows = []
    for (const item of quotations) {
      rows.push({ at: item.created_at, text: `Quotation #${item.quotation_number} for ${item.client?.email || 'client'} — ₹${item.payable} (${item.status})` })
    }
    for (const b of bills) {
      rows.push({ at: b.created_at, text: `Bill #${b.bill_number} for ${b.client?.email || 'client'} — ₹${b.paid} / ₹${b.payable}` })
      for (const p of b.payments || []) {
        rows.push({ at: p.created_at, text: `Receipt #${p.receipt_number} — ₹${p.amount} (${p.method}) on bill #${b.bill_number}` })
      }
    }
    return rows
      .filter((r) => r.at && !Number.isNaN(new Date(r.at).getTime()))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8)
  }, [quotations, bills])

  const billBadge = (status) =>
    status === 'PAID' ? 'success' : status === 'PARTIALLY_PAID' ? 'gold' : 'default'

  return (
    <div className="space-y-6">
      <div>
        <Link className="back-link" to="/billing">&larr; Billing</Link>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2 mt-1" style={{ color: 'var(--text-primary)' }}>
          <Receipt size={22} className="text-gold-500" /> Invoicing
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Service catalog → quotation → confirmed bill → payments & receipts, all as real PDFs.
        </p>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Quotations" value={quotations.length} icon={Receipt} />
        <StatCard label="Draft quotations" value={draftQuotations.length} icon={FileText} />
        <StatCard label="Total quoted value" value={totalQuotedValue} icon={IndianRupee} />
        <StatCard label="Total collected" value={totalCollected} icon={BadgeIndianRupee} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <GlassCard hover={false} className="xl:col-span-2">
          <div className="guest-link-label">Collections — last 6 months</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={revenueByMonth} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181B', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, color: '#F5F5F7', fontSize: 12 }}
                itemStyle={{ color: GOLD }}
                formatter={(v) => [`₹${v}`, 'collected']}
              />
              <Bar dataKey="total" name="collected" radius={[4, 4, 0, 0]}>
                {revenueByMonth.map((_, i) => (
                  <Cell key={i} fill={i === revenueByMonth.length - 1 ? GOLD : `rgba(245,158,11,${0.28 + (i / (revenueByMonth.length - 1)) * 0.4})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="guest-link-label">Recent activity</div>
          {activity.length === 0 ? (
            <p className="hint">No activity yet.</p>
          ) : (
            <ul className="space-y-2 mt-2">
              {activity.map((a, i) => (
                <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{new Date(a.at).toLocaleDateString()} — </span>
                  {a.text}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard hover={false}>
        <div className="guest-link-label">GST details</div>
        <p className="hint">Printed on your quotation, bill, and receipt PDFs. Display only — no tax is calculated.</p>
        {gstLoaded ? (
          <form className="row" onSubmit={handleSaveGst} style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="gstin">GSTIN</label>
              <input id="gstin" className="text-input" placeholder="e.g. 29ABCDE1234F1Z5" value={gstin} onChange={(e) => setGstin(e.target.value)} style={{ maxWidth: 220 }} />
            </div>
            <div>
              <label className="field-label" htmlFor="gst-state">State</label>
              <input id="gst-state" className="text-input" placeholder="e.g. Karnataka" value={gstState} onChange={(e) => setGstState(e.target.value)} style={{ maxWidth: 180 }} />
            </div>
            <GoldButton type="submit" disabled={busy}>Save GST details</GoldButton>
          </form>
        ) : (
          <p className="hint">Couldn&apos;t load GST details.</p>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <div className="guest-link-label">Service catalog</div>
        <form className="row" onSubmit={handleCreateService}>
          <input className="text-input" placeholder="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          <input className="text-input" type="number" placeholder="Price (optional)" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} style={{ maxWidth: 160 }} />
          <GoldButton type="submit" disabled={busy || !serviceName.trim()}>Add</GoldButton>
        </form>
        <ul className="team-list">
          {services.map((s) => (
            <li key={s.id} className="team-list-item">
              <span>{s.name} {s.price != null && <span className="hint">₹{Number(s.price)}</span>}</span>
              <GoldButton size="sm" variant="outline" type="button" onClick={() => addServiceAsItem(s)}>Add to quotation</GoldButton>
            </li>
          ))}
          {services.length === 0 && <li className="hint">No services yet.</li>}
        </ul>
      </GlassCard>

      <GlassCard hover={false}>
        <div className="guest-link-label">{editingId ? 'Edit draft quotation' : 'New quotation'}</div>
        {editingId && (
          <p className="hint">Editing a draft — client can&apos;t be changed once created. Save, or cancel below.</p>
        )}
        <form onSubmit={handleCreateQuotation}>
          <div className="row">
            <input className="text-input" type="email" placeholder="Client email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} disabled={!!editingId} />
            <input className="text-input" placeholder="Client name (optional)" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={!!editingId} />
          </div>
          {items.map((it, idx) => (
            <div className="row" key={idx} style={{ marginTop: 8 }}>
              <input className="text-input" placeholder="Item name" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
              <input className="text-input" type="number" placeholder="Price" value={it.price} onChange={(e) => updateItem(idx, { price: e.target.value })} style={{ maxWidth: 120 }} />
              <input className="text-input" type="number" min="1" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} style={{ maxWidth: 90 }} />
              <input className="text-input" type="number" placeholder="Discount/unit" value={it.discount_per_unit} onChange={(e) => updateItem(idx, { discount_per_unit: e.target.value })} style={{ maxWidth: 130 }} />
            </div>
          ))}
          <GoldButton variant="ghost" type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} style={{ marginTop: 8 }}>
            + Add line item
          </GoldButton>
          <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
            <label className="field-label" htmlFor="q-discount">Whole-quotation discount</label>
            <input id="q-discount" className="text-input" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} style={{ maxWidth: 140 }} />
          </div>
          <GoldButton type="submit" disabled={busy || (!editingId && !clientEmail.trim())} style={{ marginTop: 8 }}>
            {editingId ? 'Save changes' : 'Save quotation'}
          </GoldButton>
          {editingId && (
            <GoldButton variant="ghost" type="button" onClick={resetQuotationForm} style={{ marginTop: 8 }}>
              Cancel edit
            </GoldButton>
          )}
        </form>
      </GlassCard>

      <GlassCard hover={false}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="guest-link-label">Quotations</div>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'draft', label: 'Draft' },
              { key: 'confirmed', label: 'Confirmed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setQuotationFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: quotationFilter === key ? 'var(--bg-surface)' : 'transparent',
                  color: quotationFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <input
          className="text-input w-full mt-3"
          placeholder="Search by client email or quotation number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="team-list" style={{ marginTop: 8 }}>
          {visibleQuotations.map((item) => (
            <li key={item.id} className="team-list-item" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>
                  #{item.quotation_number} — {item.client?.email} — ₹{item.payable}{' '}
                  <Badge variant={item.status === 'CONFIRMED' ? 'gold' : 'default'}>{item.status}</Badge>
                </span>
                <span>
                  <GoldButton size="sm" variant="ghost" type="button" onClick={() => handlePdf(() => downloadQuotationPdf(item.id, item.quotation_number))} disabled={busy}>PDF</GoldButton>
                {item.status === 'DRAFT' && (
                  <>
                    <GoldButton size="sm" variant="outline" type="button" onClick={() => handleConfirm(item.id, item.quotation_number)} disabled={busy}>Confirm → Bill</GoldButton>
                    <GoldButton size="sm" variant="ghost" type="button" onClick={() => handleEditQuotation(item)} disabled={busy}>Edit</GoldButton>
                    <button className="btn secondary" type="button" onClick={() => handleDelete(item.id, item.quotation_number)} disabled={busy}>Delete</button>
                  </>
                )}
                </span>
              </div>
              {item.bill && (
                <p className="hint" style={{ marginTop: 4 }}>
                  Bill #{item.bill.bill_number} — <Badge variant={billBadge(item.bill.status)}>{item.bill.status}</Badge>{' '}
                  ₹{item.bill.paid} paid / ₹{item.bill.payable} · {item.bill.receipt_count} receipt{item.bill.receipt_count === 1 ? '' : 's'}
                </p>
              )}
            </li>
          ))}
          {visibleQuotations.length === 0 && <li className="hint">No quotations match.</li>}
        </ul>
      </GlassCard>

      <GlassCard hover={false}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="guest-link-label">Bills</div>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'unpaid', label: 'Unpaid' },
              { key: 'partially_paid', label: 'Partial' },
              { key: 'paid', label: 'Paid' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setBillFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: billFilter === key ? 'var(--bg-surface)' : 'transparent',
                  color: billFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="team-list">
          {visibleBills.map((b) => (
            <li key={b.id} className="team-list-item">
              <span>#{b.bill_number} — {b.client?.email} — ₹{b.paid} / ₹{b.payable} <Badge variant={billBadge(b.status)}>{b.status}</Badge></span>
              <span>
                <GoldButton size="sm" variant="ghost" type="button" onClick={() => handlePdf(() => downloadBillPdf(b.id, b.bill_number))} disabled={busy}>PDF</GoldButton>
                <GoldButton size="sm" variant="outline" type="button" onClick={() => openBill(b.id)}>Open</GoldButton>
              </span>
            </li>
          ))}
          {visibleBills.length === 0 && <li className="hint">No bills match.</li>}
        </ul>
      </GlassCard>

      {selectedBill && (
        <GlassCard hover={false}>
          <div className="guest-link-label">Bill #{selectedBill.bill_number}</div>
          <BillingStatusTracker bill={selectedBill} />
          <p className="subtle">{selectedBill.client?.email} — <Badge variant={billBadge(selectedBill.status)}>{selectedBill.status}</Badge></p>
          <p className="hint">Payable ₹{selectedBill.payable} — Paid ₹{selectedBill.paid} — Remaining ₹{selectedBill.remaining}</p>
          <GoldButton variant="outline" type="button" onClick={() => handlePdf(() => downloadBillPdf(selectedBill.id, selectedBill.bill_number))} disabled={busy}>
            Download bill PDF
          </GoldButton>
          <ul className="team-list">
            {selectedBill.payments.map((p) => (
              <li key={p.receipt_number} className="team-list-item">
                <span>Receipt #{p.receipt_number} — ₹{p.amount} ({p.method})</span>
                <span>
                  <span className="hint">{new Date(p.created_at).toLocaleDateString()}</span>
                  <GoldButton size="sm" variant="ghost" type="button" onClick={() => handlePdf(() => downloadReceiptPdf(p.receipt_number))} disabled={busy}>PDF</GoldButton>
                </span>
              </li>
            ))}
          </ul>
          {selectedBill.status !== 'PAID' && (
            <form className="row" onSubmit={handleRecordPayment} style={{ marginTop: 8 }}>
              <input className="text-input" type="number" min="0" max={selectedBill.remaining ?? undefined} placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={{ maxWidth: 140 }} />
              <select className="text-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ maxWidth: 160 }}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className="text-input" placeholder="Remark (optional)" value={paymentRemark} onChange={(e) => setPaymentRemark(e.target.value)} />
              <GoldButton type="submit" disabled={busy || !paymentAmount}>Record payment</GoldButton>
            </form>
          )}
        </GlassCard>
      )}
    </div>
  )
}
