import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { listAdminEvents } from '../api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import GoldButton from '../components/ui/GoldButton.jsx'
import Badge from '../components/ui/Badge.jsx'

export default function AdminEvents() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listAdminEvents(search, page, statusFilter)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [search, page, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search typing
    return () => clearTimeout(t)
  }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <CalendarDays size={22} className="text-gold-500" /> All Events
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Every event on the platform, across every studio — find one by name or owner email.
        </p>
      </div>

      <GlassCard hover={false}>
        <div className="flex gap-3 flex-wrap items-center">
          <input
            className="text-input flex-1"
            style={{ minWidth: 220 }}
            placeholder="Search by event name or owner email…"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'archived', label: 'Archived' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setStatusFilter(key); setPage(1) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === key ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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
                  <th>Owner</th>
                  <th>Photos</th>
                  <th>Status</th>
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
                    <td>{e.archived_at ? <Badge variant="gold">Archived</Badge> : <Badge variant="success">Active</Badge>}</td>
                    <td>{new Date(e.created_at).toLocaleDateString()}</td>
                    <td>{new Date(e.expires_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <Link to={`/admin/events/${e.id}`}>
                        <GoldButton size="sm" variant="outline">View</GoldButton>
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.events.length === 0 && (
                  <tr>
                    <td colSpan={7} className="hint">No events match that search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="data-table-pagination">
            <span>{data.total} event{data.total === 1 ? '' : 's'} total</span>
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
