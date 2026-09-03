// Builds a watermarked, share-ready copy of a matched photo: the original
// image with a bottom banner overlay carrying the studio/PandaSpot brand and
// a link back to this event's guest page. This is the viral loop — whoever
// receives a shared photo sees "Get your own photos" and can click straight
// through to search for themselves.

const MAX_DIMENSION = 1600
const DEFAULT_ACCENT = '#0e8a8a'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * @param {object} opts
 * @param {string} opts.photoUrl - full URL of the source photo (must allow CORS, e.g. via fileUrl())
 * @param {string} opts.eventName
 * @param {string} opts.guestUrl - the event's public guest link
 * @param {string|null} opts.studioName
 * @param {string|null} opts.brandColor - hex color, falls back to the default PandaSpot purple
 * @returns {Promise<Blob>} a PNG blob of the watermarked image
 */
export async function createWatermarkedShareImage({ photoUrl, eventName, guestUrl, studioName, brandColor }) {
  const img = await loadImage(photoUrl)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)
  const bannerHeight = Math.max(64, Math.round(height * 0.12))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height + bannerHeight
  const ctx = canvas.getContext('2d')

  ctx.drawImage(img, 0, 0, width, height)

  // Banner background
  const accent = brandColor || DEFAULT_ACCENT
  ctx.fillStyle = accent
  ctx.fillRect(0, height, width, bannerHeight)

  // Brand line (studio name if set, else PandaSpot)
  const pad = Math.max(16, Math.round(bannerHeight * 0.18))
  const brandFontSize = Math.max(16, Math.round(bannerHeight * 0.32))
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${brandFontSize}px system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const brandLine = studioName ? `${studioName} · via PandaSpot` : 'PandaSpot'
  ctx.fillText(brandLine, pad, height + pad * 0.6, width - pad * 2)

  // Call to action
  const ctaFontSize = Math.max(13, Math.round(bannerHeight * 0.22))
  ctx.font = `400 ${ctaFontSize}px system-ui, sans-serif`
  ctx.globalAlpha = 0.92
  const ctaText = eventName ? `Spot yourself at ${eventName} — ${guestUrl}` : `Get your own photos — ${guestUrl}`
  ctx.fillText(ctaText, pad, height + pad * 0.6 + brandFontSize + 6, width - pad * 2)
  ctx.globalAlpha = 1

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not generate share image'))), 'image/png')
  })
}

/**
 * Shares (via the Web Share API, when available and it supports files) or
 * falls back to downloading the watermarked image. Returns 'shared' or
 * 'downloaded' so the caller can show an appropriate confirmation message.
 */
export async function shareOrDownload(blob, filename, { title, text } = {}) {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // Fall through to download on any other share failure.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
