import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAdminUsers, suspendAdminUser, unsuspendAdminUser } from '../api.js'

function formatBytes(bytes) {
  return `${(bytes / 1e9).toFixed(2)}GB`
}

export default function AdminClients() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const load = useCallback(() => {
    listAdminUsers(search, page)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search typing
    return () => clearTimeout(t)
  }, [load])

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
      <p className="subtle">Every photographer account on the platform — search, review usage, and act on one.</p>

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
            <span>{data.total} client{data.total === 1 ? '' : 's'} total</span>
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
