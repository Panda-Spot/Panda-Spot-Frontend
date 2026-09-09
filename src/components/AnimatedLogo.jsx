import { useEffect, useRef, useState } from 'react'
import '../styles/logo-reveal.css'

/**
 * PandaSpot opening logo reveal, built on the real brand asset
 * (`public/pandaspot-logo.svg`).
 *
 * The artwork itself is raster, so the choreography lives in the frame
 * around it — plain HTML + transform/opacity-only CSS (compositor
 * thread, no layout work):
 *   logo rises in → focus brackets converge and lock ("spotted" pulse)
 *   → tiny settle. ~1.7s, then fully static.
 *
 * Two guarantees that matter:
 * - Space is reserved up front (fixed height) so nothing shifts.
 * - The reveal starts only once the image bytes are actually ready
 *   (`lr-ready`), so a slow 2.7MB first load never plays the timeline
 *   on an empty box. A 2.5s fallback starts it anyway if the file
 *   stalls or fails.
 * - Plays on every mount (landing visit). `prefers-reduced-motion`
 *   renders the final state instantly instead.
 * - Hover gives a tiny 150ms lift, nothing more.
 */
export default function AnimatedLogo({ variant = 'full', height = 52, className = '' }) {
  const [ready, setReady] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setReady(true)
      return undefined
    }
    const t = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <span
      className={`animated-logo lr-play${ready ? ' lr-ready' : ''}${className ? ` ${className}` : ''}`}
      style={{ height }}
      role="img"
      aria-label="PandaSpot — Spot yourself. Get your photos."
    >
      <img
        ref={imgRef}
        className="lr-photo"
        src="/pandaspot-logo.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
      />
      <span className="lr-frame" aria-hidden="true">
        <i className="lr-c lr-tl" />
        <i className="lr-c lr-tr" />
        <i className="lr-c lr-bl" />
        <i className="lr-c lr-br" />
      </span>
      <span className="lr-pulse" aria-hidden="true" />
    </span>
  )
}
