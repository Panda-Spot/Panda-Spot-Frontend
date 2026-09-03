import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createAdminStudio, listAdminPlans, listAdminUsers, suspendAdminUser, unsuspendAdminUser } from '../api.js'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

export default function AdminClients() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createdStudio, setCreatedStudio] = useState(null)
  const [draft, setDraft] = useState({ name: '', email: '', password: '', plan_id: '', free_access_until: '' })

  const load = useCallback(() => {
    listAdminUsers(search, page, 'ADMIN')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search typing
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    listAdminPlans()
      .then((items) => setPlans(items.filter((p) => p.planType === 'SUBSCRIPTION' && p.isActive)))
      .catch(() => setPlans([]))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setCreatedStudio(null)
    try {
      const payload = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        password: draft.password || undefined,
        plan_id: draft.plan_id || undefined,
        free_access_until: draft.plan_id ? draft.free_access_until : undefined,
      }
      const created = await createAdminStudio(payload)
      setCreatedStudio(created)
      setDraft({ name: '', email: '', password: '', plan_id: '', free_access_until: '' })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleSuspend = async (user) => {
    setTogglingId(user.id)
    setError('')
    try {
      if (user.is_suspended) await unsuspendAdminUser(user.id)
      else await suspendAdminUser(user.id)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div>
      <h1 className="section-title">Clients</h1>
      <p className="subtle">Every studio account on the platform — search, review usage, and act on one.</p>

      <form className="card billing-card" onSubmit={handleCreate}>
        <div className="guest-link-label">Create studio</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <input className="text-input" placeholder="Studio / owner name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <input className="text-input" type="email" placeholder="Owner email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
          <input className="text-input" type="text" placeholder="Password (blank = generate)" value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} />
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <select className="text-input" value={draft.plan_id} onChange={(e) => setDraft((d) => ({ ...d, plan_id: e.target.value }))}>
            <option value="">No free plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.planName}</option>)}
          </select>
          <input className="text-input" type="date" value={draft.free_access_until} onChange={(e) => setDraft((d) => ({ ...d, free_access_until: e.target.value }))} disabled={!draft.plan_id} />
          <button className="btn" type="submit" disabled={creating || !draft.name.trim() || !draft.email.trim() || (!!draft.plan_id && !draft.free_access_until)}>
            {creating ? 'Creating…' : 'Create studio'}
          </button>
        </div>
        {createdStudio && (
          <p className="hint">
            Created {createdStudio.email}
            {createdStudio.generated_password && ` · temporary password: ${createdStudio.generated_password}`}
          </p>
        )}
      </form>

      <div className="data-table-toolbar">
        <input
          className="text-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {!data ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Events</th>
                  <th>Storage</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status-pill ${u.is_suspended ? 'suspended' : 'active'}`}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td>{u.email_verified ? 'Yes' : 'No'}</td>
                    <td>{u.event_count}</td>
                    <td>{formatBytes(u.storage_used_bytes)}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <Link className="btn secondary" to={`/admin/clients/${u.id}`}>View</Link>
                      <button
                        className={`btn ${u.is_suspended ? 'secondary' : 'danger-btn'}`}
                        type="button"
                        onClick={() => handleToggleSuspend(u)}
                        disabled={togglingId === u.id}
                      >
                        {u.is_suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="hint">No clients match that search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="data-table-pagination">
            <span>{data.total} studio{data.total === 1 ? '' : 's'} total</span>
            <div className="row">
              <button className="btn secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn secondary" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
