import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, FileText, Heart, Table } from 'lucide-react'
import {
  downloadClientFavouritesZip,
  downloadClientSelectionCsv,
  downloadClientSelectionPdf,
  downloadClientSelectionTxt,
  fileUrl,
  getClientEvent,
  listClientPhotos,
} from '../api.js'
import { useToast } from '../toast.jsx'
import useBrandColours from '../hooks/useBrandColours.js'
import GoldButton from '../components/ui/GoldButton.jsx'
import SkeletonLoader from '../components/ui/SkeletonLoader.jsx'
import { MiniLoader } from '../components/ui/StudioLoader.jsx'
import GalleryMedia from '../components/GalleryMedia.jsx'

// The client's favourited subset of one event, with a zip download (if the
// studio allows it). Mirrors the favourites bottom-sheet content as its own
// page, like Studio-Verse's /gallery/:eventId/favourites route.
export default function ClientFavourites() {
  const { eventId } = useParams()
  const { showToast } = useToast()
  const containerRef = useRef(null)
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)
  // Phase 1 — self-service selection record (CSV/TXT/PDF), same
  // allow-download gate as the zip. Tracks which format is in flight.
  const [exportingFormat, setExportingFormat] = useState(null)

  const handleRecordExport = async (format) => {
    setExportingFormat(format)
    try {
      if (format === 'csv') await downloadClientSelectionCsv(eventId)
      else if (format === 'txt') await downloadClientSelectionTxt(eventId)
      else await downloadClientSelectionPdf(eventId)
      showToast('Export downloaded')
    } catch (e) {
      showToast(e.message, { type: 'error' })
    } finally {
      setExportingFormat(null)
    }
  }

  useEffect(() => {
    getClientEvent(eventId).then(setEvent).catch((e) => setError(e.message))
    listClientPhotos(eventId).then(setPhotos).catch((e) => setError(e.message))
  }, [eventId])

  useBrandColours(containerRef, event?.brand_color || null, null)

  const favourites = (photos || []).filter((p) => p.is_favourite)
  const allowDownload = event?.allow_download !== false
  const watermarkText = event?.watermark_text || event?.event_name || 'PandaSpot'
  const watermarkIntensity = Number.isFinite(Number(event?.watermark_intensity)) ? Number(event.watermark_intensity) : 0.75

  const handleDownload = async () => {
    if (favourites.length === 0) return
    setDownloading(true)
    setProgress({ loaded: 0, total: null })
    try {
      const safeName = (event?.event_name || 'event').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'event'
      const blob = await downloadClientFavouritesZip(eventId, setProgress)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName}_my_favourites.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      showToast('Download started!')
    } catch (e) {
      showToast(e.message || 'Download failed — downloads may be disabled for this event', { type: 'error' })
    } finally {
      setDownloading(false)
      setProgress(null)
    }
  }

  if (error && !event) return <p className="error">{error}</p>
  if (!event || !photos) {
    return (
      <div className="space-y-4">
        <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MiniLoader size={22} /> Loading favourites…
        </p>
        <SkeletonLoader type="photo-grid" count={3} />
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <Link className="back-link" to={`/client/${eventId}`}>&larr; Back to gallery</Link>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          My Favourites{favourites.length > 0 ? ` (${favourites.length})` : ''}
        </h1>
        {allowDownload && favourites.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <GoldButton size="sm" variant="outline" icon={<Table size={14} />} loading={exportingFormat === 'csv'} onClick={() => handleRecordExport('csv')} title="My selected filenames as CSV">
              CSV
            </GoldButton>
            <GoldButton size="sm" variant="outline" icon={<FileText size={14} />} loading={exportingFormat === 'txt'} onClick={() => handleRecordExport('txt')} title="My selected filenames as TXT">
              TXT
            </GoldButton>
            <GoldButton size="sm" variant="outline" icon={<FileText size={14} />} loading={exportingFormat === 'pdf'} onClick={() => handleRecordExport('pdf')} title="Branded proofing report (PDF)">
              Proof
            </GoldButton>
            <GoldButton size="sm" variant="outline" icon={<Download size={14} />} loading={downloading} onClick={handleDownload}>
              Download
            </GoldButton>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {downloading && progress && progress.loaded > 0 && (
        <p className="hint">Downloading… {(progress.loaded / 1048576).toFixed(1)} MB</p>
      )}

      {favourites.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <Heart size={48} className="text-[var(--text-tertiary)] mb-4 animate-float" />
          <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No favourites yet</h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Tap the heart on any photo to save your favourites</p>
          <Link to={`/client/${eventId}`}>
            <GoldButton variant="outline">Browse Gallery</GoldButton>
          </Link>
        </div>
      ) : (
        <div
          className="protected-gallery"
          style={{ '--watermark-opacity': watermarkIntensity }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="photo-grid">
            {favourites.map((p) => (
              <div className="photo-card no-select" key={p.photo_id}>
                <div className="protected-photo-frame" data-watermark={event.watermark_image_url ? '' : watermarkText} style={{ position: 'relative' }}>
                  <GalleryMedia
                    src={fileUrl(p.protected_thumbnail_url || p.protected_url)}
                    filename={p.filename}
                    style={{ width: '100%', display: 'block' }}
                  />
                  {event.watermark_image_url && (
                    <img
                      src={fileUrl(event.watermark_image_url)}
                      alt=""
                      className="watermark-image-overlay"
                      draggable="false"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                </div>
                <div className="meta">
                  <span className="hint">{p.filename}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
