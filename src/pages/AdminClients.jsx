import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { createAdminStudio, listAdminPlans, listAdminUsers, suspendAdminUser, unsuspendAdminUser } from '../api.js'
import { useConfirm } from '../confirm.jsx'
import { useToast } from '../toast.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

export default function AdminClients() {
  const confirm = useConfirm()
  const { showToast } = useToast()
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
    if (!user.is_suspended) {
      const ok = await confirm(
        `Suspend ${user.email}? They and their clients lose access immediately; nothing is deleted.`,
        { title: 'Suspend studio?', confirmLabel: 'Suspend' }
      )
      if (!ok) return
    }
    setTogglingId(user.id)
    setError('')
    try {
      if (user.is_suspended) await unsuspendAdminUser(user.id)
      else await suspendAdminUser(user.id)
      showToast(user.is_suspended ? 'Studio reactivated' : 'Studio suspended')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Building2 size={22} className="text-gold-500" /> Studios
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Every studio account on the platform — search, review usage, and act on one.
        </p>
      </div>

      <GlassCard hover={false}>
      <form onSubmit={handleCreate}>
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
          <GoldButton type="submit" loading={creating} disabled={!draft.name.trim() || !draft.email.trim() || (!!draft.plan_id && !draft.free_access_until)}>
            Create studio
          </GoldButton>
        </div>
        {createdStudio && (
          <p className="hint" style={{ border: '1px dashed var(--accent-primary)', borderRadius: 8, padding: 8, marginTop: 8 }}>
            Created {createdStudio.email}
            {createdStudio.generated_password && (
              <> · temporary password (shown once): <strong style={{ userSelect: 'all' }}>{createdStudio.generated_password}</strong></>
            )}
            {createdStudio.credentials_email_sent === false && createdStudio.generated_password && ' · the credentials email could not be sent — copy it now.'}
          </p>
        )}
      </form>
      </GlassCard>

      <GlassCard hover={false}>
        <input
          className="text-input w-full"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
      </GlassCard>

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
                      {u.is_suspended ? <Badge variant="error">Suspended</Badge> : <Badge variant="success">Active</Badge>}
                    </td>
                    <td>{u.email_verified ? 'Yes' : 'No'}</td>
                    <td>{u.event_count}</td>
                    <td>{formatBytes(u.storage_used_bytes)}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <Link to={`/admin/clients/${u.id}`}>
                        <GoldButton size="sm" variant="outline">View</GoldButton>
                      </Link>
                      {u.is_suspended ? (
                        <GoldButton size="sm" variant="outline" type="button" onClick={() => handleToggleSuspend(u)} disabled={togglingId === u.id}>
                          Reactivate
                        </GoldButton>
                      ) : (
                        <GoldButton size="sm" variant="danger" type="button" onClick={() => handleToggleSuspend(u)} disabled={togglingId === u.id}>
                          Suspend
                        </GoldButton>
                      )}
                    </td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="hint">No studios match that search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="data-table-pagination">
            <span>{data.total} studio{data.total === 1 ? '' : 's'} total</span>
            <div className="row">
              <GoldButton size="sm" variant="outline" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </GoldButton>
              <span>Page {page} of {totalPages}</span>
              <GoldButton size="sm" variant="outline" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </GoldButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
