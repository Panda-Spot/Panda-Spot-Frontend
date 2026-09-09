import React from 'react'
import { isVideoFile } from '../utils/media.js'

/**
 * One tile that renders either a photo or a video. Videos have no poster
 * frame service (see server thumbnail notes) — the <video> element with
 * preload="metadata" renders the first frame natively without downloading
 * the whole file. Right-click/drag are suppressed like the rest of the
 * protected gallery surfaces.
 */
export default function GalleryMedia({
  src,
  filename,
  alt,
  className,
  style,
  controls = true,
  preload = 'metadata',
  onClick,
  onError,
  // Pass priority for above-the-fold tiles (e.g. first row of the
  // manager grid). Edge/Chrome replace in-viewport lazy images with
  // placeholders and defer their load events ("Intervention" console
  // warning) — eager + high fetch priority opts those tiles out.
  priority = false,
}) {
  if (isVideoFile(filename)) {
    return (
      <video
        src={src}
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
        controls={controls}
        preload={preload}
        playsInline
        disablePictureInPicture={false}
        onClick={onClick}
        onError={onError}
        onContextMenu={(e) => e.preventDefault()}
      />
    )
  }
  return (
    <img
      src={src}
      alt={alt || filename || ''}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onClick={onClick}
      onError={onError}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
