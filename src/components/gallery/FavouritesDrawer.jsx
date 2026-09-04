import React, { useState } from 'react'
import { Heart, Download } from 'lucide-react'
import Drawer from '../ui/Drawer'
import GoldButton from '../ui/GoldButton'
import GalleryMedia from '../GalleryMedia'
import { downloadClientFavouritesZip, fileUrl } from '../../api.js'
import { useToast } from '../../toast.jsx'

function ThumbImage({ photo }) {
  const src = photo.protected_thumbnail_url || photo.protected_url
  if (!src) return <div className="skeleton w-20 h-20 rounded-lg flex-shrink-0" />
  return (
    <GalleryMedia
      src={fileUrl(src)}
      filename={photo.filename}
      controls={false}
      preload="metadata"
      className="w-20 h-20 object-cover rounded-lg flex-shrink-0 no-select"
    />
  )
}

// Bottom-sheet favourites tray with its own download action — the download
// honors the studio's allow_download opt-out server-side.
export default function FavouritesDrawer({ open, onClose, photos = [], eventId, eventName, allowDownload }) {
  const { showToast } = useToast()
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)
  const favourited = photos.filter((p) => p.is_favourite)
  const count = favourited.length

  const handleDownload = async () => {
    if (!eventId || count === 0) return
    setDownloading(true)
    setProgress({ loaded: 0, total: null })
    try {
      const safeName = (eventName || 'event').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'event'
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
    } catch (err) {
      showToast(err.message || 'Download failed — downloads may be disabled for this event', { type: 'error' })
    } finally {
      setDownloading(false)
      setProgress(null)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && count > 0 && (
        <button
          onClick={onClose}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3
            bg-gold-500 hover:bg-gold-400 text-obsidian-base rounded-full shadow-gold-lg
            font-semibold text-sm transition-all duration-200 hover:scale-105"
        >
          <Heart size={16} className="fill-current" />
          <span>{count} favourite{count !== 1 ? 's' : ''}</span>
        </button>
      )}

      <Drawer open={open} onClose={onClose} title={`My Favourites (${count})`} side="bottom">
        {count === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Heart size={40} className="text-[var(--text-tertiary)] mb-3" />
            <p className="text-[var(--text-secondary)]">No favourites yet — tap the heart on any photo</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {favourited.map((p) => <ThumbImage key={p.photo_id} photo={p} />)}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {allowDownload ? (
                <GoldButton size="sm" icon={<Download size={14} />} loading={downloading} onClick={handleDownload}>
                  Download Favourites
                </GoldButton>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Downloads are disabled for this event by the studio
                </span>
              )}
            </div>
            {downloading && progress && progress.loaded > 0 && (
              <p className="text-xs mt-2 text-right" style={{ color: 'var(--text-tertiary)' }}>
                {(progress.loaded / 1048576).toFixed(1)} MB downloaded…
              </p>
            )}
          </>
        )}
      </Drawer>
    </>
  )
}
