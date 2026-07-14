import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createAlbum, listAlbums } from '../api.js'

export default function Albums() {
  const [albums, setAlbums] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    listAlbums()
      .then(setAlbums)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createAlbum(name.trim())
      setName('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h1 className="section-title">Albums</h1>
      <p className="subtle">Create an album, then bulk-upload the photos from an event so guests can search them by selfie.</p>

      <form className="card row" onSubmit={handleCreate}>
        <input
          className="text-input"
          placeholder="Album name (e.g. Smith Wedding 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create Album'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="hint">Loading albums…</p>
      ) : albums.length === 0 ? (
        <p className="hint">No albums yet — create one above.</p>
      ) : (
        <ul className="album-list">
          {albums.map((a) => (
            <li key={a.album_id}>
              <Link to={`/albums/${a.album_id}`}>
                <span>{a.name}</span>
                <span className="count">{a.photo_count} photo{a.photo_count === 1 ? '' : 's'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
