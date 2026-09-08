import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Camera } from 'lucide-react'
import { createAlbum } from '../../api.js'
import { useToast } from '../../toast.jsx'
import { useEvent } from './EventContext.jsx'

export default function EventAlbums() {
  const { showToast } = useToast()
  const {
    eventId, event, albums, albumsError, newAlbumName, setNewAlbumName,
    creatingAlbum, setCreatingAlbum, loadAlbums,
    clients, assigningAlbumId, handleAssignAlbumClient,
    requestStartEvent, setActiveTab,
  } = useEvent()

  useEffect(() => { setActiveTab('albums') }, [setActiveTab])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newAlbumName.trim()) return
    setCreatingAlbum(true)
    try {
      const created = await createAlbum(eventId, { name: newAlbumName.trim(), fromFavourites: true })
      setNewAlbumName('')
      showToast(`Album created${created.source_count ? ` — ${created.source_count} favourite${created.source_count === 1 ? '' : 's'} staged` : ''}`)
      loadAlbums()
    } catch (err) {
      showToast(err.message, { type: 'error' })
    } finally {
      setCreatingAlbum(false)
    }
  }

  return (
    <div>
      <div className="event-stack">
        {event && !event.started ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Camera size={28} style={{ color: '#F59E0B' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
            <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Start the event to unlock Albums and all other features.
            </p>
            {event.role === 'owner' && (
                <button className="btn" type="button" onClick={requestStartEvent}>
                  Start event
                </button>
            )}
            {event.role !== 'owner' && (
              <p className="hint">Only the event owner can start the event.</p>
            )}
          </div>
        ) : !event?.albums_enabled ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <BookOpen size={28} style={{ color: '#F59E0B' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Albums is off</h3>
            <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Turn on Albums to stage favourites, upload designed spreads, and send versions for client review.
            </p>
            <Link className="btn secondary" to={`/events/${eventId}/danger`}>
              Open Danger section
            </Link>
          </div>
        ) : (
        <div className="card">
          <div className="guest-link-label">Albums ({albums ? albums.length : '…'})</div>
          <p className="hint">
            Stage client favourites as zero-cost sources, upload designed spreads or a print PDF,
            then send the album for pinned client review and approval.
          </p>
          <form
            className="row"
            onSubmit={handleCreate}
          >
            <input
              className="text-input"
              placeholder="New album name (e.g. Wedding Album)"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              maxLength={120}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="btn" type="submit" disabled={creatingAlbum || !newAlbumName.trim()}>
              {creatingAlbum ? 'Creating…' : 'Create + stage favourites'}
            </button>
          </form>
          {albumsError && <p className="error">{albumsError}</p>}
          {!albums ? (
            <p className="hint">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="hint">No albums yet — create one above.</p>
          ) : (
            <ul className="team-list">
              {albums.map((a) => (
                <li key={a.id} className="team-list-item" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1 }}>
                      <Link to={`/events/${eventId}/albums/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link>
                      <span className="hint">
                        {' '}· {a.status.replace(/_/g, ' ').toLowerCase()}
                        {' '}· {a.version_count} version{a.version_count === 1 ? '' : 's'}
                        {a.latest_version != null && ` (latest v${a.latest_version})`}
                        {' '}· {a.source_count} source{a.source_count === 1 ? '' : 's'}
                        {a.open_pins > 0 && ` · ${a.open_pins} open pin${a.open_pins === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <Link className="btn secondary" to={`/events/${eventId}/albums/${a.id}`}>Open</Link>
                  </div>
                  <AlbumClientPicker
                    album={a}
                    clients={clients || []}
                    assigning={assigningAlbumId === a.id}
                    onAssign={(clientId) => handleAssignAlbumClient(a.id, clientId)}
                  />
                </li>
              ))}
            </ul>
          )}
          </div>
        )}
      </div>
    </div>
  )
}

// Review-client picker per album: searchable over this event's clients
// (the fav-selection client list — already-created clients first by
// construction, since only event clients appear). Blank + save = every
// event client may review; picking one restricts the album to them.
function AlbumClientPicker({ album, clients, assigning, onAssign }) {
  const current = album.client || null
  const [q, setQ] = useState(current ? (current.name ? `${current.name} (${current.email})` : current.email) : '')

  useEffect(() => {
    setQ(current ? (current.name ? `${current.name} (${current.email})` : current.email) : '')
  }, [album.id, current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const match = clients.find((c) => c.email === q || (c.name && `${c.name} (${c.email})` === q))
  const dirty = q.trim() === ''
    ? !!current
    : !match || match.user_id !== current?.id

  return (
    <div style={{ marginTop: 8 }}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="hint">Review client:</span>
        <input
          className="text-input"
          type="search"
          placeholder={clients.length === 0 ? 'No clients on this event yet' : 'All event clients'}
          list={`album-clients-${album.id}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={assigning || clients.length === 0}
          style={{ maxWidth: 260 }}
        />
        <datalist id={`album-clients-${album.id}`}>
          {clients.map((c) => (
            <option key={c.user_id} value={c.email}>
              {c.name ? `${c.name} (${c.email})` : c.email}
            </option>
          ))}
        </datalist>
        <button
          className="btn secondary"
          type="button"
          disabled={assigning || !dirty || (q.trim() !== '' && !match)}
          onClick={() => onAssign(match ? match.user_id : null)}
          title={q.trim() === '' ? 'Open this album to every event client' : 'Assign this album to the matched client'}
        >
          {assigning ? 'Saving…' : q.trim() === '' ? 'Open to all' : 'Assign'}
        </button>
      </div>
      {current && (
        <p className="hint" style={{ margin: '4px 0 0' }}>
          Assigned to {current.name || current.email} — only they can review this album.
        </p>
      )}
    </div>
  )
}
