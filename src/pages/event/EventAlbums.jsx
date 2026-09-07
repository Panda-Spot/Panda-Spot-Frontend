import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createAlbum } from '../../api.js'
import { useToast } from '../../toast.jsx'
import { useEvent } from './EventContext.jsx'

export default function EventAlbums() {
  const { showToast } = useToast()
  const {
    eventId, event, albums, albumsError, newAlbumName, setNewAlbumName,
    creatingAlbum, setCreatingAlbum, loadAlbums, handleStartEvent, startingEvent, setActiveTab,
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
              <span style={{ fontSize: 28 }}>📸</span>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Event not started</h3>
            <p className="hint" style={{ maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Start the event to unlock Albums and all other features.
            </p>
            {event.role === 'owner' && (
              <button className="btn" type="button" onClick={handleStartEvent} disabled={startingEvent}>
                {startingEvent ? 'Starting…' : 'Start event'}
              </button>
            )}
            {event.role !== 'owner' && (
              <p className="hint">Only the event owner can start the event.</p>
            )}
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
                <li key={a.id} className="team-list-item">
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
