import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAdminEvents } from '../api.js'

export default function AdminEvents() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listAdminEvents(search, page)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search typing
    return () => clearTimeout(t)
  }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div>
      <h1 className="section-title">Events</h1>
      <p className="subtle">Every event on the platform, across every client — find one by name or owner email.</p>

      <div className="data-table-toolbar">
        <input
          className="text-input"
          placeholder="Search by event name or owner email…"
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
                  <th>Owner</th>
                  <th>Photos</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.owner_email}</td>
                    <td>{e.photo_count}</td>
                    <td>{new Date(e.created_at).toLocaleDateString()}</td>
                    <td>{new Date(e.expires_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <Link className="btn secondary" to={`/admin/events/${e.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
                {data.events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="hint">No events match that search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="data-table-pagination">
            <span>{data.total} event{data.total === 1 ? '' : 's'} total</span>
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
