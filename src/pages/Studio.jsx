import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  assignContract,
  assignQuestionnaire,
  convertInquiry,
  createBooking,
  createExpense,
  createPackage,
  createQuestionnaire,
  deleteContract,
  deleteContractTemplate,
  deleteExpense,
  deletePackage,
  deleteQuestionnaire,
  getBooking,
  getExpenseReport,
  listBookings,
  listContractTemplates,
  listContracts,
  listExpenses,
  listInquiries,
  listPackages,
  listQuestionnaireAssignments,
  listQuestionnaires,
  getStudioCalendar,
  setInquiryStatus,
  updateBooking,
  updateExpense,
  updatePackage,
  uploadContractTemplate,
} from '../api.js'
import { useToast } from '../toast.jsx'
import { useConfirm } from '../confirm.jsx'

const TABS = [
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'packages', label: 'Packages' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'questionnaires', label: 'Questionnaires' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'expenses', label: 'Expenses' },
]

function Section({ title, hint, children }) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="guest-link-label">{title}</div>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </div>
  )
}

function money(n) {
  if (n == null) return '—'
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// Business studio hub (Phase 12): inquiries → bookings pipeline,
// packages, contracts, questionnaires, expenses — one tabbed page.
export default function Studio() {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState('inquiries')
  const [loading, setLoading] = useState(true)

  const [inquiries, setInquiries] = useState([])
  const [inquiryFilter, setInquiryFilter] = useState('')
  const [calendar, setCalendar] = useState(null)
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [packages, setPackages] = useState([])
  const [pkgForm, setPkgForm] = useState({ name: '', price: '', deliverables: '', included_photos: '', included_albums: '', included_events: '' })
  const [templates, setTemplates] = useState([])
  const [tplName, setTplName] = useState('')
  const [contracts, setContracts] = useState([])
  const [contractForm, setContractForm] = useState({ template_id: '', event_id: '', client_email: '' })
  const [questionnaires, setQuestionnaires] = useState([])
  const [qTitle, setQTitle] = useState('')
  const [qQuestions, setQQuestions] = useState([{ id: 'q1', label: '', type: 'text', options: '' }])
  const [assignForm, setAssignForm] = useState({ questionnaire_id: '', event_id: '', client_email: '' })
  const [assignments, setAssignments] = useState([])
  const [viewQ, setViewQ] = useState(null)
  const [bookings, setBookings] = useState([])
  const [bookingFilter, setBookingFilter] = useState('')
  const [bookingForm, setBookingForm] = useState({ client_name: '', client_email: '', event_type: '', event_date: '', agreed_amount: '', package_id: '', event_id: '', bill_id: '' })
  const [bookingDetail, setBookingDetail] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [report, setReport] = useState(null)
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', vendor: '', notes: '', event_id: '', spent_at: '' })

  const reload = async () => {
    setLoading(true)
    try {
      const [inq, cal, pkgs, tpls, conts, qs, books, exps, rep] = await Promise.all([
        listInquiries().catch(() => []),
        getStudioCalendar(`${calMonth}-01`).catch(() => null),
        listPackages().catch(() => []),
        listContractTemplates().catch(() => []),
        listContracts().catch(() => []),
        listQuestionnaires().catch(() => []),
        listBookings().catch(() => []),
        listExpenses().catch(() => []),
        getExpenseReport().catch(() => null),
      ])
      setInquiries(inq)
      setCalendar(cal)
      setPackages(pkgs)
      setTemplates(tpls)
      setContracts(conts)
      setQuestionnaires(qs)
      setBookings(books)
      setExpenses(exps)
      setReport(rep)
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [calMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Status tabs filter the already-loaded lists locally — instant, no API
  // call. CRUD actions call reload(), which refreshes everything at once.
  const visibleInquiries = useMemo(
    () => (inquiryFilter ? inquiries.filter((q) => q.status === inquiryFilter) : inquiries),
    [inquiries, inquiryFilter]
  )
  const visibleBookings = useMemo(
    () => (bookingFilter ? bookings.filter((b) => b.status === bookingFilter) : bookings),
    [bookings, bookingFilter]
  )

  const handleConvert = async (id) => {
    const ok = await confirm('Convert this inquiry into an event + client invite + booking?', { title: 'Convert inquiry?', confirmLabel: 'Convert' })
    if (!ok) return
    try {
      const res = await convertInquiry(id)
      showToast(`Converted — event and booking created, invite sent to client`)
      reload()
      return res
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const handleCreatePackage = async (e) => {
    e.preventDefault()
    try {
      await createPackage({
        name: pkgForm.name.trim(),
        price: Number(pkgForm.price),
        deliverables: pkgForm.deliverables.split('\n').map((d) => d.trim()).filter(Boolean),
        included_photos: pkgForm.included_photos === '' ? undefined : Number(pkgForm.included_photos),
        included_albums: pkgForm.included_albums === '' ? undefined : Number(pkgForm.included_albums),
        included_events: pkgForm.included_events === '' ? undefined : Number(pkgForm.included_events),
      })
      setPkgForm({ name: '', price: '', deliverables: '', included_photos: '', included_albums: '', included_events: '' })
      showToast('Package created')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !tplName.trim()) {
      showToast('Name the template and pick a PDF first', { type: 'error' })
      return
    }
    try {
      await uploadContractTemplate(tplName.trim(), file)
      setTplName('')
      showToast('Template uploaded')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleAssignContract = async (e) => {
    e.preventDefault()
    try {
      await assignContract({
        template_id: contractForm.template_id || undefined,
        event_id: contractForm.event_id || undefined,
        client_email: contractForm.client_email.trim(),
      })
      setContractForm({ template_id: '', event_id: '', client_email: '' })
      showToast('Contract assigned')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleCreateQuestionnaire = async (e) => {
    e.preventDefault()
    try {
      const questions = qQuestions
        .filter((q) => q.label.trim())
        .map((q, i) => ({
          id: q.id.trim() || `q${i + 1}`,
          label: q.label.trim(),
          type: q.type,
          ...(q.type === 'choice' ? { options: q.options.split('\n').map((o) => o.trim()).filter(Boolean) } : {}),
        }))
      await createQuestionnaire({ title: qTitle.trim(), questions })
      setQTitle('')
      setQQuestions([{ id: 'q1', label: '', type: 'text', options: '' }])
      showToast('Questionnaire created')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleAssignQuestionnaire = async (e) => {
    e.preventDefault()
    try {
      await assignQuestionnaire(assignForm.questionnaire_id, {
        event_id: assignForm.event_id.trim(),
        client_email: assignForm.client_email.trim() || undefined,
      })
      setAssignForm({ questionnaire_id: '', event_id: '', client_email: '' })
      showToast('Questionnaire assigned')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    try {
      await createBooking({
        client_name: bookingForm.client_name.trim(),
        client_email: bookingForm.client_email.trim() || undefined,
        event_type: bookingForm.event_type.trim() || undefined,
        event_date: bookingForm.event_date || undefined,
        agreed_amount: bookingForm.agreed_amount === '' ? undefined : Number(bookingForm.agreed_amount),
        package_id: bookingForm.package_id.trim() || undefined,
        event_id: bookingForm.event_id.trim() || undefined,
        bill_id: bookingForm.bill_id.trim() || undefined,
      })
      setBookingForm({ client_name: '', client_email: '', event_type: '', event_date: '', agreed_amount: '', package_id: '', event_id: '', bill_id: '' })
      showToast('Booking created')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const handleCreateExpense = async (e) => {
    e.preventDefault()
    try {
      await createExpense({
        category: expenseForm.category.trim(),
        amount: Number(expenseForm.amount),
        vendor: expenseForm.vendor.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
        event_id: expenseForm.event_id.trim() || undefined,
        spent_at: expenseForm.spent_at || undefined,
      })
      setExpenseForm({ category: '', amount: '', vendor: '', notes: '', event_id: '', spent_at: '' })
      showToast('Expense recorded')
      reload()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    }
  }

  const openBooking = async (id) => {
    try {
      setBookingDetail(await getBooking(id))
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  const openAssignments = async (qid) => {
    try {
      const rows = await listQuestionnaireAssignments(qid)
      setViewQ({ id: qid, rows })
    } catch (e) {
      showToast(e.message, { type: 'error' })
    }
  }

  if (loading) return <p className="hint">Loading studio…</p>

  return (
    <div>
      <h1 style={{ marginTop: 10 }}>Studio</h1>
      <p className="hint">Bookings pipeline, packages, contracts, questionnaires, and expenses — the business side of the studio.</p>
      <div className="row source-filter-row" style={{ marginBottom: 4 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? 'upload-tab active' : 'upload-tab'} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inquiries' && (
        <Section title={`Inquiries (${visibleInquiries.length})`} hint="Public inquiries land here — convert the good ones into events, client invites, and bookings in one click.">
          <div className="row" style={{ marginBottom: 8 }}>
            {['', 'new', 'contacted', 'converted', 'lost'].map((s) => (
              <button key={s} type="button" className={inquiryFilter === s ? 'upload-tab active' : 'upload-tab'} onClick={() => setInquiryFilter(s)}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
          {visibleInquiries.length === 0 ? <p className="hint">{inquiryFilter ? `No ${inquiryFilter} inquiries.` : 'No inquiries — share your inquiry link to start receiving them.'}</p> : (
            <ul className="team-list">
              {visibleInquiries.map((q) => (
                <li key={q.id} className="team-list-item" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ flex: 1 }}>
                      <strong>{q.name}</strong> <span className="hint">({q.email}{q.phone ? ` · ${q.phone}` : ''})</span>
                      <span className="hint"> · {q.event_type || 'event'}{q.event_date ? ` · ${new Date(q.event_date).toLocaleDateString()}` : ''} · {q.status}</span>
                    </span>
                    {q.status !== 'converted' && (
                      <button type="button" className="btn secondary" onClick={() => handleConvert(q.id)}>Convert</button>
                    )}
                    {q.status === 'new' && (
                      <button type="button" className="btn secondary" onClick={() => setInquiryStatus(q.id, 'contacted').then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Mark contacted</button>
                    )}
                    {['new', 'contacted'].includes(q.status) && (
                      <button type="button" className="btn secondary" onClick={() => setInquiryStatus(q.id, 'lost').then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Mark lost</button>
                    )}
                  </div>
                  {q.message && <p className="hint" style={{ marginTop: 4 }}>{q.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === 'calendar' && (
        <Section title="Shoot calendar" hint="Booked shoots, event dates, and inquiry dates in one view.">
          <div className="row" style={{ marginBottom: 8, alignItems: 'flex-end' }}>
            <div>
              <label className="field-label" htmlFor="cal-month">Month</label>
              <input id="cal-month" className="text-input" type="month" value={calMonth} onChange={(e) => setCalMonth(e.target.value)} />
            </div>
          </div>
          {!calendar || calendar.items.length === 0 ? <p className="hint">Nothing scheduled in this window.</p> : (
            <ul className="team-list">
              {calendar.items.map((it, i) => (
                <li key={`${it.kind}-${it.id}-${i}`} className="team-list-item">
                  <span style={{ flex: 1 }}>
                    <strong>{new Date(it.date).toLocaleDateString()}</strong> · {it.name}
                    <span className="hint"> · {it.kind}{it.status ? ` · ${it.status}` : ''}</span>
                  </span>
                  {it.kind === 'booking' && it.event_id && <Link className="btn secondary" to={`/events/${it.event_id}`}>Event</Link>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === 'packages' && (
        <Section title={`Packages (${packages.length})`} hint="Sellable bundles clients pick from.">
          <form className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }} onSubmit={handleCreatePackage}>
            <div>
              <label className="field-label" htmlFor="pkg-name">Name</label>
              <input id="pkg-name" className="text-input" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="e.g. Wedding Classic" maxLength={120} />
            </div>
            <div>
              <label className="field-label" htmlFor="pkg-price">Price (₹)</label>
              <input id="pkg-price" className="text-input" type="number" min="0" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} style={{ maxWidth: 140 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="field-label" htmlFor="pkg-del">Deliverables (one per line)</label>
              <textarea id="pkg-del" className="text-input" rows={2} value={pkgForm.deliverables} onChange={(e) => setPkgForm({ ...pkgForm, deliverables: e.target.value })} placeholder={"300 edited photos\n40-page album"} />
            </div>
            <div>
              <label className="field-label" htmlFor="pkg-photos">Photos incl.</label>
              <input id="pkg-photos" className="text-input" type="number" min="0" value={pkgForm.included_photos} onChange={(e) => setPkgForm({ ...pkgForm, included_photos: e.target.value })} style={{ maxWidth: 100 }} />
            </div>
            <div>
              <label className="field-label" htmlFor="pkg-albums">Albums incl.</label>
              <input id="pkg-albums" className="text-input" type="number" min="0" value={pkgForm.included_albums} onChange={(e) => setPkgForm({ ...pkgForm, included_albums: e.target.value })} style={{ maxWidth: 100 }} />
            </div>
            <div>
              <label className="field-label" htmlFor="pkg-events">Events incl.</label>
              <input id="pkg-events" className="text-input" type="number" min="0" value={pkgForm.included_events} onChange={(e) => setPkgForm({ ...pkgForm, included_events: e.target.value })} style={{ maxWidth: 100 }} />
            </div>
            <button className="btn" type="submit">Add package</button>
          </form>
          <ul className="team-list">
            {packages.map((p) => (
              <li key={p.id} className="team-list-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }}>
                    <strong>{p.name}</strong> · {money(p.price)}
                    <span className="hint"> · {p.included_photos} photos · {p.included_albums} albums · {p.included_events} events{p.active ? '' : ' · inactive'}</span>
                  </span>
                  <button type="button" className="btn secondary" onClick={() => updatePackage(p.id, { active: !p.active }).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="btn secondary" onClick={async () => {
                    const ok = await confirm(`Delete package “${p.name}”?`, { title: 'Delete package?', confirmLabel: 'Delete', danger: true })
                    if (ok) deletePackage(p.id).then(reload).catch((e) => showToast(e.message, { type: 'error' }))
                  }}>Delete</button>
                </div>
                {p.deliverables?.length > 0 && <p className="hint" style={{ marginTop: 4 }}>{p.deliverables.join(' · ')}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {tab === 'contracts' && (
        <>
          <Section title="Templates" hint="Upload contract PDFs once, assign them to clients many times.">
            <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="field-label" htmlFor="tpl-name">Template name</label>
                <input id="tpl-name" className="text-input" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Wedding agreement" maxLength={120} />
              </div>
              <label className="btn secondary" style={{ cursor: 'pointer' }}>
                Upload PDF
                <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleTemplateUpload} />
              </label>
            </div>
            <ul className="team-list" style={{ marginTop: 8 }}>
              {templates.map((t) => (
                <li key={t.id} className="team-list-item">
                  <span style={{ flex: 1 }}><strong>{t.name}</strong> <span className="hint">· {(t.file_size / 1024).toFixed(0)} KB</span></span>
                  <button type="button" className="btn secondary" onClick={() => deleteContractTemplate(t.id).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Delete</button>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={`Client contracts (${contracts.length})`} hint="Assign a template to a client email — they sign with a name + checkbox.">
            <form className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }} onSubmit={handleAssignContract}>
              <div>
                <label className="field-label" htmlFor="cc-tpl">Template (optional)</label>
                <select id="cc-tpl" className="text-input" value={contractForm.template_id} onChange={(e) => setContractForm({ ...contractForm, template_id: e.target.value })}>
                  <option value="">No file</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="cc-email">Client email</label>
                <input id="cc-email" className="text-input" type="email" value={contractForm.client_email} onChange={(e) => setContractForm({ ...contractForm, client_email: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="cc-event">Event id (optional)</label>
                <input id="cc-event" className="text-input" value={contractForm.event_id} onChange={(e) => setContractForm({ ...contractForm, event_id: e.target.value })} placeholder="event uuid" style={{ maxWidth: 220 }} />
              </div>
              <button className="btn" type="submit">Assign</button>
            </form>
            <ul className="team-list">
              {contracts.map((c) => (
                <li key={c.id} className="team-list-item">
                  <span style={{ flex: 1 }}>
                    <strong>{c.client_email}</strong>
                    <span className="hint"> · {c.template_name || 'no file'} · {c.status}{c.signature_name ? ` · signed by ${c.signature_name}` : ''}</span>
                  </span>
                  <button type="button" className="btn secondary" onClick={() => deleteContract(c.id).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Delete</button>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {tab === 'questionnaires' && (
        <>
          <Section title="Questionnaires" hint="Build once — title plus questions (text, choice with options, date) — then assign per event + client.">
            <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <label className="field-label" htmlFor="q-title">Title</label>
                <input id="q-title" className="text-input" value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="e.g. Wedding day details" maxLength={120} />
              </div>
            </div>
            {qQuestions.map((q, i) => (
              <div className="row" key={i} style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ flex: 2, minWidth: 180 }}>
                  <label className="field-label">Question {i + 1}</label>
                  <input className="text-input" value={q.label} onChange={(e) => setQQuestions((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="e.g. Venue address?" maxLength={500} />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <select className="text-input" value={q.type} onChange={(e) => setQQuestions((prev) => prev.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
                    <option value="text">Text</option>
                    <option value="choice">Choice</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                {q.type === 'choice' && (
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label className="field-label">Options (one per line)</label>
                    <textarea className="text-input" rows={2} value={q.options} onChange={(e) => setQQuestions((prev) => prev.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)))} />
                  </div>
                )}
                <button type="button" className="btn secondary" onClick={() => setQQuestions((prev) => prev.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <button type="button" className="btn secondary" onClick={() => setQQuestions((prev) => [...prev, { id: `q${prev.length + 1}`, label: '', type: 'text', options: '' }])}>Add question</button>
              <button type="button" className="btn" onClick={handleCreateQuestionnaire}>Create questionnaire</button>
            </div>
            <ul className="team-list" style={{ marginTop: 10 }}>
              {questionnaires.map((q) => (
                <li key={q.id} className="team-list-item" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ flex: 1 }}><strong>{q.title}</strong> <span className="hint">· {q.questions?.length || 0} questions · {q.assignment_count} assigned{q.active ? '' : ' · inactive'}</span></span>
                    <button type="button" className="btn secondary" onClick={() => openAssignments(q.id)}>Responses</button>
                    <button type="button" className="btn secondary" onClick={() => deleteQuestionnaire(q.id).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Delete</button>
                  </div>
                  {viewQ?.id === q.id && (
                    <div style={{ marginTop: 8 }}>
                      {viewQ.rows.length === 0 ? <p className="hint">No assignments yet.</p> : viewQ.rows.map((a) => (
                        <p className="hint" key={a.assignment_id}>
                          {a.event?.name || a.event} · {a.client_email || 'client'} · {a.submitted ? `answered ${new Date(a.submitted_at).toLocaleDateString()}` : 'awaiting answer'}
                          {a.submitted && a.answers && <span> — {Object.entries(a.answers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}</span>}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Assign questionnaire" hint="Point a questionnaire at an event + client email.">
            <form className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={handleAssignQuestionnaire}>
              <div>
                <label className="field-label" htmlFor="aq-q">Questionnaire</label>
                <select id="aq-q" className="text-input" value={assignForm.questionnaire_id} onChange={(e) => setAssignForm({ ...assignForm, questionnaire_id: e.target.value })}>
                  <option value="">Pick…</option>
                  {questionnaires.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="aq-e">Event id</label>
                <input id="aq-e" className="text-input" value={assignForm.event_id} onChange={(e) => setAssignForm({ ...assignForm, event_id: e.target.value })} placeholder="event uuid" style={{ maxWidth: 220 }} />
              </div>
              <div>
                <label className="field-label" htmlFor="aq-c">Client email</label>
                <input id="aq-c" className="text-input" type="email" value={assignForm.client_email} onChange={(e) => setAssignForm({ ...assignForm, client_email: e.target.value })} />
              </div>
              <button className="btn" type="submit">Assign</button>
            </form>
          </Section>
        </>
      )}

      {tab === 'bookings' && (
        <Section title={`Bookings (${visibleBookings.length})`} hint="Money side of events — agreed amounts plus linked billing-module bills, advances, and balances.">
          <div className="row" style={{ marginBottom: 8 }}>
            {['', 'inquiry', 'confirmed', 'completed', 'cancelled'].map((s) => (
              <button key={s} type="button" className={bookingFilter === s ? 'upload-tab active' : 'upload-tab'} onClick={() => setBookingFilter(s)}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
          <form className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }} onSubmit={handleCreateBooking}>
            <div>
              <label className="field-label" htmlFor="bk-name">Client name</label>
              <input id="bk-name" className="text-input" value={bookingForm.client_name} onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })} maxLength={120} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-email">Client email</label>
              <input id="bk-email" className="text-input" type="email" value={bookingForm.client_email} onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-type">Event type</label>
              <input id="bk-type" className="text-input" value={bookingForm.event_type} onChange={(e) => setBookingForm({ ...bookingForm, event_type: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-date">Event date</label>
              <input id="bk-date" className="text-input" type="date" value={bookingForm.event_date} onChange={(e) => setBookingForm({ ...bookingForm, event_date: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-amt">Agreed amount (₹)</label>
              <input id="bk-amt" className="text-input" type="number" min="0" value={bookingForm.agreed_amount} onChange={(e) => setBookingForm({ ...bookingForm, agreed_amount: e.target.value })} style={{ maxWidth: 140 }} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-pkg">Package</label>
              <select id="bk-pkg" className="text-input" value={bookingForm.package_id} onChange={(e) => setBookingForm({ ...bookingForm, package_id: e.target.value })} style={{ maxWidth: 180 }}>
                <option value="">None</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="bk-event">Event id</label>
              <input id="bk-event" className="text-input" value={bookingForm.event_id} onChange={(e) => setBookingForm({ ...bookingForm, event_id: e.target.value })} placeholder="event uuid" style={{ maxWidth: 170 }} />
            </div>
            <div>
              <label className="field-label" htmlFor="bk-bill">Bill id</label>
              <input id="bk-bill" className="text-input" value={bookingForm.bill_id} onChange={(e) => setBookingForm({ ...bookingForm, bill_id: e.target.value })} placeholder="bill uuid (Invoicing)" style={{ maxWidth: 170 }} />
            </div>
            <button className="btn" type="submit">Add booking</button>
          </form>
          {visibleBookings.length === 0 ? (
            <p className="hint">{bookingFilter ? `No ${bookingFilter} bookings.` : 'No bookings yet — add one above.'}</p>
          ) : (
          <ul className="team-list">
            {visibleBookings.map((b) => (
              <li key={b.id} className="team-list-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }}>
                    <strong>{b.client_name}</strong>
                    <span className="hint"> · {b.event_type || 'event'}{b.event_date ? ` · ${new Date(b.event_date).toLocaleDateString()}` : ''} · {b.status}{b.agreed_amount != null ? ` · ₹${Number(b.agreed_amount).toLocaleString('en-IN')}` : ''}{b.bill_id ? ' · billed' : ''}</span>
                  </span>
                  <button type="button" className="btn secondary" onClick={() => openBooking(b.id)}>Money view</button>
                  {b.status === 'inquiry' && (
                    <button type="button" className="btn secondary" onClick={() => updateBooking(b.id, { status: 'confirmed' }).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Confirm</button>
                  )}
                  {b.status === 'confirmed' && (
                    <button type="button" className="btn secondary" onClick={() => updateBooking(b.id, { status: 'completed' }).then(reload).catch((e) => showToast(e.message, { type: 'error' }))}>Complete</button>
                  )}
                </div>
                {bookingDetail?.id === b.id && (
                  <div className="card" style={{ marginTop: 8 }}>
                    <p>Agreed: <strong>{money(bookingDetail.agreed_amount)}</strong></p>
                    {bookingDetail.bill ? (
                      <p className="hint">
                        Bill #{bookingDetail.bill.bill_number} ({bookingDetail.bill.status}): payable {money(bookingDetail.bill.payable)} ·
                        paid {money(bookingDetail.bill.paid)} · balance {money(bookingDetail.bill.balance_due)} ·
                        {bookingDetail.bill.receipt_count} receipt(s)
                      </p>
                    ) : (
                      <p className="hint">No bill linked yet — attach one from Invoicing, then set it here via API, or track the agreed amount.</p>
                    )}
                    <p>Advance status: <strong>{bookingDetail.advance_status}</strong></p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          )}
        </Section>
      )}

      {tab === 'expenses' && (
        <>
          <Section title="Profit estimate" hint="Booked income vs recorded expenses.">
            {!report ? <p className="hint">No data yet.</p> : (
              <div className="stat-grid">
                <div><div className="hint">Income booked</div><div>{money(report.income_total)}</div></div>
                <div><div className="hint">Collected</div><div>{money(report.collected_total)}</div></div>
                <div><div className="hint">Expenses</div><div>{money(report.expenses_total)}</div></div>
                <div><div className="hint">Profit estimate</div><div>{money(report.profit_estimate)}</div></div>
              </div>
            )}
            {report && Object.keys(report.expenses_by_category || {}).length > 0 && (
              <p className="hint" style={{ marginTop: 8 }}>
                By category: {Object.entries(report.expenses_by_category).map(([c, v]) => `${c} ${money(v)}`).join(' · ')}
              </p>
            )}
          </Section>
          <Section title={`Expenses (${expenses.length})`} hint="Track what each event (or the studio) costs.">
            <form className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }} onSubmit={handleCreateExpense}>
              <div>
                <label className="field-label" htmlFor="ex-cat">Category</label>
                <input id="ex-cat" className="text-input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} placeholder="e.g. travel" maxLength={80} />
              </div>
              <div>
                <label className="field-label" htmlFor="ex-amt">Amount (₹)</label>
                <input id="ex-amt" className="text-input" type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={{ maxWidth: 140 }} />
              </div>
              <div>
                <label className="field-label" htmlFor="ex-vendor">Vendor</label>
                <input id="ex-vendor" className="text-input" value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} maxLength={120} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="field-label" htmlFor="ex-notes">Notes</label>
                <input id="ex-notes" className="text-input" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} maxLength={1000} />
              </div>
              <div>
                <label className="field-label" htmlFor="ex-event">Event id</label>
                <input id="ex-event" className="text-input" value={expenseForm.event_id} onChange={(e) => setExpenseForm({ ...expenseForm, event_id: e.target.value })} placeholder="optional" style={{ maxWidth: 170 }} />
              </div>
              <div>
                <label className="field-label" htmlFor="ex-spent">Spent on</label>
                <input id="ex-spent" className="text-input" type="date" value={expenseForm.spent_at} onChange={(e) => setExpenseForm({ ...expenseForm, spent_at: e.target.value })} />
              </div>
              <button className="btn" type="submit">Record</button>
            </form>
            <ul className="team-list">
              {expenses.map((x) => (
                <li key={x.id} className="team-list-item">
                  <span style={{ flex: 1 }}>
                    <strong>{x.category}</strong> · {money(x.amount)}
                    <span className="hint">{x.vendor ? ` · ${x.vendor}` : ''}{x.event_name ? ` · ${x.event_name}` : ''} · {new Date(x.spent_at).toLocaleDateString()}</span>
                  </span>
                  <button type="button" className="btn secondary" onClick={async () => {
                    const ok = await confirm(`Delete this ${money(x.amount)} expense?`, { title: 'Delete expense?', confirmLabel: 'Delete', danger: true })
                    if (ok) deleteExpense(x.id).then(reload).catch((e) => showToast(e.message, { type: 'error' }))
                  }}>Delete</button>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  )
}
