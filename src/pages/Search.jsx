import { useEffect, useState } from 'react'
import { fileUrl, listAlbums, searchBySelfie } from '../api.js'

export default function Search() {
  const [albums, setAlbums] = useState([])
  const [albumId, setAlbumId] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [preview, setPreview] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    listAlbums().then((data) => {
      setAlbums(data)
      if (data.length > 0) setAlbumId(data[0].album_id)
    }).catch((e) => setError(e.message))
  }, [])

  const handleSelfie = (e) => {
    const file = e.target.files?.[0]
    setSelfie(file || null)
    setPreview(file ? URL.createObjectURL(file) : '')
    setResult(null)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!albumId || !selfie) return
    setSearching(true)
    setError('')
    setResult(null)
    try {
      const data = await searchBySelfie(albumId, selfie)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <h1 className="section-title">Find my photos</h1>
      <p className="subtle">Pick the album and upload a clear, front-facing selfie — we'll find every photo you're in.</p>

      <form className="card" onSubmit={handleSearch}>
        <div className="row">
          <select className="text-input" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
            {albums.length === 0 && <option value="">No albums available</option>}
            {albums.map((a) => (
              <option key={a.album_id} value={a.album_id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="file-drop">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSelfie} />
          {preview && <p className="hint"><img src={preview} alt="Selfie preview" style={{ maxWidth: 120, borderRadius: 8, marginTop: 10 }} /></p>}
        </div>
        <button className="btn" type="submit" disabled={searching || !albumId || !selfie} style={{ marginTop: 16 }}>
          {searching ? 'Searching…' : 'Find My Photos'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <>
          <p className="hint">
            Detected {result.faces_detected_in_selfie} face(s) in your selfie — found {result.matches.length} matching photo(s).
          </p>
          <div className="match-grid">
            {result.matches.map((m) => (
              <div className="photo-card match-card" key={m.photo_id}>
                <img src={fileUrl(m.url)} alt={m.filename} />
                <div className="meta">
                  <span>Match</span>
                  <span>{Math.round(m.similarity * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
