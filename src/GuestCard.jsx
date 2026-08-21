import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { fileUrl, getBranding } from './api.js'

const CARD_WIDTH = 1050
const CARD_HEIGHT = 600
const DEFAULT_ACCENT = '#aa3bff'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function GuestCard({ eventName, guestSlug }) {
  const canvasRef = useRef(null)
  const [branding, setBranding] = useState(null)
  const [brandingError, setBrandingError] = useState('')
  const [ready, setReady] = useState(false)

  const guestUrl = `${window.location.origin}/e/${guestSlug}`

  useEffect(() => {
    getBranding()
      .then(setBranding)
      .catch((e) => setBrandingError(e.message))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const accent = branding?.brand_color || DEFAULT_ACCENT

      // Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

      // Accent bar
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, CARD_WIDTH, 16)
      ctx.fillRect(0, CARD_HEIGHT - 16, CARD_WIDTH, 16)

      // Studio name (if set)
      let titleY = 150
      if (branding?.studio_name) {
        ctx.fillStyle = '#6b6375'
        ctx.font = '600 26px system-ui, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(branding.studio_name, 60, 100)
        titleY = 170
      }

      // Event name (prominent)
      ctx.fillStyle = '#08060d'
      ctx.font = '700 52px system-ui, sans-serif'
      ctx.textAlign = 'left'
      wrapText(ctx, eventName || 'Your Event', 60, titleY, 560, 58)

      // Instruction line
      ctx.fillStyle = '#6b6375'
      ctx.font = '400 22px system-ui, sans-serif'
      ctx.fillText('Scan to find your photos', 60, CARD_HEIGHT - 140)

      // QR code
      const qrSize = 340
      const qrX = CARD_WIDTH - qrSize - 60
      const qrY = (CARD_HEIGHT - qrSize) / 2
      try {
        const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: qrSize, margin: 1 })
        const qrImg = await loadImage(qrDataUrl)
        if (cancelled) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
        ctx.strokeStyle = '#e5e4e7'
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
      } catch {
        // QR generation failed — continue without it rather than blocking the card
      }

      // Guest URL text under QR
      ctx.fillStyle = '#6b6375'
      ctx.font = '400 16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(guestUrl, qrX + qrSize / 2, qrY + qrSize + 40)
      ctx.textAlign = 'left'

      // PandaSpot wordmark, small corner credit
      if (branding?.logo_url) {
        try {
          const logoImg = await loadImage(fileUrl(branding.logo_url))
          if (cancelled) return
          const logoH = 50
          const logoW = (logoImg.width / logoImg.height) * logoH
          ctx.drawImage(logoImg, 60, CARD_HEIGHT - 90, logoW, logoH)
        } catch {
          // logo failed to load — skip it
        }
      }
      ctx.fillStyle = '#9a93a3'
      ctx.font = '400 15px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('Powered by PandaSpot', CARD_WIDTH - 60, CARD_HEIGHT - 32)
      ctx.textAlign = 'left'

      if (!cancelled) setReady(true)
    }

    draw()
    return () => {
      cancelled = true
    }
  }, [branding, eventName, guestUrl])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeName = (eventName || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      a.href = url
      a.download = `${safeName}-guest-card.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="guest-card-panel">
      {brandingError && <p className="error">{brandingError}</p>}
      <canvas
        ref={canvasRef}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        className="guest-card-canvas"
      />
      <button className="btn" type="button" onClick={handleDownload} disabled={!ready}>
        Download PNG
      </button>
    </div>
  )
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = word
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, curY)
}
