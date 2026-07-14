import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fileUrl, getAlbum, listPhotos, uploadPhotos } from '../api.js'

export default function AlbumDetail() {
  const { albumId } = useParams()
  const [album, setAlbum] = useState(null)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const fileInput = useRef(null)

  const load = () => {
    getAlbum(albumId).then(setAlbum).catch((e) => setError(e.message))
    listPhotos(albumId).then(setPhotos).catch((e) => setError(e.message))
  }

  useEffect(load, [albumId])

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    setLastResult(null)
    try {
      const result = await uploadPhotos(albumId, files)
      setLastResult(result)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div>
      <Link className="back-link" to="/">&larr; All albums</Link>
      <h1 className="section-title">{album?.name || 'Album'}</h1>
      <p className="subtle">Bulk-upload the event photos here. Each photo is scanned for faces so guests can find themselves later.</p>

      <div className="file-drop">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFiles}
          disabled={uploading}
        />
        <p className="hint">{uploading ? 'Processing photos — detecting faces…' : 'Select multiple photos to upload'}</p>
      </div>

      {error && <p className="error">{error}</p>}

      {lastResult && (
        <p className="hint">
          Processed {lastResult.photos_processed} photo(s), found {lastResult.faces_found} face(s).
          {lastResult.skipped.length > 0 && (
            <span className="skipped-list">
              Skipped: {lastResult.skipped.join(', ')}
            </span>
          )}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="hint">No photos uploaded yet.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div className="photo-card" key={p.photo_id}>
              <img src={fileUrl(p.url)} alt={p.filename} />
              <div className="meta">
                <span>{p.face_count} face{p.face_count === 1 ? '' : 's'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
